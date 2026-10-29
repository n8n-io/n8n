import type { PromotionRepository } from '@n8n/api-types';
import type { IUser } from '@n8n/rest-api-client';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { usePromotionCheckout } from '../composables/usePromotionCheckout';
import {
	PROMOTIONS_ENVIRONMENT_ADD_VIEW,
	PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
	PROMOTIONS_SETTINGS_VIEW,
} from '../promotions.constants';
import type * as PromotionsApi from '../promotionsSettings.api';
import type { PromotionEnvironment } from '../promotionsSettings.api';
import PromotionEnvironmentView from './PromotionEnvironmentView.vue';

const api = vi.hoisted(() => ({
	fetchPromotionEnvironments: vi.fn<typeof PromotionsApi.fetchPromotionEnvironments>(),
	fetchPromotionEnvironment: vi.fn<typeof PromotionsApi.fetchPromotionEnvironment>(),
	createPromotionEnvironment: vi.fn<typeof PromotionsApi.createPromotionEnvironment>(),
	updatePromotionEnvironment: vi.fn<typeof PromotionsApi.updatePromotionEnvironment>(),
	connectPromotionCheckout: vi.fn<typeof PromotionsApi.connectPromotionCheckout>(),
	createPromotionProvider: vi.fn<typeof PromotionsApi.createPromotionProvider>(),
	deleteProviderIfUnused: vi.fn<typeof PromotionsApi.deleteProviderIfUnused>(),
	fetchPromotionRepositories: vi.fn<typeof PromotionsApi.fetchPromotionRepositories>(),
	fetchPromotionBranches: vi.fn<typeof PromotionsApi.fetchPromotionBranches>(),
}));

vi.mock('../promotionsSettings.api', () => api);

const mockShowMessage = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: mockShowMessage }),
}));

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const gitProvider = {
	id: 'provider-git',
	name: 'Company Git',
	type: 'git' as const,
	authType: 'ssh-key' as const,
	...timestamps,
};

const applyEnvironment = (overrides: Partial<PromotionEnvironment> = {}): PromotionEnvironment =>
	({
		id: 'environment-apply',
		name: 'Development',
		scope: 'instance',
		direction: 'apply',
		remote: { schemaVersion: 1, remoteUrl: 'git@git.example.com:team/workflows.git' },
		provider: gitProvider,
		settings: { schemaVersion: 1, branchName: 'main' },
		checkout: { hasCheckout: true, matchesEnvironment: true },
		...timestamps,
		...overrides,
	}) as PromotionEnvironment;

const repository: PromotionRepository = {
	id: '42',
	name: 'Workflows',
	fullPath: 'team/workflows',
	remoteUrl: 'https://gitlab.example.com/team/workflows.git',
	defaultBranch: 'develop',
};

const renderRouterView = createComponentRenderer(RouterView);

const renderAt = async (path: string) => {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/', name: PROMOTIONS_SETTINGS_VIEW, component: { render: () => null } },
			{
				path: '/add/:direction',
				name: PROMOTIONS_ENVIRONMENT_ADD_VIEW,
				component: PromotionEnvironmentView,
				props: true,
			},
			{
				path: '/edit/:environmentId',
				name: PROMOTIONS_ENVIRONMENT_EDIT_VIEW,
				component: PromotionEnvironmentView,
				props: true,
			},
		],
	});
	await router.push(path);
	renderRouterView({ global: { plugins: [router] } });
	return router;
};

const allowClone = () => {
	mockedStore(useUsersStore).currentUser = mock<IUser>({ globalScopes: ['gitConnection:clone'] });
};

const fillInput = async (testId: string, value: string) => {
	const element = await screen.findByTestId(testId);
	const input = within(element).queryByRole('textbox') ?? element;
	await userEvent.clear(input);
	await userEvent.type(input, value);
};

