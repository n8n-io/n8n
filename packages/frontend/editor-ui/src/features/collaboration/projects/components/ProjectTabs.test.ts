import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import ProjectTabs from './ProjectTabs.vue';
import { usePostHog } from '@/stores/posthog.store';
import { createPinia, setActivePinia } from 'pinia';
import { useProjectsStore } from '../projects.store';
import type { Project } from '../projects.types';

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
	let projectsStore: MockedStore<typeof useProjectsStore>;
	let postHogStore: MockedStore<typeof usePostHog>;
	beforeEach(() => {
		setActivePinia(createPinia());
		projectsStore = mockedStore(useProjectsStore);
		postHogStore = mockedStore(usePostHog);
		vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue(null);
	});

	it('should render home tabs', async () => {
		const { getByText, queryByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Executions')).toBeInTheDocument();
		expect(queryByText('Project settings')).not.toBeInTheDocument();
		expect(queryByText('Variables')).not.toBeInTheDocument();
	});

	it('should render project tab Settings', () => {
		const { getByText, queryByText } = renderComponent({ props: { showSettings: true } });

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Executions')).toBeInTheDocument();
		expect(getByText('Project settings')).toBeInTheDocument();
		expect(queryByText('Variables')).not.toBeInTheDocument();
	});

	it('should render team project tabs with variables', () => {
		vi.spyOn(postHogStore, 'isVariantEnabled').mockReturnValue(true);
		vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue({
			id: '1',
			name: 'default',
			type: 'team',
		} as Project);
		const { getByText } = renderComponent();

		expect(getByText('Variables')).toBeInTheDocument();
	});
});
