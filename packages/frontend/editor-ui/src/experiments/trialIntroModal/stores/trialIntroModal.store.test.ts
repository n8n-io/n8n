import { EXPERIMENTS_TO_TRACK, TRIAL_INTRO_MODAL_EXPERIMENT } from '@/app/constants/experiments';
import type { Cloud } from '@n8n/rest-api-client/api/cloudPlans';
import { getUpgradeOffer } from '@n8n/rest-api-client/api/cloudPlans';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { STORES } from '@n8n/stores';
import { createPinia, setActivePinia } from 'pinia';

const featureFlagProperty = `$feature/${TRIAL_INTRO_MODAL_EXPERIMENT.name}`;

const mockTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTrack,
	}),
}));

const mockGetVariant = vi.fn();
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
	}),
}));

const restApiContextMock = { baseUrl: 'https://example.com/rest', pushRef: 'push-ref' };
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: restApiContextMock,
	}),
}));

vi.mock('@n8n/rest-api-client/api/users', () => ({
	updateCurrentUserSettings: vi.fn(),
}));

vi.mock('@n8n/rest-api-client/api/cloudPlans', () => ({
	getUpgradeOffer: vi.fn(),
}));

let mockIsCloudDeployment = false;
vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get isCloudDeployment() {
			return mockIsCloudDeployment;
		},
	}),
}));

let mockUserIsTrialing = false;
let mockTrialExpired = false;
let mockTrialDaysLeft = -1;
let mockCurrentPlanData: Cloud.PlanData | null = null;

vi.mock('@/app/stores/cloudPlan.store', () => ({
	useCloudPlanStore: () => ({
		get userIsTrialing() {
			return mockUserIsTrialing;
		},
		get trialExpired() {
			return mockTrialExpired;
		},
		get trialDaysLeft() {
			return mockTrialDaysLeft;
		},
		get currentPlanData() {
			return mockCurrentPlanData;
		},
	}),
}));

let mockIsInstanceOwner = false;
let mockCurrentUser: { settings?: { dismissedCallouts?: Record<string, boolean> } } | null = null;
const mockIsCalloutDismissed = vi.fn();
const mockSetCalloutDismissed = vi.fn();

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		get isInstanceOwner() {
			return mockIsInstanceOwner;
		},
		get currentUser() {
			return mockCurrentUser;
		},
		isCalloutDismissed: mockIsCalloutDismissed,
		setCalloutDismissed: mockSetCalloutDismissed,
	}),
}));

let mockIsAnyModalOpen = false;
const mockOpenModal = vi.fn();

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		get isAnyModalOpen() {
			return mockIsAnyModalOpen;
		},
		openModal: mockOpenModal,
	}),
}));

import {
	TRIAL_INTRO_MODAL_KEY,
	TRIAL_INTRO_SEEN_CALLOUT,
	TRIAL_INTRO_UPGRADE_SOURCE,
} from '../constants';
import { useTrialIntroModalStore } from './trialIntroModal.store';

