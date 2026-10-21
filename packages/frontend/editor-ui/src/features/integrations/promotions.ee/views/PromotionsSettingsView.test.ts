import type { PromotionBranchListPublicDto, PromotionRepository } from '@n8n/api-types';
import { ResponseError, type IUser } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { getDropdownItems, mockedStore } from '@/__tests__/utils';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import {
	invalidateInstancePromotionConnection,
	useInstancePromotionConnection,
} from '../composables/useInstancePromotionConnection';
import type * as PromotionsApi from '../promotionsSettings.api';
import type {
	PromotionConnection,
	PromotionEnvironment,
	PromotionProvider,
} from '../promotionsSettings.api';
import PromotionsSettingsView from './PromotionsSettingsView.vue';

const api = vi.hoisted(() => ({
	fetchPromotionProviders: vi.fn<typeof PromotionsApi.fetchPromotionProviders>(),
	fetchPromotionRepositories: vi.fn<typeof PromotionsApi.fetchPromotionRepositories>(),
	fetchPromotionBranches: vi.fn<typeof PromotionsApi.fetchPromotionBranches>(),
	fetchPromotionProvider: vi.fn<typeof PromotionsApi.fetchPromotionProvider>(),
	createPromotionProvider: vi.fn<typeof PromotionsApi.createPromotionProvider>(),
	updatePromotionProvider: vi.fn<typeof PromotionsApi.updatePromotionProvider>(),
	deletePromotionProvider: vi.fn<typeof PromotionsApi.deletePromotionProvider>(),
	fetchPromotionEnvironment: vi.fn<typeof PromotionsApi.fetchPromotionEnvironment>(),
	fetchPromotionEnvironments: vi.fn<typeof PromotionsApi.fetchPromotionEnvironments>(),
	createPromotionEnvironment: vi.fn<typeof PromotionsApi.createPromotionEnvironment>(),
	updatePromotionEnvironment: vi.fn<typeof PromotionsApi.updatePromotionEnvironment>(),
	deletePromotionEnvironment: vi.fn<typeof PromotionsApi.deletePromotionEnvironment>(),
	connectPromotionCheckout: vi.fn<typeof PromotionsApi.connectPromotionCheckout>(),
	disconnectPromotionCheckout: vi.fn<typeof PromotionsApi.disconnectPromotionCheckout>(),
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

const applyConfig = (branchName: string) => ({
	id: 'environment-apply',
	direction: 'apply' as const,
	settings: { schemaVersion: 1 as const, branchName },
	checkout: { hasCheckout: false, matchesEnvironment: false },
	...timestamps,
});

const promoteConfig = (baseBranchName: string, createBranchOnPromotion = false) => ({
	id: 'environment-promote',
	direction: 'promote' as const,
	settings: { schemaVersion: 1 as const, baseBranchName, createBranchOnPromotion },
	checkout: { hasCheckout: false, matchesEnvironment: false },
	...timestamps,
});

type ConnectionDraft = Partial<Pick<PromotionConnection, 'name' | 'remote' | 'provider'>> & {
	configs?: {
		apply?: ReturnType<typeof applyConfig>;
		promote?: ReturnType<typeof promoteConfig>;
	};
};

/** The page shows one connection; each direction is an environment with the same shared fields. */
const instanceConnection = ({
	configs = { apply: applyConfig('main') },
	...shared
}: ConnectionDraft = {}): PromotionConnection => {
	const fields = {
		name: 'Production',
		remote: { schemaVersion: 1 as const, remoteUrl: 'git@github.com:acme/workflows.git' },
		provider: summaryOf(sshProvider()),
		...shared,
	};
	return {
		...fields,
		configs: {
			...(configs.apply && { apply: { ...fields, scope: 'instance' as const, ...configs.apply } }),
			...(configs.promote && {
				promote: { ...fields, scope: 'instance' as const, ...configs.promote },
			}),
		},
	};
};

const withShared = (
	connection: PromotionConnection,
	fields: Partial<Pick<PromotionConnection, 'name' | 'remote' | 'provider'>>,
): PromotionConnection => ({
	...connection,
	...fields,
	configs: {
		...(connection.configs.apply && { apply: { ...connection.configs.apply, ...fields } }),
		...(connection.configs.promote && { promote: { ...connection.configs.promote, ...fields } }),
	},
});

const environmentsOf = (connection: PromotionConnection) =>
	[connection.configs.apply, connection.configs.promote].filter(
		(environment) => environment !== undefined,
	);
const environmentOf = (connection: PromotionConnection, id: string) =>
	environmentsOf(connection).find((environment) => environment.id === id) as PromotionEnvironment;
const applyOf = (connection: PromotionConnection) => environmentOf(connection, 'environment-apply');
const promoteOf = (connection: PromotionConnection) =>
	environmentOf(connection, 'environment-promote');

/** Serves the saved environments from the list and detail routes. */
const mockSaved = (connection: PromotionConnection) => {
	api.fetchPromotionEnvironments.mockResolvedValue(environmentsOf(connection));
	api.fetchPromotionEnvironment.mockImplementation(async (_context, id) =>
		environmentOf(connection, id),
	);
};

/** Answers every environment update with that environment in the given connection. */
const mockUpdates = (connection: PromotionConnection) =>
	api.updatePromotionEnvironment.mockImplementation(async (_context, id) =>
		environmentOf(connection, id),
	);

const gitlabProvider = (overrides: Partial<PromotionProvider> = {}) =>
	sshProvider({
		id: 'provider-gitlab',
		name: 'GitLab',
		type: 'gitlab',
		authType: 'token',
		config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com' },
		...overrides,
	});
const repository: PromotionRepository = {
	id: '42',
	name: 'Workflows',
	fullPath: 'team/workflows',
	remoteUrl: 'https://gitlab.example.com/team/workflows.git',
	defaultBranch: 'main',
};
const otherRepository = {
	...repository,
	id: '43',
	fullPath: 'team/other',
	remoteUrl: 'https://gitlab.example.com/team/other.git',
};
const requestRemoteOf = (repo: PromotionRepository) => ({
	schemaVersion: 1 as const,
	remoteUrl: repo.remoteUrl,
});
const remoteOf = (repo: PromotionRepository) => ({
	...requestRemoteOf(repo),
	repositoryPath: repo.fullPath,
});
const gitlabConnection = (overrides: ConnectionDraft = {}) =>
	instanceConnection({
		provider: summaryOf(gitlabProvider()),
		remote: remoteOf(repository),
		configs: { apply: applyConfig('main') },
		...overrides,
	});
const mockGitlabConnection = (saved = gitlabConnection()) => {
	api.fetchPromotionProviders.mockResolvedValue([saved.provider]);
	api.fetchPromotionProvider.mockResolvedValue(gitlabProvider());
	api.updatePromotionProvider.mockResolvedValue(gitlabProvider());
	mockSaved(saved);
	return saved;
};

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

const selectProvider = async (name: string) => {
	const items = await getDropdownItems(screen.getByTestId('promotion-connection-provider-select'));
	const option = Array.from(items).find((item) => item.textContent?.includes(name));
	await userEvent.click(option as Element);
};

const fillConnectionBasics = async (name: string, remoteUrl: string) => {
	await userEvent.type(screen.getByTestId('promotion-connection-name-input'), name);
	await userEvent.type(screen.getByTestId('promotion-connection-remote-url-input'), remoteUrl);
};

const enableApply = async (branchName: string) => {
	await userEvent.click(screen.getByTestId('promotion-connection-apply-toggle'));
	await userEvent.type(
		await screen.findByTestId('promotion-connection-apply-branch-input'),
		branchName,
	);
};

const save = async () => {
	const bar = screen.getByTestId('promotion-connection-save-bar');
	await userEvent.click(within(bar).getByRole('button', { name: /save settings|retry/i }));
};

const selectedValue = (field: string) =>
	within(screen.getByTestId(`promotion-connection-${field}-select`)).getByRole('combobox');
const discard = async () =>
	userEvent.click(
		within(screen.getByTestId('promotion-connection-save-bar')).getByRole('button', {
			name: /discard/i,
		}),
	);
const selectRepository = async (repo = otherRepository) =>
	selectInDialog(screen.getByTestId('promotion-connection-repository-select'), repo.fullPath);
const selectBranches = async (apply = 'main', promote?: string) => {
	await selectInDialog(screen.getByTestId('promotion-connection-apply-branch-select'), apply);
	if (promote)
		await selectInDialog(screen.getByTestId('promotion-connection-promote-branch-select'), promote);
};
const fillGitlabProvider = async (fields: { name?: string; baseUrl?: string; token?: string }) => {
	for (const [field, value] of [
		['name', fields.name],
		['base-url', fields.baseUrl],
		['password', fields.token],
	]) {
		if (value === undefined) continue;
		const input = screen.getByTestId(`promotion-provider-${field}-input`);
		await userEvent.clear(input);
		await userEvent.type(input, value);
	}
};
const saveProvider = async () => {
	await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
	await waitFor(() =>
		expect(screen.queryByTestId('promotion-provider-dialog')).not.toBeInTheDocument(),
	);
};
const editGitlabProvider = async (fields: Parameters<typeof fillGitlabProvider>[0]) => {
	await openProviderDialog(screen.getAllByTestId('promotion-provider-row')[0]);
	await screen.findByDisplayValue('https://gitlab.example.com');
	await fillGitlabProvider(fields);
	await saveProvider();
};

describe('PromotionsSettingsView', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		invalidateInstancePromotionConnection();
		createTestingPinia();
		api.fetchPromotionProviders.mockResolvedValue([]);
		api.fetchPromotionProvider.mockResolvedValue(sshProvider());
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		api.deletePromotionProvider.mockResolvedValue(undefined);
		api.deletePromotionEnvironment.mockResolvedValue(undefined);
		api.fetchPromotionRepositories.mockResolvedValue({
			data: [repository, otherRepository],
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

	describe('GitLab connections', () => {
		it('creates a provider and a connection without losing the draft', async () => {
			const cachedConnection = useInstancePromotionConnection();
			await cachedConnection.load();
			const created = gitlabConnection({
				configs: { apply: applyConfig('main'), promote: promoteConfig('release/test', true) },
			});
			const pending = createDeferredPromise<PromotionEnvironment>();
			api.createPromotionProvider.mockResolvedValue({
				provider: gitlabProvider(),
				publicKey: null,
			});
			api.fetchPromotionProviders
				.mockResolvedValueOnce([])
				.mockRejectedValueOnce(new Error('The provider refresh failed.'))
				.mockResolvedValue([summaryOf(gitlabProvider())]);
			api.createPromotionEnvironment
				.mockReturnValueOnce(pending.promise)
				.mockResolvedValueOnce(promoteOf(created));
			await renderReadyView();
			await userEvent.type(screen.getByTestId('promotion-connection-name-input'), 'Production');
			await userEvent.click(screen.getByTestId('promotion-connection-add-provider'));
			await selectInDialog(screen.getByTestId('promotion-provider-type-select'), 'GitLab');
			await fillGitlabProvider({
				name: 'GitLab',
				baseUrl: 'https://gitlab.example.com',
				token: 'test-token',
			});
			await saveProvider();
			const refreshError = await screen.findByTestId('promotion-providers-load-error');
			expect(selectedValue('provider')).toHaveValue('');
			await userEvent.click(within(refreshError).getByRole('button', { name: 'Retry' }));
			await screen.findByTestId('promotion-provider-row');
			await selectProvider('GitLab');
			expect(screen.getByTestId('promotion-connection-name-input')).toHaveValue('Production');
			expect(screen.queryByTestId('promotion-connection-remote-url-input')).not.toBeInTheDocument();
			await selectRepository(repository);
			await userEvent.click(screen.getByTestId('promotion-connection-apply-toggle'));
			await userEvent.click(screen.getByTestId('promotion-connection-promote-toggle'));
			await selectBranches('main', 'release/test');
			expect(selectedValue('repository')).toHaveAccessibleName(/^Repository/);
			expect(selectedValue('apply-branch')).toHaveAccessibleName(/^Apply branch/);
			expect(selectedValue('promote-branch')).toHaveAccessibleName(/^Promote base branch/);
			await userEvent.click(screen.getByTestId('promotion-connection-create-branch-toggle'));
			await save();
			const shared = {
				name: 'Production',
				scope: 'instance',
				providerId: 'provider-gitlab',
				remote: requestRemoteOf(repository),
			};
			expect(api.createPromotionEnvironment).toHaveBeenCalledWith(expect.anything(), {
				...shared,
				direction: 'apply',
				settings: { schemaVersion: 1, branchName: 'main' },
			});
			mockSaved(created);
			api.fetchPromotionProvider.mockResolvedValue(gitlabProvider());
			api.updatePromotionProvider.mockResolvedValue(gitlabProvider());
			await editGitlabProvider({ name: 'GitLab renamed' });
			pending.resolve(applyOf(created));
			await flushPromises();
			expect(api.createPromotionEnvironment).toHaveBeenLastCalledWith(expect.anything(), {
				...shared,
				direction: 'promote',
				settings: {
					schemaVersion: 1,
					baseBranchName: 'release/test',
					createBranchOnPromotion: true,
				},
			});
			expect(mockShowMessage).toHaveBeenCalledWith({
				title: 'Promotion settings saved',
				type: 'success',
			});
			expect(
				within(screen.getByTestId('promotion-connection-save-bar')).queryByRole('button', {
					name: /save settings/i,
				}),
			).not.toBeInTheDocument();
			await cachedConnection.load();
			expect(cachedConnection.hasPromoteConfig.value).toBe(true);
		});

		it('clears dependent branches, supports discard, and converts a saved URL remote to a path', async () => {
			const saved = mockGitlabConnection(
				gitlabConnection({
					remote: { schemaVersion: 1, remoteUrl: repository.remoteUrl },
					configs: { apply: applyConfig('main'), promote: promoteConfig('release/test', true) },
				}),
			);
			api.fetchPromotionProviders.mockResolvedValue([saved.provider, summaryOf(sshProvider())]);
			mockUpdates(withShared(saved, { remote: remoteOf(repository) }));
			await renderReadyView();
			const hint = screen.getByText('Select a repository again to load its branches', {
				selector: '[role="status"]',
			});
			expect(selectedValue('repository')).toHaveAttribute('aria-describedby', hint.id);
			await selectRepository(repository);
			expect(selectedValue('apply-branch')).toHaveValue('main');
			expect(selectedValue('promote-branch')).toHaveValue('release/test');
			await save();
			for (const id of ['environment-apply', 'environment-promote']) {
				expect(api.updatePromotionEnvironment).toHaveBeenCalledWith(expect.anything(), id, {
					remote: requestRemoteOf(repository),
				});
			}
			mockUpdates(withShared(saved, { remote: remoteOf(otherRepository) }));
			await selectRepository();
			expect(selectedValue('apply-branch')).toHaveValue('');
			expect(selectedValue('promote-branch')).toHaveValue('');
			expect(
				within(screen.getByTestId('promotion-connection-save-bar')).getByRole('button', {
					name: /save settings/i,
				}),
			).toBeDisabled();
			await discard();
			expect(selectedValue('repository')).toHaveValue(repository.fullPath);
			expect(selectedValue('promote-branch')).toHaveValue('release/test');
			await selectRepository();
			await selectBranches('main', 'release/test');
			await save();
			for (const id of ['environment-apply', 'environment-promote']) {
				expect(api.updatePromotionEnvironment).toHaveBeenCalledWith(expect.anything(), id, {
					remote: requestRemoteOf(otherRepository),
				});
			}
			expect(api.updatePromotionEnvironment).toHaveBeenCalledTimes(4);
			await selectProvider('Production key');
			expect(screen.getByTestId('promotion-connection-remote-url-input')).toHaveValue('');
			expect(screen.getByTestId('promotion-connection-apply-branch-input')).toHaveValue('');
		});

		it('loads saved branches by path without resolving the repository browse page', async () => {
			const saved = mockGitlabConnection();
			api.fetchPromotionRepositories.mockRejectedValueOnce(new Error('GitLab is unavailable.'));
			await renderReadyView();
			await screen.findByRole('alert');
			expect(selectedValue('apply-branch')).toBeEnabled();
			expect(api.fetchPromotionBranches).toHaveBeenCalledWith(
				expect.anything(),
				saved.provider.id,
				repository.fullPath,
				expect.anything(),
			);
			expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(1);
			await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
			await flushPromises();
			await userEvent.type(screen.getByTestId('promotion-connection-name-input'), ' renamed');
			mockUpdates(withShared(saved, { name: 'Production renamed' }));
			await save();
			expect(api.updatePromotionEnvironment).toHaveBeenCalledWith(
				expect.anything(),
				'environment-apply',
				{ name: 'Production renamed' },
			);
		});

		it('keeps the saved repository and its branches after a host edit', async () => {
			const saved = mockGitlabConnection();
			const movedRepository = {
				...repository,
				remoteUrl: 'https://other.example.com/team/workflows.git',
			};
			api.fetchPromotionEnvironment
				.mockResolvedValueOnce(applyOf(saved))
				.mockResolvedValue(applyOf(withShared(saved, { remote: remoteOf(movedRepository) })));
			await renderReadyView();
			await userEvent.type(screen.getByTestId('promotion-connection-name-input'), ' draft');
			api.fetchPromotionRepositories.mockResolvedValue({
				data: [movedRepository],
				nextCursor: null,
			});
			await editGitlabProvider({ baseUrl: 'https://other.example.com', token: 'test-token' });
			await waitFor(() => expect(selectedValue('repository')).toHaveValue(repository.fullPath));
			expect(selectedValue('apply-branch')).toBeEnabled();
			expect(selectedValue('apply-branch')).toHaveValue('main');
			mockUpdates(withShared(saved, { name: 'Production draft' }));
			await save();
			await waitFor(() =>
				expect(api.updatePromotionEnvironment).toHaveBeenCalledWith(
					expect.anything(),
					'environment-apply',
					{ name: 'Production draft' },
				),
			);
		});

		it('keeps same-path repository drafts scoped to their provider during host edits', async () => {
			const saved = mockGitlabConnection();
			const providerB = gitlabProvider({ id: 'provider-b', name: 'GitLab B' });
			const movedRepository = {
				...repository,
				remoteUrl: 'https://other.example.com/team/workflows.git',
			};
			api.fetchPromotionProviders
				.mockResolvedValueOnce([saved.provider, summaryOf(providerB)])
				.mockResolvedValue([summaryOf(providerB), saved.provider]);
			api.fetchPromotionProvider
				.mockResolvedValueOnce(gitlabProvider())
				.mockResolvedValue(providerB);
			api.updatePromotionProvider
				.mockResolvedValueOnce(
					gitlabProvider({ config: { schemaVersion: 1, baseUrl: 'https://other.example.com' } }),
				)
				.mockResolvedValue({
					...providerB,
					config: { schemaVersion: 1, baseUrl: 'https://new.example.com' },
				});
			api.fetchPromotionEnvironment
				.mockResolvedValueOnce(applyOf(saved))
				.mockResolvedValue(applyOf(withShared(saved, { remote: remoteOf(movedRepository) })));
			await renderReadyView();
			await selectProvider('GitLab B');
			await selectRepository(repository);
			await selectBranches();
			await editGitlabProvider({ baseUrl: 'https://other.example.com', token: 'test-token' });
			expect(selectedValue('provider')).toHaveValue('GitLab B');
			expect(selectedValue('repository')).toHaveValue(repository.fullPath);
			await editGitlabProvider({ baseUrl: 'https://new.example.com', token: 'test-token' });
			expect(selectedValue('repository')).toHaveValue('');
			expect(selectedValue('apply-branch')).toBeDisabled();
			expect(
				within(screen.getByTestId('promotion-connection-save-bar')).getByRole('button', {
					name: /save settings/i,
				}),
			).toBeDisabled();
		});

		it.each(['saved', 'new'] as const)(
			'clears a repository picked from the old host after a host edit on a %s connection',
			async (state) => {
				const saved = mockGitlabConnection();
				api.fetchPromotionEnvironments.mockResolvedValue(
					state === 'saved' ? environmentsOf(saved) : [],
				);
				await renderReadyView();
				if (state === 'new') {
					await selectProvider('GitLab');
					await userEvent.type(screen.getByTestId('promotion-connection-name-input'), 'Production');
					await userEvent.click(screen.getByTestId('promotion-connection-apply-toggle'));
				}
				await selectRepository();
				await selectBranches();
				await userEvent.type(screen.getByTestId('promotion-connection-name-input'), ' draft');
				await editGitlabProvider({ baseUrl: 'https://other.example.com', token: 'test-token' });
				expect(selectedValue('repository')).toHaveValue('');
				expect(selectedValue('apply-branch')).toBeDisabled();
				expect(screen.getByTestId('promotion-connection-name-input')).toHaveValue(
					'Production draft',
				);
				expect(
					within(screen.getByTestId('promotion-connection-save-bar')).getByRole('button', {
						name: /save settings/i,
					}),
				).toBeDisabled();
			},
		);

		it('refreshes token access and ignores pending discovery from the previous token', async () => {
			mockGitlabConnection();
			const old = createDeferredPromise<PromotionBranchListPublicDto>();
			api.fetchPromotionBranches
				.mockReturnValueOnce(old.promise)
				.mockRejectedValueOnce(new Error('Repository access changed.'));
			await renderReadyView();
			await editGitlabProvider({ token: 'replacement-token' });
			expect(api.updatePromotionProvider).toHaveBeenCalledWith(
				expect.anything(),
				'provider-gitlab',
				{ auth: { authType: 'token', password: 'replacement-token' } },
			);
			expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(2);
			expect(api.fetchPromotionBranches).toHaveBeenCalledTimes(2);
			old.resolve({ data: [{ name: 'old-only', isDefault: false }], nextCursor: 'old-page' });
			await flushPromises();
			expect(screen.getByRole('alert')).toHaveTextContent('Repository access changed.');
			expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
			expect(selectedValue('apply-branch')).toHaveValue('main');
		});

		it.each(['selected', 'original'] as const)(
			'does not restore cleared IDs after editing the %s provider during a failed save',
			async (editedProvider) => {
				const saved = mockGitlabConnection();
				const providerB = gitlabProvider({
					id: 'provider-b',
					name: 'GitLab B',
				});
				api.fetchPromotionProviders.mockResolvedValue([saved.provider, summaryOf(providerB)]);
				api.fetchPromotionEnvironment.mockResolvedValueOnce(applyOf(saved)).mockResolvedValue(
					applyOf(
						withShared(saved, {
							remote: { schemaVersion: 1, remoteUrl: saved.remote.remoteUrl },
						}),
					),
				);
				const pending = createDeferredPromise<PromotionEnvironment>();
				api.updatePromotionEnvironment.mockReturnValueOnce(pending.promise);
				await renderReadyView();
				if (editedProvider === 'original') await selectProvider('GitLab B');
				await selectRepository();
				await selectBranches();
				await save();
				await editGitlabProvider({ baseUrl: 'https://other.example.com', token: 'test-token' });
				const failure = new Error('The provider changed during the update.');
				pending.reject(failure);
				await waitFor(() => expect(api.fetchPromotionEnvironment).toHaveBeenCalledTimes(3));
				expect(mockShowError).toHaveBeenCalledWith(failure, "Couldn't save the connection");
				if (editedProvider === 'original') {
					expect(selectedValue('provider')).toHaveValue('GitLab B');
					expect(selectedValue('apply-branch')).toBeEnabled();
				}
				await discard();
				expect(selectedValue('apply-branch')).toBeDisabled();
				expect(api.updatePromotionEnvironment).toHaveBeenCalledTimes(1);
			},
		);

		it.each(['success', 'failure'] as const)(
			'ignores an older refresh %s after a successful save',
			async (outcome) => {
				const saved = mockGitlabConnection();
				const pending = createDeferredPromise<PromotionEnvironment>();
				api.fetchPromotionEnvironment
					.mockResolvedValueOnce(applyOf(saved))
					.mockReturnValueOnce(pending.promise);
				mockUpdates(withShared(saved, { remote: remoteOf(otherRepository) }));
				await renderReadyView();
				await editGitlabProvider({ name: 'GitLab renamed' });
				await selectRepository();
				await selectBranches();
				await save();
				await flushPromises();
				if (outcome === 'success') pending.resolve(applyOf(saved));
				else pending.reject(new Error('The older refresh failed.'));
				await flushPromises();
				await userEvent.type(screen.getByTestId('promotion-connection-name-input'), ' draft');
				await discard();
				expect(selectedValue('repository')).toHaveValue(otherRepository.fullPath);
				expect(screen.queryByTestId('promotion-providers-load-error')).not.toBeInTheDocument();
				expect(mockShowError).not.toHaveBeenCalled();
			},
		);

		it.each(['transient', 'forbidden'] as const)(
			'handles a %s refresh failure without treating it as an initial load',
			async (failure) => {
				mockGitlabConnection();
				api.fetchPromotionProviders
					.mockResolvedValueOnce([summaryOf(gitlabProvider())])
					.mockRejectedValueOnce(
						failure === 'transient'
							? new Error('The refresh failed.')
							: new ResponseError('Access denied.', { httpStatusCode: 403 }),
					);
				await renderReadyView();
				await userEvent.type(screen.getByTestId('promotion-connection-name-input'), ' draft');
				await editGitlabProvider({ name: 'GitLab renamed' });
				const loadError = await screen.findByTestId('promotion-providers-load-error');
				if (failure === 'transient')
					expect(screen.getByTestId('promotion-connection-name-input')).toHaveValue(
						'Production draft',
					);
				else expect(screen.queryByTestId('promotion-connection-form')).not.toBeInTheDocument();
				await userEvent.click(within(loadError).getByRole('button', { name: 'Retry' }));
				expect(await screen.findByTestId('promotion-connection-name-input')).toHaveValue(
					failure === 'transient' ? 'Production draft' : 'Production',
				);
			},
		);

		it.each(['unchanged', 'replaced'] as const)(
			'keeps checkout state correct when the repository is %s during a clone',
			async (state) => {
				mockedStore(useUsersStore).currentUser = mock<IUser>({
					globalScopes: ['gitConnection:clone', 'gitConnection:pull'],
				});
				const saved = mockGitlabConnection();
				const updated = withShared(saved, { remote: remoteOf(otherRepository) });
				api.fetchPromotionEnvironment
					.mockResolvedValueOnce(applyOf(saved))
					.mockResolvedValue(applyOf(updated));
				mockUpdates(updated);
				const pending =
					createDeferredPromise<
						Awaited<ReturnType<typeof PromotionsApi.connectPromotionCheckout>>
					>();
				api.connectPromotionCheckout.mockReturnValueOnce(pending.promise);
				await renderReadyView();
				await userEvent.click(screen.getByTestId('promotion-checkout-connect'));
				if (state === 'replaced') {
					await selectRepository();
					await selectBranches();
					await save();
					await flushPromises();
				}
				pending.resolve({
					environmentId: 'environment-apply',
					direction: 'apply',
					branchName: 'main',
					hasCheckout: true,
				});
				await flushPromises();
				if (state === 'replaced')
					expect(screen.getByTestId('apply-instance-button')).toBeDisabled();
				else expect(screen.getByTestId('apply-instance-button')).toBeEnabled();
				expect(api.fetchPromotionEnvironment).toHaveBeenCalledTimes(state === 'replaced' ? 2 : 1);
			},
		);
	});

	describe('providers', () => {
		it('validates GitLab URL and token input and retries creation without closing', async () => {
			api.createPromotionProvider
				.mockRejectedValueOnce(new Error('GitLab authentication failed.'))
				.mockResolvedValue({ provider: gitlabProvider(), publicKey: null });
			await renderReadyView();
			await openProviderDialog();
			await selectInDialog(screen.getByTestId('promotion-provider-type-select'), 'GitLab');
			expect(screen.queryByTestId('promotion-provider-auth-type-select')).not.toBeInTheDocument();
			expect(screen.queryByTestId('promotion-provider-username-input')).not.toBeInTheDocument();
			await fillGitlabProvider({ name: 'GitLab', baseUrl: 'https://gitlab.example.com/gitlab' });
			expect(screen.getByTestId('promotion-provider-save-button')).toBeDisabled();
			await fillGitlabProvider({ token: 'test-token' });
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
			expect(await screen.findByRole('alert')).toHaveTextContent('GitLab authentication failed.');
			expect(screen.getByTestId('promotion-provider-password-input')).toHaveValue('test-token');
			expect(mockShowError).not.toHaveBeenCalled();
			await saveProvider();
			expect(api.createPromotionProvider).toHaveBeenLastCalledWith(expect.anything(), {
				name: 'GitLab',
				type: 'gitlab',
				config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com/gitlab' },
				auth: { authType: 'token', password: 'test-token' },
			});
		});

		it('renames a GitLab provider without changing its token, equivalent URL, or discovery', async () => {
			mockGitlabConnection();
			await renderReadyView();
			await editGitlabProvider({
				name: 'GitLab renamed',
				baseUrl: 'https://GITLAB.example.com:443/',
			});
			expect(api.updatePromotionProvider).toHaveBeenCalledWith(
				expect.anything(),
				'provider-gitlab',
				{ name: 'GitLab renamed' },
			);
			expect(api.fetchPromotionRepositories).toHaveBeenCalledTimes(1);
			expect(api.fetchPromotionBranches).toHaveBeenCalledTimes(1);
		});

		it('requires a new token for a host edit and clears failed validation after editing', async () => {
			mockGitlabConnection();
			api.updatePromotionProvider
				.mockRejectedValueOnce(new Error('GitLab authentication failed.'))
				.mockResolvedValue(gitlabProvider());
			await renderReadyView();
			await openProviderDialog(screen.getByTestId('promotion-provider-row'));
			await screen.findByDisplayValue('https://gitlab.example.com');
			await fillGitlabProvider({ baseUrl: 'https://gitlab.example.com/gitlab' });
			expect(screen.getByTestId('promotion-provider-save-button')).toBeDisabled();
			await fillGitlabProvider({ token: 'expired-token' });
			await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
			expect(await screen.findByTestId('promotion-provider-save-error')).toHaveTextContent(
				'GitLab authentication failed.',
			);
			await fillGitlabProvider({ token: 'replacement-token' });
			expect(screen.queryByTestId('promotion-provider-save-error')).not.toBeInTheDocument();
			await saveProvider();
			expect(api.updatePromotionProvider).toHaveBeenLastCalledWith(
				expect.anything(),
				'provider-gitlab',
				{
					config: { schemaVersion: 1, baseUrl: 'https://gitlab.example.com/gitlab' },
					auth: { authType: 'token', password: 'replacement-token' },
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
			mockSaved(instanceConnection());
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
			// Simulate an environment added after the dialog loaded.
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			const conflict = new Error('This provider is used by a promotion environment');
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
			api.fetchPromotionEnvironments.mockResolvedValue(environmentsOf(instanceConnection()));
			api.fetchPromotionEnvironment.mockRejectedValueOnce(
				new Error('Unable to load environment detail'),
			);
			renderView();

			expect(await screen.findByTestId('promotion-providers-load-error')).toBeInTheDocument();
		});

		it('shows the saved connection after a retry', async () => {
			api.fetchPromotionProviders
				.mockRejectedValueOnce(new Error('Unable to load providers'))
				.mockResolvedValue([summaryOf(sshProvider())]);
			mockSaved(instanceConnection());
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

			expect(api.fetchPromotionEnvironment).not.toHaveBeenCalled();
		});

		it('creates one environment for each enabled direction', async () => {
			const created = instanceConnection({
				configs: { apply: applyConfig('main'), promote: promoteConfig('develop') },
			});
			api.createPromotionEnvironment
				.mockResolvedValueOnce(applyOf(created))
				.mockResolvedValueOnce(promoteOf(created));
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

			await waitFor(() => expect(api.createPromotionEnvironment).toHaveBeenCalledTimes(2));
			const shared = {
				name: 'Production',
				scope: 'instance',
				providerId: 'provider-ssh',
				remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
			};
			expect(api.createPromotionEnvironment).toHaveBeenCalledWith(expect.anything(), {
				...shared,
				direction: 'apply',
				settings: { schemaVersion: 1, branchName: 'main' },
			});
			expect(api.createPromotionEnvironment).toHaveBeenCalledWith(expect.anything(), {
				...shared,
				direction: 'promote',
				settings: { schemaVersion: 1, baseBranchName: 'develop', createBranchOnPromotion: false },
			});
		});

		it('blocks the first save when no direction is enabled', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			await renderReadyView();

			await selectProvider('Production key');
			await fillConnectionBasics('Production', 'git@github.com:acme/workflows.git');
			const saveButton = within(screen.getByTestId('promotion-connection-save-bar')).getByRole(
				'button',
				{ name: /save settings/i },
			);

			expect(saveButton).toBeDisabled();
			await enableApply('main');
			expect(saveButton).toBeEnabled();
		});

		it('accepts an SSH URL without a username', async () => {
			api.createPromotionEnvironment.mockResolvedValue(
				applyOf(
					instanceConnection({
						remote: { schemaVersion: 1, remoteUrl: 'github.com:acme/workflows.git' },
					}),
				),
			);
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			await renderReadyView();

			await selectProvider('Production key');
			await fillConnectionBasics('Production', 'github.com:acme/workflows.git');
			await enableApply('main');
			await save();

			await waitFor(() => expect(api.createPromotionEnvironment).toHaveBeenCalled());
			expect(api.createPromotionEnvironment.mock.calls[0][1]).toMatchObject({
				remote: { schemaVersion: 1, remoteUrl: 'github.com:acme/workflows.git' },
			});
		});

		it('shows the save error and keeps the entered values', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			const refusal = new Error(
				'SSH key providers require an ssh:// or [user@]host:path remote URL',
			);
			api.createPromotionEnvironment.mockRejectedValueOnce(refusal);
			await renderReadyView();

			await selectProvider('Production key');
			await fillConnectionBasics('Production', 'https://github.com/acme/workflows.git');
			await enableApply('main');
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
			mockSaved(saved);
			await renderReadyView();

			expect(api.fetchPromotionEnvironment).toHaveBeenCalledWith(
				expect.anything(),
				'environment-apply',
			);
			expect(api.fetchPromotionEnvironment).toHaveBeenCalledWith(
				expect.anything(),
				'environment-promote',
			);
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
			mockUpdates(instanceConnection({ provider }));
			mockSaved(instanceConnection());
			await renderReadyView();

			await selectProvider('Mirror');
			await save();

			await waitFor(() =>
				expect(api.updatePromotionEnvironment).toHaveBeenCalledWith(
					expect.anything(),
					'environment-apply',
					{ providerId: 'provider-2' },
				),
			);
			expect(api.updatePromotionProvider).not.toHaveBeenCalled();
		});

		it('retries only the environment whose write failed', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			const saved = instanceConnection({
				configs: { apply: applyConfig('main'), promote: promoteConfig('main') },
			});
			const renamed = withShared(saved, { name: 'Renamed' });
			mockSaved(saved);
			api.updatePromotionEnvironment
				.mockRejectedValueOnce(new Error('git is unreachable'))
				.mockResolvedValueOnce(promoteOf(renamed))
				.mockResolvedValueOnce(applyOf(renamed));
			await renderReadyView();

			await userEvent.clear(screen.getByTestId('promotion-connection-name-input'));
			await userEvent.type(screen.getByTestId('promotion-connection-name-input'), 'Renamed');
			await save();

			const notice = await screen.findByTestId('promotion-connection-partial-save');
			expect(notice).toHaveTextContent('Apply settings');
			expect(notice).not.toHaveTextContent('Promote settings');
			expect(mockShowError).toHaveBeenCalled();
			expect(mockShowMessage).not.toHaveBeenCalled();

			await save();

			await waitFor(() =>
				expect(screen.queryByTestId('promotion-connection-partial-save')).not.toBeInTheDocument(),
			);
			expect(api.updatePromotionEnvironment).toHaveBeenCalledTimes(3);
			expect(api.updatePromotionEnvironment).toHaveBeenLastCalledWith(
				expect.anything(),
				'environment-apply',
				{ name: 'Renamed' },
			);
			expect(mockShowMessage).toHaveBeenCalled();
		});

		it('deletes Apply settings when Apply is turned off', async () => {
			api.fetchPromotionProviders.mockResolvedValue([summaryOf(sshProvider())]);
			mockSaved(instanceConnection());
			await renderReadyView();

			await userEvent.click(screen.getByTestId('promotion-connection-apply-toggle'));
			await save();

			await waitFor(() =>
				expect(api.deletePromotionEnvironment).toHaveBeenCalledWith(
					expect.anything(),
					'environment-apply',
				),
			);
		});
	});
});
