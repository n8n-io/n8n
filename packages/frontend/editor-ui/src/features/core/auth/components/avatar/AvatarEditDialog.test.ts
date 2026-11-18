import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { AVATAR_BACKGROUNDS, type UserAvatarDescriptor } from '@n8n/design-system';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { AVATAR_EDIT_MODAL_KEY } from '../../auth.constants';
import AvatarEditDialog from './AvatarEditDialog.vue';
import { AVATAR_COLOR_PRESETS, GENERATED_AVATAR_VARIANT } from './avatarGenerator';
import type { DecodedAvatarSource } from './avatarImage';

const toast = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showToast: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

// jsdom cannot decode or draw pictures, so the two steps that need a canvas are
// replaceable per test; everything else in the module is the real thing.
const avatarImage = vi.hoisted(() => ({
	decodeAvatarSource: vi.fn(),
	renderAvatar: vi.fn(),
}));

vi.mock('./avatarImage', async (importOriginal) => {
	const original = await importOriginal<typeof import('./avatarImage')>();
	avatarImage.decodeAvatarSource.mockImplementation(original.decodeAvatarSource);
	avatarImage.renderAvatar.mockImplementation(original.renderAvatar);
	return { ...original, ...avatarImage };
});

const GENERATED = {
	variant: 'beam' as const,
	seed: 'savedseed',
	colors: ['#111111', '#222222', '#333333', '#444444', '#555555'],
	recipe: { hue: 200, tone: 40 },
};

const UPLOAD = { url: '/rest/users/1/avatar/upload?v=1' };
const SSO = { url: '/rest/users/1/avatar/sso?v=1', provider: 'accounts.google.com' };

const renderDialog = createComponentRenderer(AvatarEditDialog);

async function renderOpenDialog({
	avatar = null,
	uploadsEnabled = true,
}: { avatar?: UserAvatarDescriptor | null; uploadsEnabled?: boolean } = {}) {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: { [AVATAR_EDIT_MODAL_KEY]: { open: true } },
				modalStack: [AVATAR_EDIT_MODAL_KEY],
			},
			[STORES.USERS]: {
				currentUserId: '1',
				usersById: {
					'1': {
						id: '1',
						firstName: 'Nathan',
						lastName: 'Doe',
						email: 'nathan@example.com',
						avatar,
					},
				},
			},
		},
	});
	useSettingsStore(pinia).userManagement.avatarUploadsEnabled = uploadsEnabled;
	const usersStore = mockedStore(useUsersStore);

	const result = renderDialog({ pinia });
	await screen.findByRole('dialog');
	return { ...result, usersStore, uiStore: useUIStore(pinia) };
}

const getOrb = (name: string) => screen.getByTestId(`avatar-source-${name}`);
const queryOrb = (name: string) => screen.queryByTestId(`avatar-source-${name}`);
const getSaveButton = () => screen.getByRole('button', { name: 'Save' });

