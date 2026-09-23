import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { useUsersStore } from '@n8n/stores/users.store';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';

import { TELEMETRY_EVENT } from '@n8n/telemetry';

import PreferenceModal from './PreferenceModal.vue';
import { PREFERENCE_TEXT_MAX_LENGTH } from '../context.constants';

import { useContextStore } from '../context.store';
import type { Preference } from '../context.types';
import type { IUser } from '@n8n/rest-api-client/api/users';
import type { Scope } from '@n8n/permissions';

const trackMock = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

// N8nDialog teleports out of the tree (Reka UI's DialogPortal), so replace it
// with a render-inline pass-through that keeps the open state and the header.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		props: ['open', 'size', 'header'],
		emits: ['update:open'],
		template: `
			<div v-if="open" role="dialog" data-test-id="preference-modal">
				<h2>{{ header }}</h2>
				<slot />
			</div>
		`,
	};
	return { ...actual, N8nDialog };
});

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

const initialState = {
	[STORES.PROJECTS]: {
		personalProject: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal' },
		myProjects: [
			// The owner of a personal project holds every `projectAiPreference` scope on it.
			{
				id: 'personal-1',
				name: 'Me <me@n8n.io>',
				type: 'personal',
				scopes: ['projectAiPreference:create'],
			},
			// Project admins and editors both hold `projectAiPreference:create`.
			{
				id: 'p-write',
				name: 'Writable Project',
				type: 'team',
				scopes: ['projectAiPreference:create'],
			},
			{
				id: 'p-read',
				name: 'Read Only Project',
				type: 'team',
				scopes: ['projectAiPreference:read'],
			},
		],
	},
};

/** The instance scope is gated on the global `aiPreference:create` scope. */
function currentUser(globalScopes: Scope[]) {
	return mock<IUser>({ id: 'user-1', globalScopes });
}
const renderModal = createComponentRenderer(PreferenceModal);

let pinia: ReturnType<typeof createTestingPinia>;
let contextStore: MockedStore<typeof useContextStore>;
let usersStore: MockedStore<typeof useUsersStore>;

function scopeOptions() {
	return Array.from(document.querySelectorAll('li.el-select-dropdown__item'));
}

function findOption(label: string) {
	return scopeOptions().find((li) => li.textContent?.includes(label));
}

