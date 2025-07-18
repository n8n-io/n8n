import merge from 'lodash/merge';
import userEvent from '@testing-library/user-event';

import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { ROLE } from '@n8n/api-types';
import { STORES } from '@n8n/stores';

import { createTestingPinia } from '@pinia/testing';
import BannerStack from '@/components/banners/BannerStack.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';

let uiStore: ReturnType<typeof useUIStore>;

const initialState = {
	[STORES.SETTINGS]: {
		settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
	},
	[STORES.UI]: {
		bannerStack: ['TRIAL_OVER', 'V1', 'NON_PRODUCTION_LICENSE', 'EMAIL_CONFIRMATION'],
	},
	[STORES.USERS]: {
		currentUserId: 'aaa-bbb',
		usersById: {
			'aaa-bbb': {
				id: 'aaa-bbb',
				role: ROLE.Owner,
			},
			'bbb-bbb': {
				id: 'bbb-bbb',
				role: ROLE.Member,
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
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render banner with the highest priority', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		const bannerStack = getByTestId('banner-stack');
		expect(bannerStack).toBeInTheDocument();
		// Only V1 banner should be visible
		expect(getByTestId('banners-V1')).toBeInTheDocument();
		expect(queryByTestId('banners-TRIAL_OVER')).not.toBeInTheDocument();
	});

	it('should dismiss banner on click', async () => {
		const { getByTestId } = renderComponent();
		const dismissBannerSpy = vi.spyOn(uiStore, 'dismissBanner').mockImplementation(async () => {});
		expect(getByTestId('banners-V1')).toBeInTheDocument();
		const closeTrialBannerButton = getByTestId('banner-V1-close');
		expect(closeTrialBannerButton).toBeInTheDocument();
		await userEvent.click(closeTrialBannerButton);
		expect(dismissBannerSpy).toHaveBeenCalledWith('V1');
	});

	it('should permanently dismiss banner on click', async () => {
		const { getByTestId } = renderComponent();
		const dismissBannerSpy = vi.spyOn(uiStore, 'dismissBanner').mockImplementation(async () => {});

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

	it('should send email confirmation request from the banner', async () => {
		const { getByTestId, getByText } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					...initialState,
					[STORES.UI]: {
						bannerStack: ['EMAIL_CONFIRMATION'],
					},
				},
			}),
		});
		const confirmEmailSpy = vi.spyOn(useUsersStore(), 'sendConfirmationEmail');
		getByTestId('confirm-email-button').click();
		await waitFor(() => expect(confirmEmailSpy).toHaveBeenCalled());
		await waitFor(() => {
			expect(getByText('Confirmation email sent')).toBeInTheDocument();
		});
	});

	it('should show error message if email confirmation fails', async () => {
		const ERROR_MESSAGE = 'Something went wrong';
		const { getByTestId, getByText } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					...initialState,
					[STORES.UI]: {
						bannerStack: ['EMAIL_CONFIRMATION'],
					},
				},
			}),
		});
		const confirmEmailSpy = vi
			.spyOn(useUsersStore(), 'sendConfirmationEmail')
			.mockImplementation(() => {
				throw new Error(ERROR_MESSAGE);
			});
		getByTestId('confirm-email-button').click();
		await waitFor(() => expect(confirmEmailSpy).toHaveBeenCalled());
		await waitFor(() => {
			expect(getByText(ERROR_MESSAGE)).toBeInTheDocument();
		});
	});

	it('should render empty banner stack when there are no banners to display', async () => {
		const { queryByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					...initialState,
					[STORES.UI]: {
						bannerStack: [],
					},
				},
			}),
		});
		expect(queryByTestId('banner-stack')).toBeEmptyDOMElement();
	});
});
