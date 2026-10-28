import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import type * as PromotionsApi from '../promotionsSettings.api';
import type { PromotionEnvironmentSummary, PromotionProvider } from '../promotionsSettings.api';
import PromotionProviderDialog from './PromotionProviderDialog.vue';

const api = vi.hoisted(() => ({
	fetchPromotionProvider: vi.fn<typeof PromotionsApi.fetchPromotionProvider>(),
	fetchPromotionEnvironments: vi.fn<typeof PromotionsApi.fetchPromotionEnvironments>(),
	createPromotionProvider: vi.fn<typeof PromotionsApi.createPromotionProvider>(),
	updatePromotionProvider: vi.fn<typeof PromotionsApi.updatePromotionProvider>(),
}));

vi.mock('../promotionsSettings.api', () => api);

const mockShowError = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: vi.fn() }),
}));

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const sshProvider = (overrides: Partial<PromotionProvider> = {}): PromotionProvider =>
	({
		id: 'provider-ssh',
		name: 'Production key',
		type: 'git',
		authType: 'ssh-key',
		config: { schemaVersion: 1, publicKey: 'ssh-ed25519 STORED-KEY', keyType: 'ed25519' },
		...timestamps,
		...overrides,
	}) as PromotionProvider;

const gitlabProvider = () =>
	sshProvider({
		id: 'provider-gitlab',
		name: 'GitLab',
		type: 'gitlab',
		authType: 'token',
		config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
	});

const renderDialog = createComponentRenderer(PromotionProviderDialog);

const renderAddDialog = async (type: PromotionProvider['type']) => {
	const rendered = renderDialog({ props: { open: true, type } });
	await screen.findByTestId('promotion-provider-form-step');
	return rendered;
};

const renderEditDialog = async (provider: PromotionProvider) => {
	api.fetchPromotionProvider.mockResolvedValue(provider);
	const rendered = renderDialog({ props: { open: true, providerId: provider.id } });
	await screen.findByDisplayValue(provider.name);
	return rendered;
};

// Select options stay inside the dialog.
const selectInDialog = async (select: HTMLElement, label: string) => {
	await userEvent.click(within(select).getByRole('combobox'));
	await userEvent.click(await within(select).findByText(label));
};

const fill = async (fields: Record<string, string | undefined>) => {
	for (const [field, value] of Object.entries(fields)) {
		if (value === undefined) continue;
		const input = screen.getByTestId(`promotion-provider-${field}-input`);
		await userEvent.clear(input);
		await userEvent.type(input, value);
	}
};

const saveButton = () => screen.getByTestId('promotion-provider-save-button');

