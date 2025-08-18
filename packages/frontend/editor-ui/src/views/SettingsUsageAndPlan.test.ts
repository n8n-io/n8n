import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUsageStore } from '@/stores/usage.store';
import SettingsUsageAndPlan from '@/views/SettingsUsageAndPlan.vue';
import { useUIStore } from '@/stores/ui.store';
import { COMMUNITY_PLUS_ENROLLMENT_MODAL } from '@/constants';
import { useUsersStore } from '@/stores/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';

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
let usersStore: ReturnType<typeof mockedStore<typeof useUsersStore>>;

const renderComponent = createComponentRenderer(SettingsUsageAndPlan);

describe('SettingsUsageAndPlan', () => {
	beforeEach(() => {
		createTestingPinia();
		usageStore = mockedStore(useUsageStore);
		uiStore = mockedStore(useUIStore);
		usersStore = mockedStore(useUsersStore);

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
		usersStore.currentUser = {
			globalScopes: ['community:register'],
		} as IUser;
		const { getByRole, container } = renderComponent();
		expect(getByRole('heading', { level: 3 })).toHaveTextContent('Community');
		expect(container.querySelector('.n8n-badge')).toBeNull();

		expect(getByRole('button', { name: 'Unlock' })).toBeVisible();

		await userEvent.click(getByRole('button', { name: 'Unlock' }));
		expect(uiStore.openModalWithData).toHaveBeenCalledWith(
			expect.objectContaining({ name: COMMUNITY_PLUS_ENROLLMENT_MODAL }),
		);
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
