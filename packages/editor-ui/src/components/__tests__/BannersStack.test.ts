import { PiniaVuePlugin } from 'pinia';
import { render, within } from '@testing-library/vue';
import { merge } from 'lodash-es';
import userEvent from '@testing-library/user-event';

import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@/constants';

import { createTestingPinia } from '@pinia/testing';
import BannerStack from '@/components/banners/BannerStack.vue';
import { useUIStore } from '@/stores';

const uiStore = useUIStore();

const DEFAULT_SETUP = {
	pinia: createTestingPinia({
		initialState: {
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
		},
	}),
};

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(BannerStack, merge(DEFAULT_SETUP, renderOptions), (vue) => {
		vue.use(PiniaVuePlugin);
	});

describe('BannerStack', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should default configuration', async () => {
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
				initialState: merge(
					{
						[STORES.UI]: {
							banners: {
								V1: { dismissed: true },
								TRIAL: { dismissed: true },
							},
						},
					},
					DEFAULT_SETUP.pinia,
				),
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
		const closeTrialBannerButton = getByTestId('banners-TRIAL_OVER-close');
		expect(closeTrialBannerButton).toBeInTheDocument();
		await userEvent.click(closeTrialBannerButton);
		expect(uiStore.dismissBanner).toHaveBeenCalledWith('TRIAL_OVER');
	});
});