describe('AvatarEditDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Transparency probes fetch the stored pictures; there is no server here.
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in tests')));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('orbs', () => {
		it('offers a generated picture and an upload, and starts on generated, for a user without a picture', async () => {
			await renderOpenDialog();

			expect(getOrb('generated')).toBeChecked();
			expect(getOrb('generated')).toHaveAccessibleName('Generated');
			expect(getOrb('upload')).not.toBeChecked();
			expect(getOrb('upload')).toHaveAttribute('data-face-kind', 'empty');
			expect(queryOrb('sso')).not.toBeInTheDocument();
			expect(screen.getByTestId('avatar-generator-panel')).toBeInTheDocument();
			expect(getSaveButton()).toBeEnabled();
		});

		it("puts the user's initials on the generated orb", async () => {
			await renderOpenDialog();

			expect(getOrb('generated')).toHaveTextContent('ND');
		});

		it('hides the upload orb when uploads are off and nothing was uploaded', async () => {
			await renderOpenDialog({ uploadsEnabled: false });

			expect(queryOrb('upload')).not.toBeInTheDocument();
			expect(getOrb('generated')).toBeChecked();
		});

		it('keeps the upload orb when uploads are off but a picture exists, so it can be removed', async () => {
			await renderOpenDialog({
				uploadsEnabled: false,
				avatar: { source: 'upload', background: 'pink', upload: UPLOAD },
			});

			expect(getOrb('upload')).toBeChecked();
			expect(getOrb('upload')).toHaveAttribute('data-face-kind', 'image');
			expect(screen.getByTestId('avatar-existing-upload')).toHaveTextContent(
				'Uploads are turned off',
			);
			expect(screen.getByTestId('avatar-remove-upload')).toBeInTheDocument();
			expect(screen.queryByTestId('avatar-replace')).not.toBeInTheDocument();
		});

		it('names the identity provider on its orb and starts there when it is shown', async () => {
			await renderOpenDialog({ avatar: { source: 'sso', background: 'gray', sso: SSO } });

			expect(getOrb('sso')).toBeChecked();
			expect(getOrb('sso')).toHaveAccessibleName('From Google');
			expect(screen.getByTestId('avatar-sso-panel')).toHaveTextContent('Synced from Google');
			expect(screen.getByTestId('avatar-sso-panel')).toHaveTextContent(
				'Change it in Google to use a different picture',
			);
			expect(getSaveButton()).toBeEnabled();
		});

		it('falls back to a generic label when the provider is unknown', async () => {
			await renderOpenDialog({
				avatar: { source: 'sso', background: 'gray', sso: { url: SSO.url } },
			});

			expect(getOrb('sso')).toHaveAccessibleName('From sign-in');
			expect(screen.getByTestId('avatar-sso-panel')).toHaveTextContent(
				'Synced from your identity provider',
			);
		});

		it('starts on generated when the generated picture is shown', async () => {
			await renderOpenDialog({
				avatar: { source: 'generated', background: 'pink', generated: GENERATED },
			});

			expect(getOrb('generated')).toBeChecked();
			expect(getSaveButton()).toBeEnabled();
		});

		it('saving with nothing changed just closes, without a request', async () => {
			const { usersStore, uiStore } = await renderOpenDialog({
				avatar: { source: 'generated', background: 'pink', generated: GENERATED },
			});

			await userEvent.click(getSaveButton());

			expect(uiStore.closeModal).toHaveBeenCalledWith(AVATAR_EDIT_MODAL_KEY);
			expect(usersStore.updateCurrentUserAvatar).not.toHaveBeenCalled();
			expect(toast.showMessage).not.toHaveBeenCalled();
		});

		it('shows the drop zone under the upload orb when nothing was uploaded yet', async () => {
			await renderOpenDialog({
				avatar: { source: 'generated', background: 'pink', generated: GENERATED },
			});

			await userEvent.click(getOrb('upload'));

			expect(getOrb('upload')).toBeChecked();
			expect(screen.getByTestId('avatar-dropzone')).toBeInTheDocument();
			expect(screen.queryByTestId('avatar-generator-panel')).not.toBeInTheDocument();
			expect(getSaveButton()).toBeDisabled();
		});
	});

	describe('generating', () => {
		it('restores the saved design', async () => {
			await renderOpenDialog({
				avatar: { source: 'generated', background: 'pink', generated: GENERATED },
			});

			expect(screen.queryByTestId('avatar-variant-picker')).not.toBeInTheDocument();
			expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '200');
			expect(screen.getByRole('slider')).toHaveAttribute(
				'aria-valuetext',
				'Hue 200 degrees, tone 40 percent',
			);
		});

		it('saves a design from a quick pick as the shown picture, always as the orb', async () => {
			const { usersStore, uiStore } = await renderOpenDialog();

			await userEvent.click(screen.getByTestId('avatar-color-preset-sea'));
			await userEvent.click(getSaveButton());

			await waitFor(() => expect(usersStore.updateCurrentUserAvatar).toHaveBeenCalledTimes(1));
			const payload = usersStore.updateCurrentUserAvatar.mock.calls[0][0];
			expect(payload.source).toBe('generated');
			const sea = AVATAR_COLOR_PRESETS.find((preset) => preset.id === 'sea');
			expect(payload.generated).toMatchObject({
				variant: GENERATED_AVATAR_VARIANT,
				recipe: { hue: sea?.hue, tone: sea?.tone },
			});
			expect(payload.generated?.colors).toHaveLength(5);
			for (const color of payload.generated?.colors ?? []) expect(color).toMatch(/^#[0-9a-f]{6}$/);
			expect(payload.generated?.seed).toMatch(/^[a-z0-9]{10}$/);

			expect(toast.showMessage).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'success', title: 'Profile picture updated' }),
			);
			expect(uiStore.closeModal).toHaveBeenCalledWith(AVATAR_EDIT_MODAL_KEY);
		});

		it('moving the color handle with the keyboard changes the recipe', async () => {
			const { usersStore } = await renderOpenDialog({
				avatar: { source: 'generated', background: 'pink', generated: GENERATED },
			});

			screen.getByRole('slider').focus();
			await userEvent.keyboard('{ArrowRight}{ArrowUp}');
			expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '208');

			await userEvent.click(getSaveButton());
			await waitFor(() => expect(usersStore.updateCurrentUserAvatar).toHaveBeenCalled());
			const payload = usersStore.updateCurrentUserAvatar.mock.calls[0][0];
			expect(payload.generated?.recipe).toEqual({ hue: 208, tone: 45 });
			expect(payload.generated?.seed).toBe(GENERATED.seed);
		});

		it('shuffling picks a new seed and keeps the colors', async () => {
			const { usersStore } = await renderOpenDialog({
				avatar: { source: 'generated', background: 'pink', generated: GENERATED },
			});

			await userEvent.click(screen.getByTestId('avatar-shuffle'));
			await userEvent.click(getSaveButton());
			await waitFor(() => expect(usersStore.updateCurrentUserAvatar).toHaveBeenCalled());
			const payload = usersStore.updateCurrentUserAvatar.mock.calls[0][0];
			expect(payload.generated?.seed).not.toBe(GENERATED.seed);
			// A design saved as another drawing comes back as the orb once touched.
			expect(payload.generated?.variant).toBe(GENERATED_AVATAR_VARIANT);
			expect(payload.generated?.recipe).toEqual(GENERATED.recipe);
		});

		it('stays open and reports when saving fails', async () => {
			const { usersStore, uiStore } = await renderOpenDialog();
			usersStore.updateCurrentUserAvatar.mockRejectedValue(new Error('boom'));

			await userEvent.click(getSaveButton());

			await waitFor(() => expect(toast.showError).toHaveBeenCalled());
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});
	});

	describe('uploading', () => {
		it('refuses a GIF with an explanation and keeps the drop zone', async () => {
			await renderOpenDialog();
			await userEvent.click(getOrb('upload'));

			const gif = new File([new Uint8Array(8)], 'party.gif', { type: 'image/gif' });
			// The input's `accept` is only a hint; drag-and-drop bypasses it, so the code must too.
			await userEvent.upload(screen.getByTestId('avatar-file-input'), gif, { applyAccept: false });

			await waitFor(() =>
				expect(toast.showMessage).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'error',
						message: expect.stringContaining('GIFs and animated pictures'),
					}),
				),
			);
			expect(screen.getByTestId('avatar-dropzone')).toBeInTheDocument();
			expect(getOrb('upload')).toHaveAttribute('data-face-kind', 'empty');
			expect(getSaveButton()).toBeDisabled();
		});

		const decoded = (hasTransparency: boolean): DecodedAvatarSource => ({
			bitmap: {} as ImageBitmap,
			width: 400,
			height: 300,
			hasTransparency,
			previewUrl: 'blob:preview',
			revoke: vi.fn(),
		});

		const pickPicture = async (hasTransparency: boolean) => {
			avatarImage.decodeAvatarSource.mockResolvedValueOnce(decoded(hasTransparency));
			avatarImage.renderAvatar.mockResolvedValueOnce({
				blob: new Blob(['x'], { type: 'image/webp' }),
				fileName: 'avatar.webp',
			});
			const file = new File([new Uint8Array(8)], 'me.png', { type: 'image/png' });
			await userEvent.upload(screen.getByTestId('avatar-file-input'), file);
			await screen.findByTestId('avatar-crop-frame');
		};

		it('deals a see-through picture a backdrop, with no control to pick one', async () => {
			const { usersStore } = await renderOpenDialog();
			await userEvent.click(getOrb('upload'));
			await pickPicture(true);

			expect(getOrb('upload')).toHaveAttribute('data-face-kind', 'crop');
			expect(screen.queryByText('Backdrop')).not.toBeInTheDocument();
			await userEvent.click(getSaveButton());

			await waitFor(() => expect(usersStore.uploadCurrentUserAvatar).toHaveBeenCalled());
			const [, options] = usersStore.uploadCurrentUserAvatar.mock.calls[0];
			expect(AVATAR_BACKGROUNDS).toContain(options?.background);
		});

		it('frames a picture dropped onto an existing upload, to replace it', async () => {
			await renderOpenDialog({ avatar: { source: 'upload', background: 'pink', upload: UPLOAD } });
			avatarImage.decodeAvatarSource.mockResolvedValueOnce(decoded(false));
			const file = new File([new Uint8Array(8)], 'me.png', { type: 'image/png' });

			await fireEvent.drop(screen.getByTestId('avatar-existing-upload'), {
				dataTransfer: { files: [file] },
			});

			expect(await screen.findByTestId('avatar-crop-frame')).toBeInTheDocument();
			expect(getOrb('upload')).toHaveAttribute('data-face-kind', 'crop');
		});

		it('labels the zoom and reads it out as a percentage', async () => {
			await renderOpenDialog();
			await userEvent.click(getOrb('upload'));
			await pickPicture(false);

			expect(screen.getByRole('slider', { name: 'Zoom' })).toHaveAttribute(
				'aria-valuetext',
				'100%',
			);
		});

		it('sends no backdrop for an opaque picture', async () => {
			const { usersStore } = await renderOpenDialog();
			await userEvent.click(getOrb('upload'));
			await pickPicture(false);
			await userEvent.click(getSaveButton());

			await waitFor(() => expect(usersStore.uploadCurrentUserAvatar).toHaveBeenCalled());
			const [, options] = usersStore.uploadCurrentUserAvatar.mock.calls[0];
			expect(options?.background).toBeUndefined();
		});

		it('removes the uploaded picture on save, and shows a generated one instead', async () => {
			const { usersStore } = await renderOpenDialog({
				avatar: { source: 'upload', background: 'pink', upload: UPLOAD },
			});

			await userEvent.click(screen.getByTestId('avatar-remove-upload'));

			// Nothing has left the server yet; the dialog only shows what saving will do.
			expect(usersStore.deleteCurrentUserAvatar).not.toHaveBeenCalled();
			expect(getOrb('upload')).toHaveAttribute('data-face-kind', 'empty');
			expect(getOrb('generated')).toBeChecked();

			await userEvent.click(getSaveButton());

			await waitFor(() =>
				expect(usersStore.updateCurrentUserAvatar).toHaveBeenCalledWith(
					expect.objectContaining({ source: 'generated' }),
				),
			);
			expect(usersStore.deleteCurrentUserAvatar).toHaveBeenCalledWith('upload');
			expect(usersStore.deleteCurrentUserAvatar.mock.invocationCallOrder[0]).toBeLessThan(
				usersStore.updateCurrentUserAvatar.mock.invocationCallOrder[0],
			);
		});

		it('keeps the uploaded picture when a removal is cancelled', async () => {
			const { usersStore, uiStore } = await renderOpenDialog({
				avatar: { source: 'upload', background: 'pink', upload: UPLOAD },
			});

			await userEvent.click(screen.getByTestId('avatar-remove-upload'));
			await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

			expect(uiStore.closeModal).toHaveBeenCalledWith(AVATAR_EDIT_MODAL_KEY);
			expect(usersStore.deleteCurrentUserAvatar).not.toHaveBeenCalled();
			expect(usersStore.updateCurrentUserAvatar).not.toHaveBeenCalled();
		});

		it('falls back to the identity provider picture when the upload is removed', async () => {
			const { usersStore } = await renderOpenDialog({
				avatar: { source: 'upload', background: 'pink', upload: UPLOAD, sso: SSO },
			});

			await userEvent.click(screen.getByTestId('avatar-remove-upload'));
			expect(getOrb('sso')).toBeChecked();
			await userEvent.click(getSaveButton());

			await waitFor(() =>
				expect(usersStore.updateCurrentUserAvatar).toHaveBeenCalledWith({ source: 'sso' }),
			);
			expect(usersStore.deleteCurrentUserAvatar).toHaveBeenCalledWith('upload');
		});

		it('drops the upload orb once its picture is removed and uploads are off', async () => {
			await renderOpenDialog({
				uploadsEnabled: false,
				avatar: { source: 'upload', background: 'pink', upload: UPLOAD },
			});

			await userEvent.click(screen.getByTestId('avatar-remove-upload'));

			await waitFor(() => expect(queryOrb('upload')).not.toBeInTheDocument());
			expect(getOrb('generated')).toBeChecked();
		});

		it('skips the removal when a new picture replaces the removed one', async () => {
			const { usersStore } = await renderOpenDialog({
				avatar: { source: 'upload', background: 'pink', upload: UPLOAD },
			});

			await userEvent.click(screen.getByTestId('avatar-remove-upload'));
			await userEvent.click(getOrb('upload'));
			await pickPicture(false);
			await userEvent.click(getSaveButton());

			await waitFor(() => expect(usersStore.uploadCurrentUserAvatar).toHaveBeenCalled());
			expect(usersStore.deleteCurrentUserAvatar).not.toHaveBeenCalled();
		});

		it('switches back to an existing upload from another picture', async () => {
			const { usersStore } = await renderOpenDialog({
				avatar: { source: 'generated', background: 'pink', upload: UPLOAD, generated: GENERATED },
			});

			await userEvent.click(getOrb('upload'));
			expect(getOrb('upload')).toHaveAttribute('data-face-kind', 'image');
			expect(screen.getByTestId('avatar-existing-upload')).toBeInTheDocument();
			expect(screen.getByTestId('avatar-replace')).toBeInTheDocument();
			await userEvent.click(getSaveButton());

			await waitFor(() =>
				expect(usersStore.updateCurrentUserAvatar).toHaveBeenCalledWith({ source: 'upload' }),
			);
		});
	});

	describe('identity provider picture', () => {
		it('switches to it', async () => {
			const { usersStore } = await renderOpenDialog({
				avatar: { source: 'generated', background: 'pink', sso: SSO, generated: GENERATED },
			});

			await userEvent.click(getOrb('sso'));
			expect(screen.getByTestId('avatar-sso-panel')).toBeInTheDocument();
			await userEvent.click(getSaveButton());

			await waitFor(() =>
				expect(usersStore.updateCurrentUserAvatar).toHaveBeenCalledWith({ source: 'sso' }),
			);
		});
	});

	it('closes without saving on cancel', async () => {
		const { usersStore, uiStore } = await renderOpenDialog();

		await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

		expect(uiStore.closeModal).toHaveBeenCalledWith(AVATAR_EDIT_MODAL_KEY);
		expect(usersStore.updateCurrentUserAvatar).not.toHaveBeenCalled();
		expect(usersStore.uploadCurrentUserAvatar).not.toHaveBeenCalled();
	});
});
