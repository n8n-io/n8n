import type { IUser } from '@n8n/rest-api-client';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import {
	getPreferences,
	updatePreferences,
} from '@/features/integrations/sourceControl.ee/sourceControl.api';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { SourceControlPreferences } from '@/features/integrations/sourceControl.ee/sourceControl.types';
import {
	invalidateInstancePromotionConnection,
	useInstancePromotionConnection,
} from '../composables/useInstancePromotionConnection';
import type * as PromotionsApi from '../promotionsSettings.api';
import type { PromotionEnvironment } from '../promotionsSettings.api';
import PromotionsSettingsView from './PromotionsSettingsView.vue';

const api = vi.hoisted(() => ({
	fetchPromotionEnvironments: vi.fn<typeof PromotionsApi.fetchPromotionEnvironments>(),
	fetchPromotionEnvironment: vi.fn<typeof PromotionsApi.fetchPromotionEnvironment>(),
	deletePromotionEnvironment: vi.fn<typeof PromotionsApi.deletePromotionEnvironment>(),
	deleteProviderIfUnused: vi.fn<typeof PromotionsApi.deleteProviderIfUnused>(),
	connectPromotionCheckout: vi.fn<typeof PromotionsApi.connectPromotionCheckout>(),
}));

vi.mock('../promotionsSettings.api', () => api);
vi.mock('@/features/integrations/sourceControl.ee/sourceControl.api');

const mockConfirm = vi.fn();

vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('vue-router', async () => ({
	...(await vi.importActual<object>('vue-router')),
	useRouter: () => ({ push: vi.fn() }),
}));