describe('PreferenceModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({ initialState });
		contextStore = mockedStore(useContextStore);
		usersStore = mockedStore(useUsersStore);
		usersStore.currentUser = currentUser([]);
		trackMock.mockReset();
	});

	describe('scope options', () => {
		it('always offers the user scope, which follows the user into every project', () => {
			renderModal({ props: { open: true, preference: null }, pinia });

			expect(findOption('Just you · All projects')).toBeDefined();
		});

		it('offers the personal project next to it, for preferences that apply only there', () => {
			renderModal({ props: { open: true, preference: null }, pinia });

			expect(findOption('Just you · Personal project')).toBeDefined();
		});

		it('hides "Everyone" from a user who is not an instance owner or admin', () => {
			usersStore.currentUser = currentUser([]);

			renderModal({ props: { open: true, preference: null }, pinia });

			expect(findOption('Everyone')).toBeUndefined();
		});

		it('offers "Everyone" to an instance owner or admin', () => {
			usersStore.currentUser = currentUser(['aiPreference:create']);

			renderModal({ props: { open: true, preference: null }, pinia });

			expect(findOption('Everyone')).toBeDefined();
		});

		it('offers only the projects the user may write', () => {
			renderModal({ props: { open: true, preference: null }, pinia });

			expect(findOption('Writable Project')).toBeDefined();
			expect(findOption('Read Only Project')).toBeUndefined();
		});

		it('keeps the current scope selectable when editing, even without the create right there', () => {
			// Staying put needs only the update right the Edit button already checked.
			const preference: Preference = {
				id: 'p1',
				content: 'Use sub-workflows.',
				userId: null,
				user: null,
				projectId: 'p-read',
				project: { id: 'p-read', name: 'Read Only Project', type: 'team', icon: null },
				source: 'ui',
				scopes: ['aiPreference:read', 'aiPreference:update'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			renderModal({ props: { open: true, preference }, pinia });

			expect(findOption('Read Only Project')).toBeDefined();
		});

		it('locks the scope when the row may be edited but not deleted, because a move deletes it', () => {
			const preference: Preference = {
				id: 'p1',
				content: 'Use sub-workflows.',
				userId: null,
				user: null,
				projectId: 'p-write',
				project: { id: 'p-write', name: 'Writable Project', type: 'team', icon: null },
				source: 'ui',
				scopes: ['aiPreference:read', 'aiPreference:update'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			renderModal({ props: { open: true, preference }, pinia });

			// The row stays where it is; the content is still editable.
			expect(scopeOptions()).toHaveLength(1);
			expect(findOption('Writable Project')).toBeDefined();
		});

		it("adds another user's row as its own option, so an admin can edit it in place", () => {
			usersStore.currentUser = currentUser(['aiPreference:create', 'aiPreference:update']);
			const preference: Preference = {
				id: 'p1',
				content: 'Theirs.',
				userId: 'user-2',
				user: { id: 'user-2', email: 'jane@acme.com', firstName: 'Jane', lastName: 'Doe' },
				projectId: null,
				project: null,
				source: 'ui',
				scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			renderModal({ props: { open: true, preference }, pinia });

			expect(findOption('Jane Doe · All projects')).toBeDefined();
		});
	});

	describe('validation', () => {
		it('keeps Save disabled while the text is empty', () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			expect(getByTestId('preference-modal-save-button')).toBeDisabled();
		});

		it('enables Save once the text is filled', async () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);

			expect(getByTestId('preference-modal-save-button')).toBeEnabled();
		});

		it('keeps Save disabled for whitespace-only text', async () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'   ',
			);

			// The prompt renderer drops a blank preference, so it must not be saveable.
			expect(getByTestId('preference-modal-save-button')).toBeDisabled();
		});

		it('trims the text it sends', async () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'  Keep replies short.  ',
			);
			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(contextStore.createPreference).toHaveBeenCalledWith({
				content: 'Keep replies short.',
				scope: 'user',
				projectId: null,
			});
		});

		it('caps the text at the injection budget', () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			const textarea = getByTestId('preference-modal-text-input').querySelector('textarea');
			expect(textarea).toHaveAttribute('maxlength', String(PREFERENCE_TEXT_MAX_LENGTH));
		});

		it('counts the characters against the cap', async () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);

			expect(getByTestId('preference-modal-counter')).toHaveTextContent(
				`${'Keep replies short.'.length} / ${PREFERENCE_TEXT_MAX_LENGTH}`,
			);
		});
	});

	describe('submitting', () => {
		it('creates a user-scoped preference by default', async () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);
			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(contextStore.createPreference).toHaveBeenCalledWith({
				content: 'Keep replies short.',
				scope: 'user',
				projectId: null,
			});
		});

		it('reports a created preference without its text', async () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);
			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_CREATED_PREFERENCE, {
				scope_type: 'user',
				text_length: 'Keep replies short.'.length,
			});
		});

		const pendingSaveResult: Preference = {
			id: 'p9',
			content: 'Keep replies short.',
			userId: 'user-1',
			user: null,
			projectId: null,
			project: null,
			source: 'ui',
			scopes: [],
			createdAt: '2026-09-08T00:00:00.000Z',
			updatedAt: '2026-09-08T00:00:00.000Z',
		};

		it('does not close a dialog that was reopened during a slow save', async () => {
			let settle: (value: Preference) => void = () => {};
			contextStore.createPreference.mockReturnValue(
				new Promise<Preference>((resolve) => {
					settle = resolve;
				}),
			);

			const { getByTestId, rerender, emitted } = renderModal({
				props: { open: true, preference: null },
				pinia,
			});
			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);
			await userEvent.click(getByTestId('preference-modal-save-button'));

			// The page closed and reopened the dialog while the save was in flight, so
			// the late completion must not report as the new dialog's save.
			await rerender({ open: false, preference: null });
			await rerender({ open: true, preference: null });
			settle(pendingSaveResult);
			await new Promise(process.nextTick);

			expect(emitted('saved')).toBeUndefined();
		});

		it('reports the save to the page, which closes the dialog and reloads', async () => {
			const { getByTestId, emitted } = renderModal({
				props: { open: true, preference: null },
				pinia,
			});

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Keep replies short.',
			);
			await userEvent.click(getByTestId('preference-modal-save-button'));
			await new Promise(process.nextTick);

			expect(emitted('saved')).toHaveLength(1);
		});

		it('keeps the project scope when editing a project preference', async () => {
			const preference: Preference = {
				id: 'p1',
				content: 'Use sub-workflows.',
				userId: null,
				user: null,
				projectId: 'p-write',
				project: { id: 'p-write', name: 'Writable Project', type: 'team', icon: null },
				source: 'ui',
				scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			const { getByTestId } = renderModal({
				props: { open: true, preference },
				pinia,
			});

			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(contextStore.updatePreference).toHaveBeenCalledWith('p1', {
				content: 'Use sub-workflows.',
				scope: 'project',
				projectId: 'p-write',
			});
		});

		it('names the caller as the owner when editing their own user-scoped row', async () => {
			// The server refuses a user-scope edit without an owner, so the id always travels.
			const preference: Preference = {
				id: 'p1',
				content: 'Mine.',
				userId: 'user-1',
				user: { id: 'user-1', email: 'me@n8n.io', firstName: 'Me', lastName: null },
				projectId: null,
				project: null,
				source: 'ui',
				scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			const { getByTestId } = renderModal({ props: { open: true, preference }, pinia });

			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(contextStore.updatePreference).toHaveBeenCalledWith('p1', {
				content: 'Mine.',
				scope: 'user',
				projectId: null,
				userId: 'user-1',
			});
		});

		it('names the caller as the owner when moving a project row back to themselves', async () => {
			const preference: Preference = {
				id: 'p1',
				content: 'Use sub-workflows.',
				userId: null,
				user: null,
				projectId: 'p-write',
				project: { id: 'p-write', name: 'Writable Project', type: 'team', icon: null },
				source: 'ui',
				scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			const { getByTestId } = renderModal({ props: { open: true, preference }, pinia });

			await userEvent.click(findOption('Just you · All projects')!);
			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(contextStore.updatePreference).toHaveBeenCalledWith('p1', {
				content: 'Use sub-workflows.',
				scope: 'user',
				projectId: null,
				userId: 'user-1',
			});
		});

		it("sends the owner back when editing another user's preference", async () => {
			usersStore.currentUser = currentUser(['aiPreference:create', 'aiPreference:update']);
			const preference: Preference = {
				id: 'p1',
				content: 'Theirs.',
				userId: 'user-2',
				user: { id: 'user-2', email: 'jane@acme.com', firstName: 'Jane', lastName: 'Doe' },
				projectId: null,
				project: null,
				source: 'ui',
				scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			const { getByTestId } = renderModal({
				props: { open: true, preference },
				pinia,
			});

			await userEvent.click(getByTestId('preference-modal-save-button'));

			// Without the owner the server would hand the row to the admin.
			expect(contextStore.updatePreference).toHaveBeenCalledWith('p1', {
				content: 'Theirs.',
				scope: 'user',
				projectId: null,
				userId: 'user-2',
			});
		});

		it('creates a preference for the personal project when that scope is picked', async () => {
			const { getByTestId } = renderModal({ props: { open: true, preference: null }, pinia });

			await userEvent.type(
				getByTestId('preference-modal-text-input').querySelector('textarea')!,
				'Only here.',
			);
			await userEvent.click(findOption('Just you · Personal project')!);
			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(contextStore.createPreference).toHaveBeenCalledWith({
				content: 'Only here.',
				scope: 'project',
				projectId: 'personal-1',
			});
		});

		it('reports an unchanged scope as scope_changed false', async () => {
			const preference: Preference = {
				id: 'p1',
				content: 'Use sub-workflows.',
				userId: null,
				user: null,
				projectId: 'p-write',
				project: { id: 'p-write', name: 'Writable Project', type: 'team', icon: null },
				source: 'ui',
				scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
				createdAt: '2026-09-08T00:00:00.000Z',
				updatedAt: '2026-09-08T00:00:00.000Z',
			};

			const { getByTestId } = renderModal({
				props: { open: true, preference },
				pinia,
			});

			await userEvent.click(getByTestId('preference-modal-save-button'));

			expect(trackMock).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
				scope_type: 'project',
				text_length: 'Use sub-workflows.'.length,
				scope_changed: false,
				project_id: 'p-write',
			});
		});
	});
});
