import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems } from '@/__tests__/utils';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import type * as PromotionsApi from '../promotionsSettings.api';
import type { PromotionConnection, PromotionProvider } from '../promotionsSettings.api';
import PromotionsSettingsView from './PromotionsSettingsView.vue';

const api = vi.hoisted(() => ({
	fetchPromotionProviders: vi.fn<typeof PromotionsApi.fetchPromotionProviders>(),
	fetchPromotionRepositories: vi.fn<typeof PromotionsApi.fetchPromotionRepositories>(),
	fetchPromotionBranches: vi.fn<typeof PromotionsApi.fetchPromotionBranches>(),
	fetchPromotionProvider: vi.fn<typeof PromotionsApi.fetchPromotionProvider>(),
	createPromotionProvider: vi.fn<typeof PromotionsApi.createPromotionProvider>(),
	updatePromotionProvider: vi.fn<typeof PromotionsApi.updatePromotionProvider>(),
	deletePromotionProvider: vi.fn<typeof PromotionsApi.deletePromotionProvider>(),
	fetchPromotionConnection: vi.fn<typeof PromotionsApi.fetchPromotionConnection>(),
	fetchPromotionConnections: vi.fn<typeof PromotionsApi.fetchPromotionConnections>(),
	createPromotionConnection: vi.fn<typeof PromotionsApi.createPromotionConnection>(),
	updatePromotionConnection: vi.fn<typeof PromotionsApi.updatePromotionConnection>(),
	upsertPromotionApplyConfig: vi.fn<typeof PromotionsApi.upsertPromotionApplyConfig>(),
	upsertPromotionPromoteConfig: vi.fn<typeof PromotionsApi.upsertPromotionPromoteConfig>(),
	deletePromotionConfig: vi.fn<typeof PromotionsApi.deletePromotionConfig>(),
}));

vi.mock('../promotionsSettings.api', () => api);

const mockConfirm = vi.fn();
const mockShowError = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
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

const summaryOf = (provider: PromotionProvider) => {
	const { config: _config, ...summary } = provider;
	return summary;
};

const instanceConnection = (overrides: Partial<PromotionConnection> = {}): PromotionConnection =>
	({
		id: 'connection-1',
		name: 'Production',
		scope: 'instance',
		target: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
		provider: summaryOf(sshProvider()),
		configs: {},
		...timestamps,
		...overrides,
	}) as PromotionConnection;

const applyConfig = (branchName: string, name = 'Apply') => ({
	id: 'config-apply',
	name,
	settings: { schemaVersion: 1 as const, branchName },
	checkout: { hasCheckout: false, matchesConfig: false },
	...timestamps,
});

const promoteConfig = (baseBranchName: string, createBranchOnPromotion = false) => ({
	id: 'config-promote',
	name: 'Promote',
	settings: { schemaVersion: 1 as const, baseBranchName, createBranchOnPromotion },
	checkout: { hasCheckout: false, matchesConfig: false },
	...timestamps,
});

const gitlabRepository = {
	id: '42',
	name: 'Workflows',
	fullPath: 'team/workflows',
	remoteUrl: 'https://gitlab.example.com/team/workflows.git',
	defaultBranch: 'main',
};

const gitlabSummary = () =>
	summaryOf(
		sshProvider({
			id: 'provider-gitlab',
			name: 'GitLab',
			type: 'gitlab',
			authType: 'token',
			config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
		}),
	);

const renderView = createComponentRenderer(PromotionsSettingsView);

const renderReadyView = async () => {
	renderView();
	await screen.findByTestId('promotion-connection-form');
};

const openProviderDialog = async (row?: HTMLElement) => {
	await userEvent.click(row ?? screen.getByTestId('promotion-providers-add'));
	return await screen.findByTestId('promotion-provider-form-step');
};

// Select options stay inside the dialog.
const selectInDialog = async (select: HTMLElement, label: string) => {
	await userEvent.click(within(select).getByRole('combobox'));
	await userEvent.click(await within(select).findByText(label));
};

