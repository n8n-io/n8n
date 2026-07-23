import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import RolesView from './RolesView.vue';

const mockReplace = vi.fn();
let mockQuery: Record<string, unknown> = {};

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	return {
		...actual,
		useRoute: () => ({ query: mockQuery }),
		useRouter: () => ({ replace: mockReplace }),
	};
});

const renderComponent = createComponentRenderer(RolesView, {
	global: {
		stubs: {
			InstanceRolesView: { template: '<div data-test-id="instance-roles-view" />' },
			ProjectRolesView: { template: '<div data-test-id="project-roles-view" />' },
		},
	},
});

let rbacStore: MockedStore<typeof useRBACStore>;

describe('RolesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockQuery = {};
		createTestingPinia();
		rbacStore = mockedStore(useRBACStore);
		// Default to a fully-privileged (role:manage) user; the manageProject-only
		// case overrides this per test.
		rbacStore.hasScope = vi.fn().mockReturnValue(true);
	});

	it('defaults to the instance tab', () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('instance-roles-view')).toBeInTheDocument();
		expect(queryByTestId('project-roles-view')).not.toBeInTheDocument();
	});

	it('renders the project tab when ?tab=project', () => {
		mockQuery = { tab: 'project' };

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('project-roles-view')).toBeInTheDocument();
		expect(queryByTestId('instance-roles-view')).not.toBeInTheDocument();
	});

	it('reflects tab selection in the URL', async () => {
		const { getByText } = renderComponent();

		await userEvent.click(getByText('Project roles'));

		expect(mockReplace).toHaveBeenCalledWith({ query: { tab: 'project' } });
	});

	describe('scope-based tab filtering', () => {
		it('shows both tabs to a user with role:manage', () => {
			rbacStore.hasScope = vi.fn().mockReturnValue(true);

			const { getByText } = renderComponent();

			expect(getByText('Instance roles')).toBeInTheDocument();
			expect(getByText('Project roles')).toBeInTheDocument();
		});

		it('hides the instance tab from a role:manageProject-only user', () => {
			rbacStore.hasScope = vi.fn().mockReturnValue(false);

			const { getByText, queryByText, getByTestId, queryByTestId } = renderComponent();

			expect(queryByText('Instance roles')).not.toBeInTheDocument();
			expect(getByText('Project roles')).toBeInTheDocument();
			expect(getByTestId('project-roles-view')).toBeInTheDocument();
			expect(queryByTestId('instance-roles-view')).not.toBeInTheDocument();
		});

		it('coerces ?tab=instance to the project tab for a role:manageProject-only user', () => {
			rbacStore.hasScope = vi.fn().mockReturnValue(false);
			mockQuery = { tab: 'instance' };

			const { getByTestId, queryByTestId } = renderComponent();

			expect(getByTestId('project-roles-view')).toBeInTheDocument();
			expect(queryByTestId('instance-roles-view')).not.toBeInTheDocument();
		});
	});
});