describe('PromotionProviderDialog', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
		api.fetchPromotionEnvironments.mockResolvedValue([]);
	});

	it('requires a token for a new GitLab provider and keeps the dialog open to retry a failed save', async () => {
		api.createPromotionProvider
			.mockRejectedValueOnce(new Error('GitLab authentication failed.'))
			.mockResolvedValue({ provider: gitlabProvider(), publicKey: null });
		const { emitted } = await renderAddDialog('gitlab');

		expect(screen.queryByTestId('promotion-provider-auth-type-select')).not.toBeInTheDocument();
		expect(screen.queryByTestId('promotion-provider-username-input')).not.toBeInTheDocument();
		await fill({ name: 'GitLab', 'base-url': 'https://gitlab.example.com/gitlab' });
		expect(saveButton()).toBeDisabled();
		await fill({ password: 'test-token' });
		await userEvent.click(saveButton());
		expect(await screen.findByRole('alert')).toHaveTextContent('GitLab authentication failed.');
		expect(screen.getByTestId('promotion-provider-password-input')).toHaveValue('test-token');
		expect(mockShowError).not.toHaveBeenCalled();

		await userEvent.click(saveButton());

		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
		expect(api.createPromotionProvider).toHaveBeenLastCalledWith(expect.anything(), {
			name: 'GitLab',
			type: 'gitlab',
			config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com/gitlab' },
			auth: { authType: 'token', password: 'test-token' },
		});
	});

	it('renames a GitLab provider without changing its token or equivalent URL', async () => {
		api.updatePromotionProvider.mockResolvedValue(gitlabProvider());
		const { emitted } = await renderEditDialog(gitlabProvider());

		await fill({ name: 'GitLab renamed', 'base-url': 'https://GITLAB.example.com:443/' });
		await userEvent.click(saveButton());

		await waitFor(() =>
			expect(emitted('saved')).toEqual([
				[{ id: 'provider-gitlab', hostChanged: false, credentialsChanged: false }],
			]),
		);
		expect(api.updatePromotionProvider).toHaveBeenCalledWith(expect.anything(), 'provider-gitlab', {
			name: 'GitLab renamed',
		});
	});

	it('requires a new token for a host edit and clears failed validation after editing', async () => {
		api.updatePromotionProvider
			.mockRejectedValueOnce(new Error('GitLab authentication failed.'))
			.mockResolvedValue(gitlabProvider());
		await renderEditDialog(gitlabProvider());

		await fill({ 'base-url': 'https://gitlab.example.com/gitlab' });
		expect(saveButton()).toBeDisabled();
		await fill({ password: 'expired-token' });
		await userEvent.click(saveButton());
		expect(await screen.findByTestId('promotion-provider-save-error')).toHaveTextContent(
			'GitLab authentication failed.',
		);
		await fill({ password: 'replacement-token' });
		expect(screen.queryByTestId('promotion-provider-save-error')).not.toBeInTheDocument();
		await userEvent.click(saveButton());

		await waitFor(() =>
			expect(api.updatePromotionProvider).toHaveBeenLastCalledWith(
				expect.anything(),
				'provider-gitlab',
				{
					config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com/gitlab' },
					auth: { authType: 'token', password: 'replacement-token' },
				},
			),
		);
	});

	it('adds an SSH provider and shows its deploy key', async () => {
		api.createPromotionProvider.mockResolvedValue({
			provider: sshProvider(),
			publicKey: 'ssh-ed25519 NEW-KEY',
		});
		await renderAddDialog('git');

		await userEvent.type(screen.getByTestId('promotion-provider-name-input'), 'Production key');
		await userEvent.click(saveButton());

		const keyStep = await screen.findByTestId('promotion-provider-key-step');
		expect(within(keyStep).getByDisplayValue('ssh-ed25519 NEW-KEY')).toBeInTheDocument();
		expect(api.createPromotionProvider).toHaveBeenCalledWith(expect.anything(), {
			name: 'Production key',
			type: 'git',
			auth: { authType: 'ssh-key', keyType: 'ed25519' },
		});
	});

	it('requires a username and password before saving a token provider', async () => {
		api.createPromotionProvider.mockResolvedValue({
			provider: sshProvider({ name: 'Mirror', authType: 'token', config: { schemaVersion: 1 } }),
			publicKey: null,
		});
		await renderAddDialog('git');

		await userEvent.type(screen.getByTestId('promotion-provider-name-input'), 'Mirror');
		await selectInDialog(
			screen.getByTestId('promotion-provider-auth-type-select'),
			'Username and password',
		);
		await userEvent.type(screen.getByTestId('promotion-provider-username-input'), 'deploy');
		expect(saveButton()).toBeDisabled();
		await userEvent.type(screen.getByTestId('promotion-provider-password-input'), 'secret');
		await userEvent.click(saveButton());

		await waitFor(() =>
			expect(api.createPromotionProvider).toHaveBeenCalledWith(expect.anything(), {
				name: 'Mirror',
				type: 'git',
				auth: { authType: 'token', username: 'deploy', password: 'secret' },
			}),
		);
	});

	it('shows the stored key and the environments that use the provider', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([
			{ name: 'Production' } as PromotionEnvironmentSummary,
		]);
		await renderEditDialog(sshProvider());

		expect(await screen.findByDisplayValue('ssh-ed25519 STORED-KEY')).toBeInTheDocument();
		expect(screen.getByTestId('promotion-provider-in-use')).toHaveTextContent('Production');
	});

	it('shows the new deploy key after regeneration', async () => {
		api.updatePromotionProvider.mockResolvedValue(
			sshProvider({
				config: { schemaVersion: 1, publicKey: 'ssh-ed25519 ROTATED-KEY', keyType: 'ed25519' },
			}),
		);
		await renderEditDialog(sshProvider());

		await userEvent.click(screen.getByTestId('promotion-provider-regenerate-key'));
		await userEvent.click(saveButton());

		const keyStep = await screen.findByTestId('promotion-provider-key-step');
		expect(within(keyStep).getByDisplayValue('ssh-ed25519 ROTATED-KEY')).toBeInTheDocument();
	});
});