const selectedValue = (testId: string) => within(screen.getByTestId(testId)).getByRole('combobox');

const selectProvider = async (name: string) => {
	const items = await getDropdownItems(screen.getByTestId('promotion-connection-provider-select'));
	const option = Array.from(items).find((item) => item.textContent?.includes(name));
	await userEvent.click(option as Element);
};

const fillConnectionBasics = async (name: string, remoteUrl: string) => {
	await userEvent.type(screen.getByTestId('promotion-connection-name-input'), name);
	await userEvent.type(screen.getByTestId('promotion-connection-remote-url-input'), remoteUrl);
};

const save = async () => {
	const bar = screen.getByTestId('promotion-connection-save-bar');
	await userEvent.click(within(bar).getByRole('button', { name: /save settings|retry/i }));
};

describe('PromotionsSettingsView', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
		api.fetchPromotionProviders.mockResolvedValue([]);
		api.fetchPromotionProvider.mockResolvedValue(sshProvider());
		api.fetchPromotionConnection.mockResolvedValue(instanceConnection());
		api.fetchPromotionConnections.mockResolvedValue([]);
		api.deletePromotionProvider.mockResolvedValue(undefined);
		api.deletePromotionConfig.mockResolvedValue(undefined);
		api.fetchPromotionRepositories.mockResolvedValue({
			data: [gitlabRepository],
			nextCursor: null,
		});
		api.fetchPromotionBranches.mockResolvedValue({
			data: [
				{ name: 'main', isDefault: true },
				{ name: 'release/test', isDefault: false },
			],
			nextCursor: null,
		});
	});

	it('creates a GitLab connection from repository and branch lists with branching required', async () => {
		api.fetchPromotionProviders.mockResolvedValue([gitlabSummary()]);
		const saved = instanceConnection({
			provider: gitlabSummary(),
			target: { schemaVersion: 1, remoteUrl: gitlabRepository.remoteUrl },
			configs: { apply: applyConfig('main'), promote: promoteConfig('release/test', true) },
		});
		api.createPromotionConnection.mockResolvedValue(saved);
		await renderReadyView();
		await selectProvider('GitLab');
		expect(screen.queryByTestId('promotion-connection-remote-url-input')).not.toBeInTheDocument();
		await userEvent.type(screen.getByTestId('promotion-connection-name-input'), 'Production');
		const repoSelect = screen.getByTestId('promotion-connection-repository-select');
		await selectInDialog(repoSelect, 'team/workflows');
		await userEvent.click(screen.getByTestId('promotion-connection-apply-toggle'));
		await selectInDialog(screen.getByTestId('promotion-connection-apply-branch-select'), 'main');
		await userEvent.click(screen.getByTestId('promotion-connection-promote-toggle'));
		await selectInDialog(
			screen.getByTestId('promotion-connection-promote-branch-select'),
			'release/test',
		);
		await userEvent.click(screen.getByTestId('promotion-connection-create-branch-toggle'));
		await save();
		await waitFor(() =>
			expect(api.createPromotionConnection).toHaveBeenCalledWith(expect.anything(), {
				name: 'Production',
				scope: 'instance',
				providerId: 'provider-gitlab',
				target: { schemaVersion: 1, remoteUrl: gitlabRepository.remoteUrl },
				configs: {
					apply: { settings: { schemaVersion: 1, branchName: 'main' } },
					promote: {
						settings: {
							schemaVersion: 1,
							baseBranchName: 'release/test',
							createBranchOnPromotion: true,
						},
					},
				},
			}),
		);
		expect(api.fetchPromotionBranches).toHaveBeenCalledWith(
			expect.anything(),
			'provider-gitlab',
			'42',
			expect.anything(),
		);
	});

	it('selects a newly created GitLab provider without losing the connection draft', async () => {
		const created = sshProvider({
			...gitlabSummary(),
			config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
		});
		api.createPromotionProvider.mockResolvedValue({ provider: created, publicKey: null });
		api.fetchPromotionProviders.mockResolvedValueOnce([]).mockResolvedValue([gitlabSummary()]);
		await renderReadyView();
		await userEvent.type(screen.getByTestId('promotion-connection-name-input'), 'Draft connection');
		await userEvent.click(screen.getByTestId('promotion-connection-add-provider'));
		await selectInDialog(screen.getByTestId('promotion-provider-type-select'), 'GitLab');
		await userEvent.type(screen.getByTestId('promotion-provider-name-input'), 'GitLab');
		await userEvent.type(
			screen.getByTestId('promotion-provider-base-url-input'),
			'https://gitlab.example.com',
		);
		await userEvent.type(screen.getByTestId('promotion-provider-password-input'), 'test-token');
		await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
		await screen.findByTestId('promotion-connection-repository-select');
		expect(screen.getByTestId('promotion-connection-name-input')).toHaveValue('Draft connection');
		expect(api.fetchPromotionRepositories).toHaveBeenCalledWith(
			expect.anything(),
			'provider-gitlab',
			expect.anything(),
		);
	});

	it('clears branches when the GitLab repository changes and restores saved settings on discard', async () => {
		const otherRepository = {
			...gitlabRepository,
			id: '43',
			fullPath: 'team/other',
			remoteUrl: 'https://gitlab.example.com/team/other.git',
		};
		api.fetchPromotionProviders.mockResolvedValue([gitlabSummary(), summaryOf(sshProvider())]);
		api.fetchPromotionRepositories.mockResolvedValue({
			data: [gitlabRepository, otherRepository],
			nextCursor: null,
		});
		const saved = instanceConnection({
			provider: gitlabSummary(),
			target: { schemaVersion: 1, remoteUrl: gitlabRepository.remoteUrl },
			configs: { apply: applyConfig('main'), promote: promoteConfig('release/test', true) },
		});
		api.fetchPromotionConnections.mockResolvedValue([saved]);
		api.fetchPromotionConnection.mockResolvedValue(saved);
		await renderReadyView();
		await waitFor(() => expect(api.fetchPromotionBranches).toHaveBeenCalled());
		expect(selectedValue('promotion-connection-apply-branch-select')).toHaveValue('main');
		expect(selectedValue('promotion-connection-promote-branch-select')).toHaveValue('release/test');
		await selectInDialog(
			screen.getByTestId('promotion-connection-repository-select'),
			'team/other',
		);
		const bar = screen.getByTestId('promotion-connection-save-bar');
		expect(within(bar).getByRole('button', { name: /save settings/i })).toBeDisabled();
		expect(selectedValue('promotion-connection-apply-branch-select')).toHaveValue('');
		expect(selectedValue('promotion-connection-promote-branch-select')).toHaveValue('');
		await userEvent.click(within(bar).getByRole('button', { name: /discard/i }));
		await waitFor(() =>
			expect(selectedValue('promotion-connection-repository-select')).toHaveValue('team/workflows'),
		);
		expect(selectedValue('promotion-connection-apply-branch-select')).toHaveValue('main');
		expect(selectedValue('promotion-connection-promote-branch-select')).toHaveValue('release/test');
		await selectProvider('Production key');
		expect(screen.getByTestId('promotion-connection-remote-url-input')).toHaveValue('');
		expect(screen.getByTestId('promotion-connection-apply-branch-input')).toHaveValue('');
		expect(screen.getByTestId('promotion-connection-promote-branch-input')).toHaveValue('');
	});

	it('enables saved branch pickers after retrying discovery with a selected fallback', async () => {
		const saved = instanceConnection({
			provider: gitlabSummary(),
			target: { schemaVersion: 1, remoteUrl: gitlabRepository.remoteUrl },
			configs: { apply: applyConfig('main'), promote: promoteConfig('release/test') },
		});
		api.fetchPromotionProviders.mockResolvedValue([gitlabSummary()]);
		api.fetchPromotionConnections.mockResolvedValue([saved]);
		api.fetchPromotionConnection.mockResolvedValue(saved);
		api.fetchPromotionRepositories.mockRejectedValueOnce(new Error('GitLab is unavailable.'));
		await renderReadyView();
		await screen.findByRole('alert');
		expect(selectedValue('promotion-connection-apply-branch-select')).toBeDisabled();
		expect(selectedValue('promotion-connection-promote-branch-select')).toBeDisabled();
		await selectInDialog(
			screen.getByTestId('promotion-connection-repository-select'),
			gitlabRepository.remoteUrl,
		);
		await userEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' }));
		await waitFor(() =>
			expect(selectedValue('promotion-connection-apply-branch-select')).toBeEnabled(),
		);
		expect(selectedValue('promotion-connection-promote-branch-select')).toBeEnabled();
		expect(selectedValue('promotion-connection-apply-branch-select')).toHaveValue('main');
		expect(selectedValue('promotion-connection-promote-branch-select')).toHaveValue('release/test');
	});

	describe('providers', () => {
		const gitlabProvider = (): PromotionProvider =>
			sshProvider({
				id: 'provider-gitlab',
				name: 'Self-hosted GitLab',
				type: 'gitlab',
				authType: 'token',
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com/gitlab' },
			});

		it('creates a GitLab provider with an access token and reports validation errors before closing', async () => {
			api.createPromotionProvider
				.mockRejectedValueOnce(new Error('GitLab authentication failed. Check the access token.'))
				.mockResolvedValue({ provider: gitlabProvider(), publicKey: null });
			await renderReadyView();
			await openProviderDialog();
			await selectInDialog(screen.getByTestId('promotion-provider-type-select'), 'GitLab');
			expect(screen.queryByTestId('promotion-provider-auth-type-select')).not.toBeInTheDocument();
			expect(screen.queryByTestId('promotion-provider-username-input')).not.toBeInTheDocument();
			await userEvent.type(
				screen.getByTestId('promotion-provider-name-input'),
				'Self-hosted GitLab',
			);
			await userEvent.type(
				screen.getByTestId('promotion-provider-base-url-input'),
				'https://gitlab.example.com/gitlab',
			);
			expect(screen.getByTestId('promotion-provider-save-button')).toBeDisabled();
			await userEvent.type(screen.getByTestId('promotion-provider-password-input'), 'test-token');
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
			expect(await screen.findByRole('alert')).toHaveTextContent('GitLab authentication failed');
			expect(api.fetchPromotionProviders).toHaveBeenCalledTimes(1);
			expect(screen.getByTestId('promotion-provider-password-input')).toHaveValue('test-token');
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
			await waitFor(() =>
				expect(screen.queryByTestId('promotion-provider-dialog')).not.toBeInTheDocument(),
			);
			expect(api.createPromotionProvider).toHaveBeenLastCalledWith(expect.anything(), {
				name: 'Self-hosted GitLab',
				type: 'gitlab',
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com/gitlab' },
				auth: { authType: 'token', username: 'n8n', password: 'test-token' },
			});
		});

		it('renames a GitLab provider without replacing its stored token', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(gitlabProvider())]);
			api.fetchPromotionProvider.mockResolvedValue(gitlabProvider());
			api.updatePromotionProvider.mockResolvedValue(gitlabProvider());
			await renderReadyView();
			const row = screen.getByTestId('promotion-provider-row');
			expect(row).toHaveTextContent('GitLab');
			await openProviderDialog(row);
			await screen.findByDisplayValue('https://gitlab.example.com/gitlab');
			expect(screen.getByTestId('promotion-provider-password-input')).toHaveValue('');
			expect(screen.getByTestId('promotion-provider-save-button')).toBeDisabled();
			await userEvent.type(screen.getByTestId('promotion-provider-name-input'), ' renamed');
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
			await waitFor(() =>
				expect(api.updatePromotionProvider).toHaveBeenCalledWith(
					expect.anything(),
					'provider-gitlab',
					{
						name: 'Self-hosted GitLab renamed',
					},
				),
			);
		});

		it('requires a token when changing a GitLab base URL', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(gitlabProvider())]);
			api.fetchPromotionProvider.mockResolvedValue(gitlabProvider());
			api.updatePromotionProvider.mockResolvedValue(gitlabProvider());
			await renderReadyView();
			await openProviderDialog(screen.getByTestId('promotion-provider-row'));
			const url = await screen.findByDisplayValue('https://gitlab.example.com/gitlab');
			await userEvent.clear(url);
			await userEvent.type(url, 'https://gitlab.example.com/new');
			expect(screen.getByTestId('promotion-provider-save-button')).toBeDisabled();
			expect(screen.getByText('Enter an access token for the new GitLab URL')).toBeInTheDocument();
			await userEvent.type(
				screen.getByTestId('promotion-provider-password-input'),
				'new-host-token',
			);
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
			await waitFor(() =>
				expect(api.updatePromotionProvider).toHaveBeenCalledWith(
					expect.anything(),
					'provider-gitlab',
					{
						config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com/new' },
						auth: { authType: 'token', username: 'n8n', password: 'new-host-token' },
					},
				),
			);
		});

		it('keeps failed GitLab token edits open and retries with the replacement token', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(gitlabProvider())]);
			api.fetchPromotionProvider.mockResolvedValue(gitlabProvider());
			api.updatePromotionProvider
				.mockRejectedValueOnce(new Error('GitLab authentication failed.'))
				.mockResolvedValue(gitlabProvider());
			await renderReadyView();
			await openProviderDialog(screen.getByTestId('promotion-provider-row'));
			await screen.findByDisplayValue('Self-hosted GitLab');
			const token = screen.getByTestId('promotion-provider-password-input');
			await userEvent.type(token, 'expired-token');
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
			expect(await screen.findByTestId('promotion-provider-save-error')).toHaveTextContent(
				'GitLab authentication failed',
			);
			await userEvent.clear(token);
			await userEvent.type(token, 'replacement-token');
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
			await waitFor(() =>
				expect(screen.queryByTestId('promotion-provider-dialog')).not.toBeInTheDocument(),
			);
			expect(api.updatePromotionProvider).toHaveBeenLastCalledWith(
				expect.anything(),
				'provider-gitlab',
				{
					auth: { authType: 'token', username: 'n8n', password: 'replacement-token' },
				},
			);
		});

		it('adds an SSH provider and shows its deploy key', async () => {
			api.createPromotionProvider.mockResolvedValue({
				provider: sshProvider(),
				publicKey: 'ssh-ed25519 NEW-KEY',
			});
			api.fetchPromotionProviders
				.mockResolvedValueOnce([])
				.mockResolvedValue([summaryOf(sshProvider())]);
			await renderReadyView();
			await openProviderDialog();

			await userEvent.type(screen.getByTestId('promotion-provider-name-input'), 'Production key');
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));

			const keyStep = await screen.findByTestId('promotion-provider-key-step');
			expect(within(keyStep).getByDisplayValue('ssh-ed25519 NEW-KEY')).toBeInTheDocument();
			expect(api.createPromotionProvider).toHaveBeenCalledWith(expect.anything(), {
				name: 'Production key',
				type: 'git',
				auth: { authType: 'ssh-key', keyType: 'ed25519' },
			});

			await userEvent.click(screen.getByTestId('promotion-provider-done-button'));

			const row = await screen.findByTestId('promotion-provider-row');
			expect(within(row).getByText('Production key')).toBeInTheDocument();
			expect(within(row).getByText('SSH key')).toBeInTheDocument();
		});

		it('requires a username and password before saving a token provider', async () => {
			api.createPromotionProvider.mockResolvedValue({
				provider: sshProvider({ name: 'Mirror', authType: 'token', config: { schemaVersion: 1 } }),
				publicKey: null,
			});
			await renderReadyView();
			await openProviderDialog();

			await userEvent.type(screen.getByTestId('promotion-provider-name-input'), 'Mirror');
			await selectInDialog(
				screen.getByTestId('promotion-provider-auth-type-select'),
				'Username and password',
			);
			await userEvent.type(screen.getByTestId('promotion-provider-username-input'), 'deploy');
			expect(screen.getByTestId('promotion-provider-save-button')).toBeDisabled();
			await userEvent.type(screen.getByTestId('promotion-provider-password-input'), 'secret');
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));

			await waitFor(() =>
				expect(api.createPromotionProvider).toHaveBeenCalledWith(expect.anything(), {
					name: 'Mirror',
					type: 'git',
					auth: { authType: 'token', username: 'deploy', password: 'secret' },
				}),
			);
			await waitFor(() => expect(screen.queryByTestId('promotion-provider-dialog')).toBeNull());
		});

		it('shows the stored key and prevents deletion of a provider in use', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			api.fetchPromotionConnections.mockResolvedValue([instanceConnection()]);
			await renderReadyView();

			await openProviderDialog(await screen.findByTestId('promotion-provider-row'));

			expect(await screen.findByDisplayValue('ssh-ed25519 STORED-KEY')).toBeInTheDocument();
			const notice = screen.getByTestId('promotion-provider-in-use');
			expect(notice).toHaveTextContent('Production');
			expect(screen.getByTestId('promotion-provider-delete-button')).toBeDisabled();
		});

		it('shows the new deploy key after regeneration', async () => {
			api.updatePromotionProvider.mockResolvedValue(
				sshProvider({
					config: { schemaVersion: 1, publicKey: 'ssh-ed25519 ROTATED-KEY', keyType: 'ed25519' },
				}),
			);
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			await renderReadyView();

			await openProviderDialog(await screen.findByTestId('promotion-provider-row'));
			await userEvent.click(screen.getByTestId('promotion-provider-regenerate-key'));
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));

			const keyStep = await screen.findByTestId('promotion-provider-key-step');
			expect(within(keyStep).getByDisplayValue('ssh-ed25519 ROTATED-KEY')).toBeInTheDocument();
		});

		it('removes the provider after confirmation', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			await renderReadyView();
			api.fetchPromotionProviders.mockResolvedValue([]);

			await openProviderDialog(await screen.findByTestId('promotion-provider-row'));
			await userEvent.click(screen.getByTestId('promotion-provider-delete-button'));

			await waitFor(() =>
				expect(screen.queryByTestId('promotion-provider-row')).not.toBeInTheDocument(),
			);
			expect(api.deletePromotionProvider).toHaveBeenCalledWith(expect.anything(), 'provider-ssh');
		});

		it('keeps the provider when deletion is cancelled', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			mockConfirm.mockResolvedValue(MODAL_CANCEL);
			await renderReadyView();

			await openProviderDialog(await screen.findByTestId('promotion-provider-row'));
			await userEvent.click(screen.getByTestId('promotion-provider-delete-button'));

			expect(api.deletePromotionProvider).not.toHaveBeenCalled();
		});

		it('shows an error when the server refuses deletion', async () => {
			// Simulate a connection added after the dialog loaded.
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			const conflict = new Error('This provider is used by a connection');
			api.deletePromotionProvider.mockRejectedValueOnce(conflict);
			await renderReadyView();

			await openProviderDialog(await screen.findByTestId('promotion-provider-row'));
			await userEvent.click(screen.getByTestId('promotion-provider-delete-button'));

			await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(conflict, expect.any(String)));
			expect(await screen.findByTestId('promotion-provider-row')).toBeInTheDocument();
		});

		it('shows a load error when providers cannot be loaded', async () => {
			api.fetchPromotionProviders.mockRejectedValueOnce(new Error('Unable to load providers'));
			renderView();

			expect(await screen.findByTestId('promotion-providers-load-error')).toBeInTheDocument();
		});

		it('shows a load error when connection detail cannot be loaded', async () => {
			api.fetchPromotionConnections.mockResolvedValue([instanceConnection()]);
			api.fetchPromotionConnection.mockRejectedValueOnce(
				new Error('Unable to load connection detail'),
			);
			renderView();

			expect(await screen.findByTestId('promotion-providers-load-error')).toBeInTheDocument();
		});

		it('shows the saved connection after a retry', async () => {
			api.fetchPromotionProviders
				.mockRejectedValueOnce(new Error('Unable to load providers'))
				.mockResolvedValue([summaryOf(sshProvider())]);
			api.fetchPromotionConnections.mockResolvedValue([instanceConnection()]);
			renderView();

			await userEvent.click(
				within(await screen.findByTestId('promotion-providers-load-error')).getByRole('button'),
			);

			expect(await screen.findByTestId('promotion-connection-name-input')).toHaveValue(
				'Production',
			);
		});
	});

	describe('instance connection', () => {
		it('does not load connection detail when no instance connection exists', async () => {
			await renderReadyView();

			expect(api.fetchPromotionConnection).not.toHaveBeenCalled();
		});

		it('creates a connection with Apply and Promote settings', async () => {
			api.createPromotionConnection.mockResolvedValue(
				instanceConnection({
					configs: { apply: applyConfig('main'), promote: promoteConfig('develop') },
				}),
			);
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			await renderReadyView();

			await selectProvider('Production key');
			await fillConnectionBasics('Production', 'git@github.com:acme/workflows.git');
			await userEvent.click(screen.getByTestId('promotion-connection-apply-toggle'));
			await userEvent.type(
				await screen.findByTestId('promotion-connection-apply-branch-input'),
				'main',
			);
			await userEvent.click(screen.getByTestId('promotion-connection-promote-toggle'));
			await userEvent.type(
				await screen.findByTestId('promotion-connection-promote-branch-input'),
				'develop',
			);
			await save();

			await waitFor(() => expect(api.createPromotionConnection).toHaveBeenCalledTimes(1));
			expect(api.createPromotionConnection).toHaveBeenCalledWith(expect.anything(), {
				name: 'Production',
				scope: 'instance',
				providerId: 'provider-ssh',
				target: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
				configs: {
					apply: { name: undefined, settings: { schemaVersion: 1, branchName: 'main' } },
					promote: {
						name: undefined,
						settings: {
							schemaVersion: 1,
							baseBranchName: 'develop',
							createBranchOnPromotion: false,
						},
					},
				},
			});
		});

		it('accepts an SSH URL without a username', async () => {
			api.createPromotionConnection.mockResolvedValue(
				instanceConnection({
					target: { schemaVersion: 1, remoteUrl: 'github.com:acme/workflows.git' },
				}),
			);
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			await renderReadyView();

			await selectProvider('Production key');
			await fillConnectionBasics('Production', 'github.com:acme/workflows.git');
			await save();

			await waitFor(() => expect(api.createPromotionConnection).toHaveBeenCalled());
			expect(api.createPromotionConnection.mock.calls[0][1]).toMatchObject({
				target: { schemaVersion: 1, remoteUrl: 'github.com:acme/workflows.git' },
			});
		});

		it('shows the save error and keeps the entered values', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			const refusal = new Error(
				'SSH key providers require an ssh:// or [user@]host:path remote URL',
			);
			api.createPromotionConnection.mockRejectedValueOnce(refusal);
			await renderReadyView();

			await selectProvider('Production key');
			await fillConnectionBasics('Production', 'https://github.com/acme/workflows.git');
			await save();

			await waitFor(() => expect(mockShowError).toHaveBeenCalledWith(refusal, expect.any(String)));
			expect(mockShowMessage).not.toHaveBeenCalled();
			expect(screen.getByTestId('promotion-connection-remote-url-input')).toHaveValue(
				'https://github.com/acme/workflows.git',
			);
		});

		it('loads the saved connection settings', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			const saved = instanceConnection({
				configs: { apply: applyConfig('main'), promote: promoteConfig('develop', true) },
			});
			api.fetchPromotionConnections.mockResolvedValue([saved]);
			api.fetchPromotionConnection.mockResolvedValue(saved);
			await renderReadyView();

			expect(api.fetchPromotionConnection).toHaveBeenCalledWith(expect.anything(), 'connection-1');
			expect(screen.getByTestId('promotion-connection-name-input')).toHaveValue('Production');
			expect(screen.getByTestId('promotion-connection-remote-url-input')).toHaveValue(
				'git@github.com:acme/workflows.git',
			);
			expect(await screen.findByTestId('promotion-connection-apply-branch-input')).toHaveValue(
				'main',
			);
			expect(screen.getByTestId('promotion-connection-promote-branch-input')).toHaveValue(
				'develop',
			);
			expect(screen.getByTestId('promotion-connection-create-branch-toggle')).toHaveAttribute(
				'aria-checked',
				'true',
			);
		});

		it('updates the connection when another provider is selected', async () => {
			const provider = summaryOf(sshProvider({ id: 'provider-2', name: 'Mirror' }));
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider()), provider]);
			api.updatePromotionConnection.mockResolvedValue(
				instanceConnection({
					provider,
					configs: { apply: applyConfig('main') },
				}),
			);
			const saved = instanceConnection({ configs: { apply: applyConfig('main') } });
			api.fetchPromotionConnections.mockResolvedValue([saved]);
			api.fetchPromotionConnection.mockResolvedValue(saved);
			await renderReadyView();

			await selectProvider('Mirror');
			await save();

			await waitFor(() =>
				expect(api.updatePromotionConnection).toHaveBeenCalledWith(
					expect.anything(),
					'connection-1',
					{
						providerId: 'provider-2',
					},
				),
			);
			expect(api.updatePromotionProvider).not.toHaveBeenCalled();
		});

		it('retries failed settings without repeating successful updates', async () => {
			api.updatePromotionConnection.mockResolvedValue(
				instanceConnection({
					name: 'Renamed',
					configs: { promote: promoteConfig('main') },
				}),
			);
			api.upsertPromotionPromoteConfig.mockResolvedValue(promoteConfig('main-next'));
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			const saved = instanceConnection({ configs: { promote: promoteConfig('main', false) } });
			api.fetchPromotionConnections.mockResolvedValue([saved]);
			api.fetchPromotionConnection.mockResolvedValue(saved);
			api.upsertPromotionPromoteConfig.mockRejectedValueOnce(new Error('git is unreachable'));
			await renderReadyView();

			await userEvent.clear(screen.getByTestId('promotion-connection-name-input'));
			await userEvent.type(screen.getByTestId('promotion-connection-name-input'), 'Renamed');
			await userEvent.type(
				await screen.findByTestId('promotion-connection-promote-branch-input'),
				'-next',
			);
			await save();

			const notice = await screen.findByTestId('promotion-connection-partial-save');
			expect(notice).toHaveTextContent('Promote settings');
			expect(mockShowError).toHaveBeenCalled();
			expect(mockShowMessage).not.toHaveBeenCalled();
			expect(api.updatePromotionConnection).toHaveBeenCalledTimes(1);

			await save();

			await waitFor(() => expect(api.upsertPromotionPromoteConfig).toHaveBeenCalledTimes(2));
			expect(api.updatePromotionConnection).toHaveBeenCalledTimes(1);
			expect(screen.queryByTestId('promotion-connection-partial-save')).toBeNull();
			expect(mockShowMessage).toHaveBeenCalled();
		});

		it('deletes Apply settings when Apply is turned off', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			const saved = instanceConnection({ configs: { apply: applyConfig('main') } });
			api.fetchPromotionConnections.mockResolvedValue([saved]);
			api.fetchPromotionConnection.mockResolvedValue(saved);
			await renderReadyView();

			await userEvent.click(screen.getByTestId('promotion-connection-apply-toggle'));
			await save();

			await waitFor(() =>
				expect(api.deletePromotionConfig).toHaveBeenCalledWith(
					expect.anything(),
					'connection-1',
					'apply',
				),
			);
		});
	});
});