describe('trialIntroModal store', () => {
	let store: ReturnType<typeof useTrialIntroModalStore>;

	beforeEach(() => {
		setActivePinia(createPinia());

		mockTrack.mockClear();
		mockGetVariant.mockReset();
		vi.mocked(updateCurrentUserSettings).mockReset();
		vi.mocked(updateCurrentUserSettings).mockResolvedValue({});
		vi.mocked(getUpgradeOffer).mockReset();
		vi.mocked(getUpgradeOffer).mockResolvedValue({});
		mockIsCalloutDismissed.mockReset();
		mockIsCalloutDismissed.mockReturnValue(false);
		mockSetCalloutDismissed.mockClear();
		mockOpenModal.mockClear();

		mockIsCloudDeployment = true;
		mockUserIsTrialing = true;
		mockTrialExpired = false;
		mockTrialDaysLeft = 5;
		mockCurrentPlanData = null;
		mockIsInstanceOwner = true;
		mockCurrentUser = { settings: { dismissedCallouts: {} } };
		mockIsAnyModalOpen = false;

		mockGetVariant.mockReturnValue(TRIAL_INTRO_MODAL_EXPERIMENT.variant);

		store = useTrialIntroModalStore();
	});

	it('uses the trial intro modal store id', () => {
		expect(store.$id).toBe(STORES.EXPERIMENT_TRIAL_INTRO_MODAL);
	});

	describe('isVariantEnabled', () => {
		it('is true when PostHog returns the variant arm', () => {
			mockGetVariant.mockReturnValue(TRIAL_INTRO_MODAL_EXPERIMENT.variant);
			expect(store.isVariantEnabled).toBe(true);
		});

		it('is false for the control arm', () => {
			mockGetVariant.mockReturnValue(TRIAL_INTRO_MODAL_EXPERIMENT.control);
			expect(store.isVariantEnabled).toBe(false);
		});

		it('is false when no flag value is returned', () => {
			mockGetVariant.mockReturnValue(undefined);
			expect(store.isVariantEnabled).toBe(false);
		});
	});

	describe('isEligible', () => {
		it('is true when every eligibility condition holds', () => {
			expect(store.isEligible).toBe(true);
		});

		it('is false outside cloud deployments', () => {
			mockIsCloudDeployment = false;
			expect(store.isEligible).toBe(false);
		});

		it('is false when the user is not trialing', () => {
			mockUserIsTrialing = false;
			expect(store.isEligible).toBe(false);
		});

		it('is false when the trial has expired', () => {
			mockTrialExpired = true;
			expect(store.isEligible).toBe(false);
		});

		it('is false for non-owner users', () => {
			mockIsInstanceOwner = false;
			expect(store.isEligible).toBe(false);
		});

		it('is false once the callout has been dismissed', () => {
			mockIsCalloutDismissed.mockReturnValue(true);
			expect(store.isEligible).toBe(false);
			expect(mockIsCalloutDismissed).toHaveBeenCalledWith(TRIAL_INTRO_SEEN_CALLOUT);
		});
	});

	describe('shouldShowModal', () => {
		it('is true when the variant is enabled and the user is eligible', () => {
			expect(store.shouldShowModal).toBe(true);
		});

		it('is false when eligible but on the control arm', () => {
			mockGetVariant.mockReturnValue(TRIAL_INTRO_MODAL_EXPERIMENT.control);
			expect(store.shouldShowModal).toBe(false);
		});

		it('is false when on the variant arm but ineligible', () => {
			mockIsInstanceOwner = false;
			expect(store.shouldShowModal).toBe(false);
		});
	});

	describe('starterOffer', () => {
		it('exposes the upgrade offer fetched from the dedicated endpoint', async () => {
			vi.mocked(getUpgradeOffer).mockResolvedValue({
				slug: 'starter',
				displayName: 'Starter',
				quotas: { monthlyExecutionsLimit: 2500, instanceAiCredits: 200 },
				currency: { code: 'USD', symbol: '$', position: 'prefix' },
			});

			await store.fetchUpgradeOfferOnce();

			expect(store.starterOffer).toEqual({
				slug: 'starter',
				displayName: 'Starter',
				quotas: { monthlyExecutionsLimit: 2500, instanceAiCredits: 200 },
				currency: { code: 'USD', symbol: '$', position: 'prefix' },
			});
		});

		it('is undefined without an upgrade offer', () => {
			expect(store.starterOffer).toBeUndefined();
		});
	});

	describe('offerCurrency', () => {
		it('reflects the upgrade offer currency', async () => {
			vi.mocked(getUpgradeOffer).mockResolvedValue({
				slug: 'starter',
				displayName: 'Starter',
				quotas: { monthlyExecutionsLimit: 2500, instanceAiCredits: 200 },
				currency: { code: 'EUR', symbol: '€', position: 'suffix' },
			});

			await store.fetchUpgradeOfferOnce();

			expect(store.offerCurrency).toEqual({ code: 'EUR', symbol: '€', position: 'suffix' });
		});

		it('is undefined without an upgrade offer', () => {
			expect(store.offerCurrency).toBeUndefined();
		});
	});

	describe('markSeen', () => {
		it('dismisses the callout locally and PATCHes the merged dismissed-callouts map', async () => {
			mockCurrentUser = { settings: { dismissedCallouts: { other_callout: true } } };

			await store.markSeen();

			expect(mockSetCalloutDismissed).toHaveBeenCalledWith(TRIAL_INTRO_SEEN_CALLOUT);
			expect(updateCurrentUserSettings).toHaveBeenCalledWith(restApiContextMock, {
				dismissedCallouts: {
					other_callout: true,
					[TRIAL_INTRO_SEEN_CALLOUT]: true,
				},
			});
		});

		it('swallows errors from the settings update request', async () => {
			vi.mocked(updateCurrentUserSettings).mockRejectedValueOnce(new Error('network error'));

			await expect(store.markSeen()).resolves.toBeUndefined();
			expect(mockSetCalloutDismissed).toHaveBeenCalledWith(TRIAL_INTRO_SEEN_CALLOUT);
		});
	});

	describe('fetchUpgradeOfferOnce', () => {
		it('stores a valid offer', async () => {
			vi.mocked(getUpgradeOffer).mockResolvedValue({
				slug: 'starter',
				displayName: 'Starter',
				quotas: { monthlyExecutionsLimit: 2500, instanceAiCredits: 200 },
			});

			await store.fetchUpgradeOfferOnce();

			expect(store.starterOffer).toEqual({
				slug: 'starter',
				displayName: 'Starter',
				quotas: { monthlyExecutionsLimit: 2500, instanceAiCredits: 200 },
			});
		});

		it('leaves starterOffer undefined when the endpoint returns no offer', async () => {
			await store.fetchUpgradeOfferOnce();

			expect(getUpgradeOffer).toHaveBeenCalledWith(restApiContextMock);
			expect(store.starterOffer).toBeUndefined();
		});

		it('does not re-request when called again, in flight or after resolving', async () => {
			let resolveRequest: (value: Cloud.UpgradeOffer | Record<string, never>) => void = () => {};
			vi.mocked(getUpgradeOffer).mockImplementation(
				async () =>
					await new Promise((resolve) => {
						resolveRequest = resolve;
					}),
			);

			const firstCall = store.fetchUpgradeOfferOnce();
			const secondCall = store.fetchUpgradeOfferOnce();
			resolveRequest({
				slug: 'starter',
				displayName: 'Starter',
				quotas: { monthlyExecutionsLimit: 2500, instanceAiCredits: 200 },
			});
			await Promise.all([firstCall, secondCall]);
			await store.fetchUpgradeOfferOnce();

			expect(getUpgradeOffer).toHaveBeenCalledTimes(1);
		});

		it('swallows a rejected request and leaves the offer undefined', async () => {
			vi.mocked(getUpgradeOffer).mockRejectedValueOnce(new Error('network error'));

			await expect(store.fetchUpgradeOfferOnce()).resolves.toBeUndefined();
			expect(store.starterOffer).toBeUndefined();
		});
	});

	describe('openIfEligible', () => {
		it('returns false and does not open the modal when shouldShowModal is false', () => {
			mockIsInstanceOwner = false;

			expect(store.openIfEligible()).toBe(false);
			expect(mockOpenModal).not.toHaveBeenCalled();
			expect(mockSetCalloutDismissed).not.toHaveBeenCalled();
			expect(getUpgradeOffer).not.toHaveBeenCalled();
		});

		it('returns false and does not open the modal when another modal is already open', () => {
			mockIsAnyModalOpen = true;

			expect(store.openIfEligible()).toBe(false);
			expect(mockOpenModal).not.toHaveBeenCalled();
			expect(mockSetCalloutDismissed).not.toHaveBeenCalled();
			expect(getUpgradeOffer).not.toHaveBeenCalled();
		});

		it('opens the modal, marks it seen, fetches the upgrade offer, and returns true when eligible and the modal stack is empty', () => {
			expect(store.openIfEligible()).toBe(true);
			expect(mockOpenModal).toHaveBeenCalledWith(TRIAL_INTRO_MODAL_KEY);
			expect(mockSetCalloutDismissed).toHaveBeenCalledWith(TRIAL_INTRO_SEEN_CALLOUT);
			expect(getUpgradeOffer).toHaveBeenCalledWith(restApiContextMock);
		});
	});

	describe('trackModalViewed', () => {
		it('tracks the feature flag payload alongside trial and offer context', async () => {
			mockTrialDaysLeft = 7;
			mockCurrentPlanData = {
				planId: 1,
				monthlyExecutionsLimit: 1000,
				activeWorkflowsLimit: 5,
				credentialsLimit: 5,
				isActive: true,
				displayName: 'Trial',
				expirationDate: '2026-08-01T00:00:00.000Z',
				metadata: { version: 'v1', group: 'trial', slug: 'trial-1' },
				licenseFeatures: { 'quota:instanceAiCredits': 500 },
			};
			vi.mocked(getUpgradeOffer).mockResolvedValue({
				slug: 'starter',
				displayName: 'Starter',
				quotas: { monthlyExecutionsLimit: 2500, instanceAiCredits: 200 },
				currency: { code: 'USD', symbol: '$', position: 'prefix' },
				prices: { monthly: 10, yearlyPerMonth: 8, yearlyTotal: 96, discountPct: 20 },
			});
			await store.fetchUpgradeOfferOnce();

			store.trackModalViewed(1);

			expect(mockTrack).toHaveBeenCalledWith('User viewed trial welcome modal', {
				step: 1,
				trial_days_left: 7,
				executions_limit: 1000,
				ai_credits: 500,
				has_prices: true,
				variant: TRIAL_INTRO_MODAL_EXPERIMENT.variant,
				[featureFlagProperty]: TRIAL_INTRO_MODAL_EXPERIMENT.variant,
			});
		});

		it('reports undefined quotas and has_prices false without plan or offer data', () => {
			store.trackModalViewed(2);

			expect(mockTrack).toHaveBeenCalledWith('User viewed trial welcome modal', {
				step: 2,
				trial_days_left: 5,
				executions_limit: undefined,
				ai_credits: undefined,
				has_prices: false,
				variant: TRIAL_INTRO_MODAL_EXPERIMENT.variant,
				[featureFlagProperty]: TRIAL_INTRO_MODAL_EXPERIMENT.variant,
			});
		});
	});

	describe('buildUpgradeReturnPath', () => {
		it('builds the annual upgrade return path', () => {
			expect(store.buildUpgradeReturnPath('annual')).toBe(
				`/account/change-plan?plan=starter&period=annual&checkout=open&source=${TRIAL_INTRO_UPGRADE_SOURCE}`,
			);
		});

		it('builds the monthly upgrade return path', () => {
			expect(store.buildUpgradeReturnPath('monthly')).toBe(
				`/account/change-plan?plan=starter&period=monthly&checkout=open&source=${TRIAL_INTRO_UPGRADE_SOURCE}`,
			);
		});
	});

	it('is registered in EXPERIMENTS_TO_TRACK', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(TRIAL_INTRO_MODAL_EXPERIMENT.name);
	});
});
