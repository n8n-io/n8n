import { within } from '@testing-library/vue';
import { merge } from 'lodash-es';
import userEvent from '@testing-library/user-event';

import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@/constants';

import { createTestingPinia } from '@pinia/testing';
import BannerStack from '@/components/banners/BannerStack.vue';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';

let uiStore: ReturnType<typeof useUIStore>;
let usersStore: ReturnType<typeof useUsersStore>;

const initialState = {
	[STORES.SETTINGS]: {
		settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
	},
	[STORES.UI]: {
		banners: {
			V1: { dismissed: false },
			TRIAL: { dismissed: false },
			TRIAL_OVER: { dismissed: false },
		},
	},
	[STORES.USERS]: {
		currentUserId: 'aaa-bbb',
		users: {
			'aaa-bbb': {
				id: 'aaa-bbb',
				globalRole: {
					id: '1',
					name: 'owner',
					scope: 'global',
				},
			},
			'bbb-bbb': {
				id: 'bbb-bbb',
				globalRoleId: 2,
				globalRole: {
					id: '2',
					name: 'member',
					scope: 'global',
				},
			},
		},
	},
};

const defaultRenderOptions: RenderOptions = {
	pinia: createTestingPinia({ initialState }),
};

const renderComponent = createComponentRenderer(BannerStack, defaultRenderOptions);

describe('BannerStack', () => {
	beforeEach(() => {
		uiStore = useUIStore();
		usersStore = useUsersStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render default configuration', async () => {
		const { getByTestId } = renderComponent();

		const bannerStack = getByTestId('banner-stack');
		expect(bannerStack).toBeInTheDocument();

		expect(within(bannerStack).getByTestId('banners-TRIAL')).toBeInTheDocument();
		expect(within(bannerStack).getByTestId('banners-TRIAL_OVER')).toBeInTheDocument();
		expect(within(bannerStack).getByTestId('banners-V1')).toBeInTheDocument();
	});

	it('should not render dismissed banners', async () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: merge(initialState, {
					[STORES.UI]: {
						banners: {
							V1: { dismissed: true },
							TRIAL: { dismissed: true },
						},
					},
				}),
			}),
		});

		const bannerStack = getByTestId('banner-stack');
		expect(bannerStack).toBeInTheDocument();

		expect(within(bannerStack).queryByTestId('banners-V1')).not.toBeInTheDocument();
		expect(within(bannerStack).queryByTestId('banners-TRIAL')).not.toBeInTheDocument();
		expect(within(bannerStack).getByTestId('banners-TRIAL_OVER')).toBeInTheDocument();
	});

	it('should dismiss banner on click', async () => {
		const { getByTestId } = renderComponent();
		const dismissBannerSpy = vi
			.spyOn(useUIStore(), 'dismissBanner')
			.mockImplementation(async (banner, mode) => {});
		const closeTrialBannerButton = getByTestId('banner-TRIAL_OVER-close');
		expect(closeTrialBannerButton).toBeInTheDocument();
		await userEvent.click(closeTrialBannerButton);
		expect(dismissBannerSpy).toHaveBeenCalledWith('TRIAL_OVER');
	});

	it('should permanently dismiss banner on click', async () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: merge(initialState, {
					[STORES.UI]: {
						banners: {
							V1: { dismissed: false },
						},
					},
				}),
			}),
		});
		const dismissBannerSpy = vi
			.spyOn(useUIStore(), 'dismissBanner')
			.mockImplementation(async (banner, mode) => {});

		const permanentlyDismissBannerLink = getByTestId('banner-confirm-v1');
		expect(permanentlyDismissBannerLink).toBeInTheDocument();
		await userEvent.click(permanentlyDismissBannerLink);
		expect(dismissBannerSpy).toHaveBeenCalledWith('V1', 'permanent');
	});

	it('should not render permanent dismiss link if user is not owner', async () => {
		const { queryByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: merge(initialState, {
					[STORES.USERS]: {
						currentUserId: 'bbb-bbb',
					},
				}),
			}),
		});
		expect(queryByTestId('banner-confirm-v1')).not.toBeInTheDocument();
	});
});
