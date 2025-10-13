import { createComponentRenderer } from '@/__tests__/render';
import ProjectTabs from './ProjectTabs.vue';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	const params = {};
	return {
		...actual,
		useRoute: () => ({
			params,
		}),
	};
});
const renderComponent = createComponentRenderer(ProjectTabs, {
	global: {
		stubs: {
			RouterLink: {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('ProjectTabs', () => {
	it('should render home tabs', async () => {
		const { getByText, queryByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Executions')).toBeInTheDocument();
		expect(queryByText('Project settings')).not.toBeInTheDocument();
	});

	it('should render project tab Settings', () => {
		const { getByText } = renderComponent({ props: { showSettings: true } });

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Executions')).toBeInTheDocument();
		expect(getByText('Project settings')).toBeInTheDocument();
	});
});
