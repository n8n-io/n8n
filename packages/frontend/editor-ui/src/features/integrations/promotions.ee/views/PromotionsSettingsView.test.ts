import { createTestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CONFIRM } from '@/app/constants';
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
}));

vi.mock('../promotionsSettings.api', () => api);

const mockConfirm = vi.fn();

vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
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
		createTestingPinia();
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
});
