import { createComponentRenderer } from '@/__tests__/render';
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

describe('RolesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockQuery = {};
		createTestingPinia();
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
});
