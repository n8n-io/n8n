import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { useRolesStore } from '@/app/stores/roles.store';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import InstanceRolesView from './InstanceRolesView.vue';
import { useSettingsStore } from '@/app/stores/settings.store';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRouter: () => ({ push: vi.fn() }),
	};
});

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: vi.fn() }),
}));

const renderComponent = createComponentRenderer(InstanceRolesView, {
	global: {
		stubs: {
			RouterLink: {
				template: '<router-link-stub v-bind="$attrs"><slot /></router-link-stub>',
			},
		},
	},
});

const mockSystemRoles = [
	{
		displayName: 'Admin',
		slug: 'global:admin',
		description: 'Instance admin',
		scopes: [],
		licensed: true,
		systemRole: true,
		roleType: 'global' as const,
		usedByUsers: 2,
	},
	{
		displayName: 'Member',
		slug: 'global:member',
		description: 'Instance member',
		scopes: [],
		licensed: true,
		systemRole: true,
		roleType: 'global' as const,
		usedByUsers: 5,
	},
];

const mockCustomRoles = [
	{
		displayName: 'Custom Global Role',
		slug: 'custom:global-1',
		description: 'A custom instance role',
		scopes: [],
		licensed: true,
		systemRole: false,
		roleType: 'global' as const,
		usedByUsers: 0,
	},
];

let rolesStore: MockedStore<typeof useRolesStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;

describe('InstanceRolesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		rolesStore = mockedStore(useRolesStore);
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isCustomRolesFeatureEnabled = true;
	});

	it('should render the members-assigned column and table headers', () => {
		rolesStore.processedInstanceRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getByText } = renderComponent();

		expect(getByText('Members assigned')).toBeInTheDocument();
		expect(getByText('Name')).toBeInTheDocument();
		expect(getByText('Type')).toBeInTheDocument();
		expect(getByText('Last edited')).toBeInTheDocument();
	});

	it('should render a row per instance role by identity', () => {
		rolesStore.processedInstanceRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getByText, getAllByText } = renderComponent();

		expect(getByText('Admin')).toBeInTheDocument();
		expect(getByText('Member')).toBeInTheDocument();
		expect(getByText('Custom Global Role')).toBeInTheDocument();
		expect(getAllByText('System')).toHaveLength(2);
		expect(getAllByText('Custom')).toHaveLength(1);
	});

	it('should show destructive actions only for custom roles', () => {
		rolesStore.processedInstanceRoles = [...mockSystemRoles, ...mockCustomRoles];

		const { getAllByTestId } = renderComponent();

		// Only the single custom role has an action toggle; system roles are read-only.
		expect(getAllByTestId('action-toggle')).toHaveLength(1);
	});

	it('should duplicate a custom instance role with roleType global', async () => {
		const customRole = mockCustomRoles[0];
		const duplicated = { ...customRole, slug: 'custom:global-2', displayName: 'Copy' };
		rolesStore.processedInstanceRoles = [customRole];
		rolesStore.roles.global = [customRole];
		rolesStore.createRole.mockResolvedValue(duplicated);

		const { getByTestId, getAllByTestId } = renderComponent();
		await userEvent.click(within(getAllByTestId('action-toggle')[0]).getByRole('button'));
		await userEvent.click(getByTestId('action-duplicate'));

		expect(rolesStore.createRole).toHaveBeenCalledWith(
			expect.objectContaining({ roleType: 'global', scopes: [] }),
		);
	});
});
