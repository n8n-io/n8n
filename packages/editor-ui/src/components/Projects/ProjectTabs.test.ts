import { createComponentRenderer } from '@/__tests__/render';
import ProjectTabs from '@/components/Projects/ProjectTabs.vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectsStore } from '@/stores/projects.store';

vi.mock('vue-router', () => {
	const params = {};
	const push = vi.fn();
	return {
		useRoute: () => ({
			params,
		}),
		useRouter: () => ({
			push,
		}),
		RouterLink: vi.fn(),
	};
});

vi.mock('@/stores/users.store', () => ({
	useUsersStore: vi.fn().mockImplementation(() => ({
		currentUser: {},
	})),
}));

vi.mock('@/stores/projects.store', () => ({
	useProjectsStore: vi.fn().mockReturnValue({}),
}));

vi.mock('@/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(false),
}));

const renderComponent = createComponentRenderer(ProjectTabs);

let router: ReturnType<typeof useRouter>;
let route: ReturnType<typeof useRoute>;
let projectsStore: ReturnType<typeof useProjectsStore>;

describe('ProjectTabs', () => {
	beforeEach(() => {
		route = useRoute();
		router = useRouter();
		projectsStore = useProjectsStore();
	});

	it('should render home tabs', async () => {
		const { getByText, queryByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(queryByText('Project settings')).not.toBeInTheDocument();
	});

	it('should render project tabs if use has permissions', () => {
		route.params.projectId = '123';
		projectsStore.currentProject = {
			id: '123',
			type: 'team',
			name: 'Project',
			relations: [],
			scopes: ['project:update'],
			createdAt: '',
			updatedAt: '',
		};
		const { getByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Project settings')).toBeInTheDocument();
	});

	it('should render project tabs', () => {
		route.params.projectId = '123';
		projectsStore.currentProject = {
			id: '123',
			type: 'team',
			name: 'Project',
			relations: [],
			scopes: ['project:read'],
			createdAt: '',
			updatedAt: '',
		};
		const { queryByText, getByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(queryByText('Project settings')).not.toBeInTheDocument();
	});
});
