import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import BannerStack from '../BannerStack.vue';
import RecoveryModeBanner from './RecoveryModeBanner.vue';
import { createPinia, setActivePinia } from 'pinia';
import merge from 'lodash/merge';

const renderComponent = createComponentRenderer(RecoveryModeBanner);
const renderBannerStack = createComponentRenderer(BannerStack);

describe('RecoveryModeBanner', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should render recovery mode message as a non-dismissible banner', () => {
		const { getByTestId, container, queryByTestId } = renderComponent();

		expect(getByTestId('banners-RECOVERY_MODE')).toBeInTheDocument();
		expect(container.textContent).toContain('N8N_RECOVERY_MODE');
		expect(queryByTestId('banner-RECOVERY_MODE-close')).not.toBeInTheDocument();
	});

	it('should render recovery mode banner above all other static banners and keep it non-dismissible', () => {
		const { getByTestId, queryByTestId } = renderBannerStack({
			pinia: createTestingPinia({
				initialState: {
					[STORES.SETTINGS]: {
						settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
					},
					[STORES.BANNERS]: {
						bannerStack: ['V1', 'RECOVERY_MODE', 'TRIAL_OVER'],
						dynamicBanners: [],
						dynamicBannersMap: {},
					},
				},
			}),
		});

		expect(getByTestId('banners-RECOVERY_MODE')).toBeInTheDocument();
		expect(queryByTestId('banners-V1')).not.toBeInTheDocument();
		expect(queryByTestId('banner-RECOVERY_MODE-close')).not.toBeInTheDocument();
	});
});