const timestamps = {
	createdAt: '2026-09-01T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};

const applyEnvironment: PromotionEnvironment = {
	id: 'environment-apply',
	name: 'Development',
	scope: 'instance',
	direction: 'apply',
	remote: { schemaVersion: 1, remoteUrl: 'git@github.com:acme/workflows.git' },
	provider: {
		id: 'provider-ssh',
		name: 'Company Git',
		type: 'git',
		authType: 'ssh-key',
		...timestamps,
	},
	settings: { schemaVersion: 1, branchName: 'main' },
	checkout: { hasCheckout: true, matchesEnvironment: true },
	...timestamps,
};

const renderView = createComponentRenderer(PromotionsSettingsView);

describe('PromotionsSettingsView', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		invalidateInstancePromotionConnection();
		createTestingPinia({ stubActions: false });
	});

	it('removes the environment, then its provider, then refreshes the cached environments', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([applyEnvironment]);
		api.fetchPromotionEnvironment.mockResolvedValue(applyEnvironment);
		mockConfirm.mockResolvedValue(MODAL_CONFIRM);
		const cachedEnvironments = useInstancePromotionConnection();
		await cachedEnvironments.load();
		renderView();

		const card = await screen.findByTestId('promotion-environment-card-apply');
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		await userEvent.click(
			within(within(card).getByTestId('promotion-environment-menu')).getByRole('button'),
		);
		await userEvent.click(await screen.findByTestId('action-remove'));

		expect(await screen.findByTestId('promotion-environment-add-apply')).toBeInTheDocument();
		// A plain Git environment has no promotion reviews to close.
		expect(mockConfirm).toHaveBeenCalledWith(
			expect.not.stringContaining('promotion reviews'),
			expect.anything(),
			expect.anything(),
		);
		expect(api.deletePromotionEnvironment).toHaveBeenCalledWith(
			expect.anything(),
			'environment-apply',
		);
		expect(api.deleteProviderIfUnused).toHaveBeenCalledWith(expect.anything(), 'provider-ssh');
		expect(api.deletePromotionEnvironment.mock.invocationCallOrder[0]).toBeLessThan(
			api.deleteProviderIfUnused.mock.invocationCallOrder[0],
		);
		await cachedEnvironments.load();
		expect(cachedEnvironments.hasApplyConfig.value).toBe(false);
	});

	it.each([
		{
			direction: 'promote' as const,
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true },
			message: 'open promotion reviews close in n8n',
		},
		{
			direction: 'apply' as const,
			settings: applyEnvironment.settings,
			message: 'If no other environment uses the same provider',
		},
	])(
		'only mentions promotion reviews when it removes a Promote environment on a Git host: $direction',
		async ({ direction, settings, message }) => {
			const gitlabEnvironment = {
				...applyEnvironment,
				id: `environment-${direction}`,
				direction,
				settings,
				provider: { ...applyEnvironment.provider, type: 'gitlab', authType: 'token' },
			} as PromotionEnvironment;
			api.fetchPromotionEnvironments.mockResolvedValue([gitlabEnvironment]);
			api.fetchPromotionEnvironment.mockResolvedValue(gitlabEnvironment);
			mockConfirm.mockResolvedValue(MODAL_CANCEL);
			renderView();

			const card = await screen.findByTestId(`promotion-environment-card-${direction}`);
			await userEvent.click(
				within(within(card).getByTestId('promotion-environment-menu')).getByRole('button'),
			);
			await userEvent.click(await screen.findByTestId('action-remove'));

			await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
			const [shown] = mockConfirm.mock.calls[0];
			expect(shown).toContain(message);
			if (direction === 'apply') expect(shown).not.toContain('promotion reviews');
			expect(api.deletePromotionEnvironment).not.toHaveBeenCalled();
		},
	);

	it('offers no switch back while no v1 repository is connected', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		useRBACStore().setGlobalScopes(['sourceControl:manage']);
		const sourceControlStore = useSourceControlStore();
		vi.mocked(getPreferences).mockResolvedValue({
			...sourceControlStore.preferences,
			connected: false,
		});
		renderView();

		const toggle = await screen.findByRole('switch', { name: 'Protected instance' });
		await waitFor(() => expect(toggle).toBeEnabled());
		expect(screen.queryByTestId('promotions-switch-to-v1')).not.toBeInTheDocument();
	});

	it('switches the instance back to Environments v1 after confirmation', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		mockConfirm.mockResolvedValue(MODAL_CONFIRM);
		useRBACStore().setGlobalScopes(['sourceControl:manage']);
		const sourceControlStore = useSourceControlStore();
		vi.mocked(getPreferences).mockResolvedValue({
			...sourceControlStore.preferences,
			connected: true,
		});
		vi.mocked(updatePreferences).mockResolvedValue({
			...sourceControlStore.preferences,
			connected: true,
			environmentsVersion: 'v1',
		});
		renderView();

		await userEvent.click(await screen.findByTestId('promotions-switch-to-v1'));

		expect(mockConfirm).toHaveBeenCalledWith(expect.anything(), 'Switch back?', expect.anything());
		await waitFor(() =>
			expect(updatePreferences).toHaveBeenCalledWith(expect.anything(), {
				environmentsVersion: 'v1',
			}),
		);
	});

	it('keeps each card busy until its own retry finishes', async () => {
		mockedStore(useUsersStore).currentUser = mock<IUser>({ globalScopes: ['promotions:connect'] });
		const notConnected = { hasCheckout: false, matchesEnvironment: false };
		const promoteEnvironment = {
			...applyEnvironment,
			id: 'environment-promote',
			direction: 'promote',
			settings: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: false },
			checkout: notConnected,
		} as PromotionEnvironment;
		const environments = [{ ...applyEnvironment, checkout: notConnected }, promoteEnvironment];
		api.fetchPromotionEnvironments.mockResolvedValue(environments);
		api.fetchPromotionEnvironment.mockImplementation(
			async (_, id) => environments.find((environment) => environment.id === id)!,
		);
		let finishApply = () => {};
		api.connectPromotionCheckout
			.mockImplementationOnce(
				async () =>
					await new Promise((resolve) => {
						finishApply = () => resolve(mock());
					}),
			)
			.mockResolvedValueOnce(mock());
		renderView();

		const applyCard = await screen.findByTestId('promotion-environment-card-apply');
		const promoteCard = screen.getByTestId('promotion-environment-card-promote');
		await userEvent.click(within(applyCard).getByTestId('promotion-environment-retry'));
		await userEvent.click(within(promoteCard).getByTestId('promotion-environment-retry'));

		const applyMenu = within(within(applyCard).getByTestId('promotion-environment-menu')).getByRole(
			'button',
		);
		const promoteMenu = within(
			within(promoteCard).getByTestId('promotion-environment-menu'),
		).getByRole('button');
		await waitFor(() => expect(promoteMenu).toBeEnabled());
		expect(applyMenu).toBeDisabled();
		finishApply();
		await waitFor(() => expect(applyMenu).toBeEnabled());
	});

	it('allows a toggle only after the current protection state loads, and saves branchReadOnly only', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		const sourceControlStore = useSourceControlStore();
		const preferences = Promise.withResolvers<SourceControlPreferences>();
		vi.mocked(getPreferences).mockReturnValue(preferences.promise);
		vi.mocked(updatePreferences).mockResolvedValue({
			...sourceControlStore.preferences,
			branchReadOnly: false,
		});
		renderView();

		const toggle = await screen.findByRole('switch', { name: 'Protected instance' });
		expect(toggle).toBeDisabled();
		preferences.resolve({ ...sourceControlStore.preferences, branchReadOnly: true });
		await waitFor(() => expect(toggle).toBeEnabled());
		expect(toggle).toBeChecked();
		await userEvent.click(toggle);

		expect(updatePreferences).toHaveBeenCalledWith(expect.anything(), { branchReadOnly: false });
		expect(sourceControlStore.preferences.branchReadOnly).toBe(false);
		expect(toggle).not.toBeChecked();
	});

	it('keeps the protection state when saving fails', async () => {
		api.fetchPromotionEnvironments.mockResolvedValue([]);
		const sourceControlStore = useSourceControlStore();
		vi.mocked(getPreferences).mockResolvedValue({
			...sourceControlStore.preferences,
			branchReadOnly: true,
		});
		vi.mocked(updatePreferences).mockRejectedValue(new Error('Request failed'));
		renderView();

		const toggle = await screen.findByRole('switch', { name: 'Protected instance' });
		await waitFor(() => expect(toggle).toBeChecked());
		await userEvent.click(toggle);

		expect(updatePreferences).toHaveBeenCalled();
		expect(sourceControlStore.preferences.branchReadOnly).toBe(true);
		expect(toggle).toBeChecked();
	});
});