describe('PromotionEnvironmentView', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		createTestingPinia();
		usePromotionCheckout().connectErrors.clear();
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		api.deleteProviderIfUnused.mockResolvedValue(undefined);
	});

	it('reuses the provider of the other environment when the provider type matches', async () => {
		const gitlabProvider = { ...gitProvider, id: 'provider-gitlab', type: 'gitlab' as const };
		api.fetchPromotionEnvironments.mockResolvedValue([
			applyEnvironment({ provider: gitlabProvider }),
		]);
		api.fetchPromotionRepositories.mockResolvedValue({ data: [repository], nextCursor: null });
		api.fetchPromotionBranches.mockResolvedValue({ data: [], nextCursor: null });
		api.createPromotionEnvironment.mockResolvedValue(applyEnvironment());
		await renderAt('/add/promote');

		await userEvent.click(await screen.findByTestId('promotion-provider-type-gitlab'));
		await fillInput('promotion-environment-name-input', 'Production');
		const repositorySelect = screen.getByTestId('promotion-environment-repository-select');
		await userEvent.click(within(repositorySelect).getByRole('combobox'));
		await userEvent.click(await screen.findByText('team/workflows'));
		await userEvent.click(screen.getByTestId('promotion-environment-save'));

		await waitFor(() =>
			expect(api.createPromotionEnvironment).toHaveBeenCalledWith(expect.anything(), {
				name: 'Production',
				scope: 'instance',
				providerId: 'provider-gitlab',
				remote: { schemaVersion: 1, remoteUrl: repository.remoteUrl },
				direction: 'promote',
				settings: { schemaVersion: 1, baseBranchName: 'develop', createBranchOnPromotion: false },
			}),
		);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('deletes the provider it created when the user leaves without saving', async () => {
		api.createPromotionProvider.mockResolvedValue({
			provider: { ...gitProvider, id: 'provider-new', config: { schemaVersion: 1 } },
			publicKey: 'ssh-ed25519 NEW-KEY',
		});
		const router = await renderAt('/add/apply');

		await userEvent.click(await screen.findByTestId('promotion-provider-type-git'));
		await fillInput('promotion-provider-name-input', 'Company Git');
		await userEvent.click(screen.getByTestId('promotion-provider-save-button'));
		await userEvent.click(await screen.findByTestId('promotion-provider-done-button'));
		await userEvent.click(await screen.findByTestId('promotion-environment-cancel'));

		await waitFor(() => expect(router.currentRoute.value.name).toBe(PROMOTIONS_SETTINGS_VIEW));
		expect(api.deleteProviderIfUnused).toHaveBeenCalledWith(expect.anything(), 'provider-new');
	});

	it('keeps the environment and remembers the connect error for the overview when the first connect fails', async () => {
		allowClone();
		api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment()]);
		api.createPromotionEnvironment.mockResolvedValue(
			applyEnvironment({
				id: 'environment-promote',
				checkout: { hasCheckout: false, matchesEnvironment: false },
			}),
		);
		api.connectPromotionCheckout.mockRejectedValue(new Error('Permission denied (publickey)'));
		const router = await renderAt('/add/promote');

		await userEvent.click(await screen.findByTestId('promotion-provider-type-git'));
		await fillInput('promotion-environment-name-input', 'Production');
		await userEvent.click(screen.getByTestId('promotion-environment-save'));

		await waitFor(() => expect(router.currentRoute.value.name).toBe(PROMOTIONS_SETTINGS_VIEW));
		expect(api.createPromotionEnvironment).toHaveBeenCalledTimes(1);
		expect(mockShowMessage).not.toHaveBeenCalled();
		expect(usePromotionCheckout().connectErrors.get('environment-promote')).toBe(
			'Permission denied (publickey)',
		);
	});

	it('saves the environment when the user presses Enter in a text field', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment()]);
		api.createPromotionEnvironment.mockResolvedValue(applyEnvironment());
		await renderAt('/add/promote');

		await userEvent.click(await screen.findByTestId('promotion-provider-type-git'));
		await fillInput('promotion-environment-name-input', 'Production{Enter}');

		await waitFor(() => expect(api.createPromotionEnvironment).toHaveBeenCalledTimes(1));
	});

	it('keeps the branch when the user picks the same GitLab repository again', async () => {
		const gitlabProvider = { ...gitProvider, id: 'provider-gitlab', type: 'gitlab' as const };
		api.fetchPromotionEnvironment.mockResolvedValue(
			applyEnvironment({
				provider: gitlabProvider,
				remote: {
					schemaVersion: 1,
					remoteUrl: repository.remoteUrl,
					repositoryPath: repository.fullPath,
				},
				settings: { schemaVersion: 1, branchName: 'release' },
			}),
		);
		api.fetchPromotionRepositories.mockResolvedValue({ data: [repository], nextCursor: null });
		api.fetchPromotionBranches.mockResolvedValue({ data: [], nextCursor: null });
		api.updatePromotionEnvironment.mockResolvedValue(applyEnvironment());
		await renderAt('/edit/environment-apply');

		const repositorySelect = await screen.findByTestId('promotion-environment-repository-select');
		await userEvent.click(within(repositorySelect).getByRole('combobox'));
		await userEvent.click(await screen.findByRole('option', { name: 'team/workflows' }));
		await userEvent.click(screen.getByTestId('promotion-environment-save'));

		await waitFor(() =>
			expect(api.updatePromotionEnvironment).toHaveBeenCalledWith(
				expect.anything(),
				'environment-apply',
				expect.objectContaining({ settings: { schemaVersion: 1, branchName: 'release' } }),
			),
		);
	});

	it('saves a changed branch and connects again', async () => {
		allowClone();
		api.fetchPromotionEnvironment.mockResolvedValue(applyEnvironment());
		api.updatePromotionEnvironment.mockResolvedValue(
			applyEnvironment({ checkout: { hasCheckout: true, matchesEnvironment: false } }),
		);
		api.connectPromotionCheckout.mockResolvedValue({ hasCheckout: true } as Awaited<
			ReturnType<typeof PromotionsApi.connectPromotionCheckout>
		>);
		await renderAt('/edit/environment-apply');

		await fillInput('promotion-environment-branch-input', 'release');
		await userEvent.click(screen.getByTestId('promotion-environment-save'));

		await waitFor(() =>
			expect(api.connectPromotionCheckout).toHaveBeenCalledWith(
				expect.anything(),
				'environment-apply',
			),
		);
		expect(api.updatePromotionEnvironment).toHaveBeenCalledWith(
			expect.anything(),
			'environment-apply',
			{ name: 'Development', settings: { schemaVersion: 1, branchName: 'release' } },
		);
	});
});
