import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUsageStore } from '@/stores/usage.store';
import SettingsUsageAndPlan from '@/views/SettingsUsageAndPlan.vue';
import { useUIStore } from '@/stores/ui.store';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/constants';

vi.mock('vue-router', () => {
	return {
		useRoute: () => ({
			query: {},
		}),
		useRouter: () => ({
			replace: vi.fn(),
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

let usageStore: ReturnType<typeof mockedStore<typeof useUsageStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

const renderComponent = createComponentRenderer(SettingsUsageAndPlan);

describe('SettingsUsageAndPlan', () => {
	beforeEach(() => {
		createTestingPinia();
		usageStore = mockedStore(useUsageStore);
		uiStore = mockedStore(useUIStore);

		usageStore.viewPlansUrl = 'https://subscription.n8n.io';
		usageStore.managePlanUrl = 'https://subscription.n8n.io';
	});

	it('should not throw errors when rendering', async () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the title only while loading', async () => {
		const { getByRole } = renderComponent();
		expect(getByRole('heading', { level: 2 })).toBeInTheDocument();
		expect(getByRole('heading').nextElementSibling).toBeNull();
	});

	it('should not show badge but unlock notice', async () => {
		usageStore.isLoading = false;
		usageStore.planName = 'Community';
		const { getByRole, container } = renderComponent();
		expect(getByRole('heading', { level: 3 })).toHaveTextContent('Community');
		expect(container.querySelector('.n8n-badge')).toBeNull();

		expect(getByRole('button', { name: 'Unlock' })).toBeVisible();

		await userEvent.click(getByRole('button', { name: 'Unlock' }));
		expect(uiStore.openModal).toHaveBeenCalledWith(COMMUNITY_PLUS_ENROLLMENT_MODAL);
	});

	it('should show community registered badge', async () => {
		usageStore.isLoading = false;
		usageStore.planName = 'Registered Community';
		const { getByRole, container } = renderComponent();
		expect(getByRole('heading', { level: 3 })).toHaveTextContent('Community Edition');
		expect(getByRole('heading', { level: 3 })).toContain(container.querySelector('.n8n-badge'));
		expect(container.querySelector('.n8n-badge')).toHaveTextContent('Registered');
	});
});
