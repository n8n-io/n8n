import { createComponentRenderer } from '@/__tests__/render';
import ProjectTabs from '@/features/projects/components/ProjectTabs.vue';
import { useRoute, useRouter } from 'vue-router';

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

const renderComponent = createComponentRenderer(ProjectTabs);

let router: ReturnType<typeof useRouter>;
let route: ReturnType<typeof useRoute>;

describe('ProjectTabs', () => {
	beforeEach(() => {
		route = useRoute();
		router = useRouter();
	});

	it('should render home tabs', async () => {
		const { getByText, queryByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(queryByText('Settings')).not.toBeInTheDocument();
	});

	it('should render project tabs', () => {
		route.params.projectId = '123';
		const { getByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Settings')).toBeInTheDocument();
	});
});
