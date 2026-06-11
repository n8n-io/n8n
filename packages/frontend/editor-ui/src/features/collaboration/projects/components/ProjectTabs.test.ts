import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import ProjectTabs from './ProjectTabs.vue';
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
	beforeEach(() => {
		setActivePinia(createPinia());
		projectsStore = mockedStore(useProjectsStore);
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

	it('should render overview project tabs with variables', () => {
		const { getByText } = renderComponent({ props: { pageType: 'overview' } });
		expect(getByText('Variables')).toBeInTheDocument();
	});

	it('should render team project tabs with variables', () => {
		vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue({
			id: '1',
			name: 'default',
			type: 'team',
		} as Project);
		const { getByText } = renderComponent();

		expect(getByText('Variables')).toBeInTheDocument();
	});

	it('should render preview tabs with the preview tag component', () => {
		const { container, getByText } = renderComponent({
			props: {
				additionalTabs: [{ label: 'Agents', value: 'agents', preview: true }],
			},
		});

		expect(getByText('Agents')).toBeInTheDocument();
		expect(getByText('Preview')).toBeInTheDocument();
		expect(container.querySelector('.preview')).toBeInTheDocument();
	});

	const getTabValuesInOrder = (container: ParentNode) =>
		Array.from(container.querySelectorAll('[data-test-id^="tab-"]'))
			.map((el) => el.getAttribute('data-test-id')?.replace(/^tab-/, ''))
			.filter((v): v is string => !!v);

	it('should insert an additional tab right after the matching base tab when insertAfter is set', () => {
		const { container } = renderComponent({
			props: {
				pageType: 'overview',
				additionalTabs: [
					{ label: 'Agents', value: 'agents', preview: true, insertAfter: 'WorkflowsView' },
					{ label: 'Data tables', value: 'dataTables' },
				],
			},
		});

		expect(getTabValuesInOrder(container)).toEqual([
			'WorkflowsView',
			'agents',
			'CredentialsView',
			'Executions',
			'HomeVariables',
			'dataTables',
		]);
	});

	it('appends the additional tab when insertAfter does not match any base tab', () => {
		const { container } = renderComponent({
			props: {
				additionalTabs: [{ label: 'Agents', value: 'agents', insertAfter: 'NonExistent' }],
			},
		});

		const tabValues = getTabValuesInOrder(container);
		expect(tabValues[tabValues.length - 1]).toBe('agents');
	});
});
