import merge from 'lodash/merge';
import userEvent from '@testing-library/user-event';

import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { ROLE } from '@n8n/api-types';
import { STORES } from '@n8n/stores';

import { createTestingPinia } from '@pinia/testing';
import BannerStack from './BannerStack.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { useBannersStore } from '@/stores/banners.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import DynamicBanner from './banners/DynamicBanner.vue';
import type { Component } from 'vue';
import { markRaw } from 'vue';

let bannersStore: ReturnType<typeof useBannersStore>;

const initialState = {
	[STORES.SETTINGS]: {
		settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
	},
	[STORES.BANNERS]: {
		bannerStack: ['TRIAL_OVER', 'V1', 'NON_PRODUCTION_LICENSE', 'EMAIL_CONFIRMATION'],
		dynamicBanners: [],
		dynamicBannersMap: {},
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

const defaultRenderOptions: RenderOptions<typeof BannerStack> = {
	pinia: createTestingPinia({ initialState }),
};

const renderComponent = createComponentRenderer(BannerStack, defaultRenderOptions);

describe('BannerStack', () => {
	beforeEach(() => {
		bannersStore = useBannersStore();
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
		const dismissBannerSpy = vi
			.spyOn(bannersStore, 'dismissBanner')
			.mockImplementation(async () => {});
		expect(getByTestId('banners-V1')).toBeInTheDocument();
		const closeTrialBannerButton = getByTestId('banner-V1-close');
		expect(closeTrialBannerButton).toBeInTheDocument();
		await userEvent.click(closeTrialBannerButton);
		expect(dismissBannerSpy).toHaveBeenCalledWith('V1', 'temporary');
	});

	it('should permanently dismiss banner on click', async () => {
		const { getByTestId } = renderComponent();
		const dismissBannerSpy = vi
			.spyOn(bannersStore, 'dismissBanner')
			.mockImplementation(async () => {});

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
					[STORES.BANNERS]: {
						bannerStack: ['EMAIL_CONFIRMATION'],
						dynamicBanners: [],
						dynamicBannersMap: {},
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
					[STORES.BANNERS]: {
						bannerStack: ['EMAIL_CONFIRMATION'],
						dynamicBanners: [],
						dynamicBannersMap: {},
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
					[STORES.BANNERS]: {
						bannerStack: [],
						dynamicBanners: [],
						dynamicBannersMap: {},
					},
				},
			}),
		});
		expect(queryByTestId('banner-stack')).toBeEmptyDOMElement();
	});

	it('should render dynamic banner when present in banner stack', () => {
		const dynamicBannerId = 'dynamic-banner-test-123';
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					...initialState,
					[STORES.BANNERS]: {
						bannerStack: [dynamicBannerId],
						dynamicBanners: [
							{
								id: dynamicBannerId,
								priority: 200,
								content: '**Test Dynamic Banner** - This is a test',
								theme: 'info' as const,
								isDismissible: true,
								component: markRaw(DynamicBanner as Component),
							},
						],
						dynamicBannersMap: {
							[dynamicBannerId]: {
								id: dynamicBannerId,
								priority: 200,
								content: '**Test Dynamic Banner** - This is a test',
								theme: 'info' as const,
								isDismissible: true,
								component: markRaw(DynamicBanner as Component),
							},
						},
					},
				},
			}),
		});

		expect(getByTestId('banner-stack')).toBeInTheDocument();
		expect(getByTestId(`banners-${dynamicBannerId}`)).toBeInTheDocument();
	});

	it('should pass correct props to dynamic banner component', () => {
		const dynamicBannerId = 'dynamic-banner-props-test';
		const bannerContent = '**Important** - Test content with *markdown*';
		const bannerTheme = 'warning' as const;
		const bannerIsDismissible = false;

		const { container, getByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					...initialState,
					[STORES.BANNERS]: {
						bannerStack: [dynamicBannerId],
						dynamicBanners: [
							{
								id: dynamicBannerId,
								priority: 200,
								content: bannerContent,
								theme: bannerTheme,
								isDismissible: bannerIsDismissible,
								component: markRaw(DynamicBanner as Component),
							},
						],
						dynamicBannersMap: {
							[dynamicBannerId]: {
								id: dynamicBannerId,
								priority: 200,
								content: bannerContent,
								theme: bannerTheme,
								isDismissible: bannerIsDismissible,
								component: markRaw(DynamicBanner as Component),
							},
						},
					},
				},
			}),
		});

		const banner = getByTestId(`banners-${dynamicBannerId}`);
		expect(banner).toBeInTheDocument();

		// Verify content is rendered (checking for the word "Important" from the markdown)
		expect(container.textContent).toContain('Important');
		expect(container.textContent).toContain('Test content with');
		expect(container.textContent).toContain('markdown');

		// Verify banner is not dismissible (no close button should be present)
		const closeButton = container.querySelector(
			'[data-test-id="banner-dynamic-banner-props-test-close"]',
		);
		expect(closeButton).not.toBeInTheDocument();
	});

	it('should render dynamic banner with highest priority over static banners', () => {
		const dynamicBannerId = 'dynamic-banner-high-priority';
		const { getByTestId, queryByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					...initialState,
					[STORES.BANNERS]: {
						bannerStack: ['V1', dynamicBannerId],
						dynamicBanners: [
							{
								id: dynamicBannerId,
								priority: 500, // Higher than V1 (350)
								content: '**High Priority Dynamic Banner** - This should be shown',
								theme: 'warning' as const,
								isDismissible: true,
								component: markRaw(DynamicBanner as Component),
							},
						],
						dynamicBannersMap: {
							[dynamicBannerId]: {
								id: dynamicBannerId,
								priority: 500,
								content: '**High Priority Dynamic Banner** - This should be shown',
								theme: 'warning' as const,
								isDismissible: true,
								component: markRaw(DynamicBanner as Component),
							},
						},
					},
				},
			}),
		});

		// Dynamic banner should be visible due to higher priority
		expect(getByTestId(`banners-${dynamicBannerId}`)).toBeInTheDocument();
		// V1 banner should not be visible
		expect(queryByTestId('banners-V1')).not.toBeInTheDocument();
	});

	it('should render static banner when it has higher priority than dynamic banner', () => {
		const dynamicBannerId = 'dynamic-banner-low-priority';
		const { getByTestId, queryByTestId } = renderComponent({
			pinia: createTestingPinia({
				initialState: {
					...initialState,
					[STORES.BANNERS]: {
						bannerStack: ['V1', dynamicBannerId],
						dynamicBanners: [
							{
								id: dynamicBannerId,
								priority: 100, // Lower than V1 (350)
								content: '**Low Priority Dynamic Banner** - This should not be shown',
								theme: 'info' as const,
								isDismissible: true,
								component: markRaw(DynamicBanner as Component),
							},
						],
						dynamicBannersMap: {
							[dynamicBannerId]: {
								id: dynamicBannerId,
								priority: 100,
								content: '**Low Priority Dynamic Banner** - This should not be shown',
								theme: 'info' as const,
								isDismissible: true,
								component: markRaw(DynamicBanner as Component),
							},
						},
					},
				},
			}),
		});

		// V1 banner should be visible due to higher priority
		expect(getByTestId('banners-V1')).toBeInTheDocument();
		// Dynamic banner should not be visible
		expect(queryByTestId(`banners-${dynamicBannerId}`)).not.toBeInTheDocument();
	});
});
