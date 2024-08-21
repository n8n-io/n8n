import { createPinia, setActivePinia } from 'pinia';
import { useRoute } from 'vue-router';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestProject } from '@/__tests__/data/projects';
import ProjectTabs from '@/components/Projects/ProjectTabs.vue';
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
const renderComponent = createComponentRenderer(ProjectTabs, {
	global: {
		stubs: {
			'router-link': {
				template: '<div><slot /></div>',
			},
		},
	},
});

let route: ReturnType<typeof useRoute>;
let projectsStore: ReturnType<typeof useProjectsStore>;

describe('ProjectTabs', () => {
	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);
		route = useRoute();
		projectsStore = useProjectsStore();
	});

	it('should render home tabs', async () => {
		const { getByText, queryByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(queryByText('Project settings')).not.toBeInTheDocument();
	});

	it('should render project tab Settings if user has permissions', () => {
		route.params.projectId = '123';
		projectsStore.setCurrentProject(createTestProject({ scopes: ['project:update'] }));
		const { getByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Project settings')).toBeInTheDocument();
	});

	it('should render project tabs without Settings if no permission', () => {
		route.params.projectId = '123';
		projectsStore.setCurrentProject(createTestProject({ scopes: ['project:read'] }));
		const { queryByText, getByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(queryByText('Project settings')).not.toBeInTheDocument();
	});
});
