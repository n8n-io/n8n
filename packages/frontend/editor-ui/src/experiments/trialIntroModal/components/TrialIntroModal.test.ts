import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	TRIAL_INTRO_MODAL_KEY,
	TRIAL_INTRO_UPGRADE_SOURCE,
} from '@/experiments/trialIntroModal/constants';
import { useTrialIntroModalStore } from '@/experiments/trialIntroModal/stores/trialIntroModal.store';
import type { Cloud } from '@n8n/rest-api-client/api/cloudPlans';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { defineComponent } from 'vue';
import TrialIntroModal from './TrialIntroModal.vue';

const mockTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTrack,
	}),
}));

let mockCountdownText: string | undefined;
vi.mock('@/experiments/trialIntroModal/useTrialCountdown', async () => {
	const { computed } = await import('vue');
	return {
		useTrialCountdown: () => ({
			countdownText: computed(() => mockCountdownText),
		}),
	};
});

const ModalStub = defineComponent({
	props: ['name', 'title', 'eventBus'],
	template: `
		<div :data-test-id="name">
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
});

const renderComponent = createComponentRenderer(TrialIntroModal, {
	global: {
		stubs: {
			Modal: ModalStub,
		},
	},
});

const trialPlan: Cloud.PlanData = {
	planId: 1,
	monthlyExecutionsLimit: 1000,
	activeWorkflowsLimit: 5,
	credentialsLimit: 10,
	isActive: true,
	displayName: 'Trial',
	expirationDate: '2026-08-04T00:00:00.000Z',
	metadata: {
		version: 'v1',
		group: 'trial',
		slug: 'trial-1',
		trial: { length: 14, gracePeriod: 3 },
	},
	userIsTrialing: true,
	licenseFeatures: { 'quota:instanceAiCredits': 800 },
};

const starterOffer: Cloud.UpgradeOffer = {
	slug: 'starter',
	displayName: 'Starter',
	quotas: { monthlyExecutionsLimit: 2500, instanceAiCredits: 2300 },
	prices: { monthly: 24, yearlyPerMonth: 18, yearlyTotal: 216, discountPct: 20 },
};

const loginLink = 'https://app.n8n.cloud/login?code=123&returnPath=%2Freturn%2Fannual';

describe('TrialIntroModal', () => {
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		mockTrack.mockClear();
		mockCountdownText = '13d 2h 5m';

		pinia = createTestingPinia();

		const cloudPlanStore = mockedStore(useCloudPlanStore);
		cloudPlanStore.currentPlanData = trialPlan;
		cloudPlanStore.userIsTrialing = true;
		cloudPlanStore.trialDaysLeft = 14;
		cloudPlanStore.usageLeft = { workflowsLeft: 3, executionsLeft: 950 };
		cloudPlanStore.generateCloudDashboardAutoLoginLink.mockResolvedValue(loginLink);

		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.deploymentType = 'cloud';

		const trialIntroModalStore = mockedStore(useTrialIntroModalStore);
		trialIntroModalStore.starterOffer = starterOffer;
		trialIntroModalStore.offerCurrency = { code: 'EUR', symbol: '€', position: 'suffix' };
		trialIntroModalStore.buildUpgradeReturnPath.mockImplementation(
			(period: 'annual' | 'monthly') => `/return/${period}`,
		);

		Object.defineProperty(window, 'location', {
			value: { href: 'https://test.app.n8n.cloud/home/workflows' },
			writable: true,
		});
	});

	async function goToStepTwo(getByTestId: (id: string) => HTMLElement) {
		await userEvent.click(getByTestId('trial-intro-upgrade-now-button'));
	}

	it('renders step 1 with formatted quotas and tracks the initial view', () => {
		const { getByTestId, getByText } = renderComponent({ pinia });

		expect(getByText('Welcome to n8n')).toBeInTheDocument();
		expect(getByText('free trial')).toBeInTheDocument();
		expect(getByTestId('trial-intro-countdown-pill')).toHaveTextContent('Ends in 13d 2h 5m');

		expect(getByTestId('trial-intro-stat-ai-credits')).toHaveTextContent((800).toLocaleString());
		expect(getByTestId('trial-intro-stat-ai-credits')).toHaveTextContent('free AI credits');
		expect(getByTestId('trial-intro-stat-executions')).toHaveTextContent((1000).toLocaleString());
		expect(getByTestId('trial-intro-stat-executions')).toHaveTextContent('workflow executions');
		expect(getByTestId('trial-intro-stat-days')).toHaveTextContent('14');
		expect(getByTestId('trial-intro-stat-days')).toHaveTextContent('days of full access');

		expect(getByText('Your workflows stop running when the trial ends')).toBeInTheDocument();

		const trialIntroModalStore = mockedStore(useTrialIntroModalStore);
		expect(trialIntroModalStore.trackModalViewed).toHaveBeenCalledWith(1);
	});

	it('hides the AI credits card when the plan has no license features', () => {
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		cloudPlanStore.currentPlanData = { ...trialPlan, licenseFeatures: undefined };

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('trial-intro-stat-ai-credits')).not.toBeInTheDocument();
		expect(getByTestId('trial-intro-stat-executions')).toBeInTheDocument();
		expect(getByTestId('trial-intro-stat-days')).toBeInTheDocument();
	});

	it('hides the countdown pill when no countdown text is available', () => {
		mockCountdownText = undefined;

		const { queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('trial-intro-countdown-pill')).not.toBeInTheDocument();
	});

	it('closes the modal when Start building is clicked', async () => {
		const uiStore = mockedStore(useUIStore);
		const { getByTestId } = renderComponent({ pinia });

		await userEvent.click(getByTestId('trial-intro-start-building-button'));

		expect(uiStore.closeModal).toHaveBeenCalledWith(TRIAL_INTRO_MODAL_KEY);
	});

	it('advances to step 2 when Upgrade now is clicked and tracks the step change', async () => {
		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		await goToStepTwo(getByTestId);

		expect(queryByTestId('trial-intro-step-1')).not.toBeInTheDocument();
		expect(getByTestId('trial-intro-step-2')).toBeInTheDocument();
		expect(getByTestId('trial-intro-row-executions')).toHaveTextContent((1000).toLocaleString());
		expect(getByTestId('trial-intro-row-executions')).toHaveTextContent((2500).toLocaleString());
		expect(getByTestId('trial-intro-row-ai-credits')).toHaveTextContent((800).toLocaleString());
		expect(getByTestId('trial-intro-row-ai-credits')).toHaveTextContent((2300).toLocaleString());

		const trialIntroModalStore = mockedStore(useTrialIntroModalStore);
		expect(trialIntroModalStore.trackModalViewed).toHaveBeenCalledWith(2);
	});

	it('hides prices and shows the fallback badge when the offer has no prices', async () => {
		const trialIntroModalStore = mockedStore(useTrialIntroModalStore);
		trialIntroModalStore.starterOffer = { ...starterOffer, prices: undefined };

		const { getByTestId, queryByTestId } = renderComponent({ pinia });
		await goToStepTwo(getByTestId);

		expect(queryByTestId('trial-intro-price-annual')).not.toBeInTheDocument();
		expect(queryByTestId('trial-intro-price-monthly')).not.toBeInTheDocument();
		expect(getByTestId('trial-intro-save-badge')).toHaveTextContent('Save 25%');
	});

	it('formats prices after the amount for suffix currencies', async () => {
		const { getByTestId } = renderComponent({ pinia });
		await goToStepTwo(getByTestId);

		expect(getByTestId('trial-intro-price-annual')).toHaveTextContent('18€');
		expect(getByTestId('trial-intro-price-annual')).toHaveTextContent('billed annually');
		expect(getByTestId('trial-intro-price-monthly')).toHaveTextContent('24€');
		expect(getByTestId('trial-intro-save-badge')).toHaveTextContent('Save 20%');
	});

	it('formats prices before the amount for prefix currencies', async () => {
		const trialIntroModalStore = mockedStore(useTrialIntroModalStore);
		trialIntroModalStore.offerCurrency = { code: 'USD', symbol: '$', position: 'prefix' };

		const { getByTestId } = renderComponent({ pinia });
		await goToStepTwo(getByTestId);

		expect(getByTestId('trial-intro-price-annual')).toHaveTextContent('$18');
		expect(getByTestId('trial-intro-price-monthly')).toHaveTextContent('$24');
	});

	it('returns to step 1 when Back is clicked', async () => {
		const { getByTestId } = renderComponent({ pinia });
		await goToStepTwo(getByTestId);

		await userEvent.click(getByTestId('trial-intro-back-button'));

		expect(getByTestId('trial-intro-step-1')).toBeInTheDocument();
	});

	it('tracks the upgrade CTA and navigates to the generated dashboard link', async () => {
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const trialIntroModalStore = mockedStore(useTrialIntroModalStore);

		const { getByTestId } = renderComponent({ pinia });
		await goToStepTwo(getByTestId);

		await userEvent.click(getByTestId('trial-intro-upgrade-cta'));

		expect(mockTrack).toHaveBeenCalledWith('User clicked upgrade CTA', {
			source: TRIAL_INTRO_UPGRADE_SOURCE,
			isTrial: true,
			deploymentType: 'cloud',
			trialDaysLeft: 14,
			executionsLeft: 950,
			workflowsLeft: 3,
		});
		expect(trialIntroModalStore.buildUpgradeReturnPath).toHaveBeenCalledWith('annual');
		expect(cloudPlanStore.generateCloudDashboardAutoLoginLink).toHaveBeenCalledWith({
			redirectionPath: '/return/annual',
		});
		await waitFor(() => expect(window.location.href).toBe(loginLink));
	});

	it('passes the selected period to the upgrade return path', async () => {
		const trialIntroModalStore = mockedStore(useTrialIntroModalStore);

		const { getByTestId } = renderComponent({ pinia });
		await goToStepTwo(getByTestId);

		expect(getByTestId('trial-intro-period-annual')).toHaveAttribute('aria-checked', 'true');
		expect(getByTestId('trial-intro-period-monthly')).toHaveAttribute('aria-checked', 'false');

		await userEvent.click(getByTestId('trial-intro-period-monthly'));

		expect(getByTestId('trial-intro-period-annual')).toHaveAttribute('aria-checked', 'false');
		expect(getByTestId('trial-intro-period-monthly')).toHaveAttribute('aria-checked', 'true');

		await userEvent.click(getByTestId('trial-intro-upgrade-cta'));

		expect(trialIntroModalStore.buildUpgradeReturnPath).toHaveBeenCalledWith('monthly');
	});
});
