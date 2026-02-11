import { createComponentRenderer } from '@/__tests__/render';
import TrialBanner from './TrialBanner.vue';
import { createPinia, setActivePinia } from 'pinia';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { vi } from 'vitest';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: {},
		baseUrl: 'http://localhost:5678',
	})),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		settings: { n8nMetadata: { userId: 'test-user-id' } },
		isCloudDeployment: true,
	})),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn(() => true),
}));

vi.mock('@n8n/rest-api-client/api/cloudPlans', () => ({
	getAdminPanelLoginCode: vi.fn(),
	getCurrentPlan: vi.fn(),
	getCurrentUsage: vi.fn(),
	getCloudUserInfo: vi.fn(),
}));

const goToUpgradeMock = vi.fn();
vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: vi.fn(() => ({
		goToUpgrade: goToUpgradeMock,
	})),
}));

const routerPushMock = vi.fn();
vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as object),
		useRouter: vi.fn(() => ({
			push: routerPushMock,
		})),
	};
});

const renderComponent = createComponentRenderer(TrialBanner, {
	global: {
		stubs: {
			N8nIcon: true,
			BaseBanner: {
				template: `<div class="base-banner" data-test-id="trial-banner">
					<slot name="mainContent" />
					<slot name="trailingContent" />
				</div>`,
				props: ['name', 'theme', 'dismissible', 'customIcon'],
			},
		},
	},
});

describe('TrialBanner', () => {
	let pinia: ReturnType<typeof createPinia>;
	let cloudPlanStore: ReturnType<typeof useCloudPlanStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		pinia = createPinia();
		setActivePinia(pinia);
		cloudPlanStore = useCloudPlanStore();
	});

	it('should render time left message when timeLeft.show is true', () => {
		cloudPlanStore.state.data = {
			expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
			bannerConfig: {
				timeLeft: { text: '5 days remaining' },
			},
		} as never;

		const { getByText } = renderComponent();
		expect(getByText('5 days remaining')).toBeTruthy();
	});

	it('should render executions counter when showExecutions is true', () => {
		cloudPlanStore.state.data = {
			monthlyExecutionsLimit: 100,
			bannerConfig: {
				showExecutions: true,
			},
		} as never;
		cloudPlanStore.state.usage = {
			executions: 25,
			activeWorkflows: 5,
		};

		const { container } = renderComponent();
		expect(container.textContent).toContain('25/100');
	});

	it('should not render executions counter when showExecutions is false', () => {
		cloudPlanStore.state.data = {
			monthlyExecutionsLimit: 100,
			bannerConfig: {
				showExecutions: false,
			},
		} as never;
		cloudPlanStore.state.usage = {
			executions: 25,
			activeWorkflows: 5,
		};

		const { container } = renderComponent();
		expect(container.textContent).not.toContain('25/100');
	});

	it('should render CTA button with custom text', () => {
		cloudPlanStore.state.data = {
			bannerConfig: {
				cta: {
					text: 'Subscribe Now',
				},
			},
		} as never;

		const { getByText } = renderComponent();
		expect(getByText('Subscribe Now')).toBeTruthy();
	});

	it('should call goToUpgrade when CTA is clicked without href', () => {
		cloudPlanStore.state.data = {
			bannerConfig: {
				cta: {
					text: 'Upgrade',
				},
			},
		} as never;

		const { getByText } = renderComponent();
		const button = getByText('Upgrade');
		button.click();

		expect(goToUpgradeMock).toHaveBeenCalledWith('canvas-nav', 'upgrade-canvas-nav', 'redirect');
	});

	it('should open external URL in new tab when CTA has external href', () => {
		const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

		cloudPlanStore.state.data = {
			bannerConfig: {
				cta: {
					text: 'Learn More',
					href: 'https://n8n.io/pricing',
				},
			},
		} as never;

		const { getByText } = renderComponent();
		const button = getByText('Learn More');
		button.click();

		expect(windowOpenSpy).toHaveBeenCalledWith('https://n8n.io/pricing', '_blank');
		windowOpenSpy.mockRestore();
	});

	it('should navigate to internal URL when CTA has internal href', () => {
		cloudPlanStore.state.data = {
			bannerConfig: {
				cta: {
					text: 'Go to Settings',
					href: '/settings/usage',
				},
			},
		} as never;

		const { getByText } = renderComponent();
		const button = getByText('Go to Settings');
		button.click();

		expect(routerPushMock).toHaveBeenCalledWith('/settings/usage');
	});
});
