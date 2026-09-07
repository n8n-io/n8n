import { createComponentRenderer } from '@/__tests__/render';
import WorkflowCallersDropdown from '@/features/ndv/panel/components/WorkflowCallersDropdown.vue';
import { createTestingPinia } from '@pinia/testing';
import type { DependencyTypeCounts } from '@n8n/api-types';

let mockCounts: Record<string, Partial<DependencyTypeCounts>> = {};

const fetchDependencyCountsMock = vi.fn();
vi.mock('@/app/composables/useDependencies', () => ({
	useDependencies: () => ({
		fetchDependencyCounts: fetchDependencyCountsMock,
		getDependencyCounts: (id: string) => mockCounts[id],
	}),
}));

vi.mock('@/app/components/DependencyPill.vue', () => ({
	default: {
		name: 'DependencyPill',
		props: ['resourceType', 'resourceId', 'dependencyTypes', 'tooltip', 'source', 'dataTestId'],
		template: '<div data-test-id="mock-dependency-pill"><slot name="trigger" /></div>',
	},
}));

const renderComponent = createComponentRenderer(WorkflowCallersDropdown, {
	pinia: createTestingPinia(),
});

describe('WorkflowCallersDropdown', () => {
	beforeEach(() => {
		mockCounts = {};
		vi.clearAllMocks();
	});

	it('should fetch dependency counts for the workflow', () => {
		renderComponent({ props: { workflowId: 'wf-1' } });

		expect(fetchDependencyCountsMock).toHaveBeenCalledWith(['wf-1'], 'workflow');
	});

	it('should not fetch dependency counts without a workflow id', () => {
		renderComponent({ props: { workflowId: '' } });

		expect(fetchDependencyCountsMock).not.toHaveBeenCalled();
	});

	it('should render nothing when the workflow has no callers', () => {
		mockCounts = { 'wf-1': { workflowParent: 0 } };
		const { queryByTestId } = renderComponent({ props: { workflowId: 'wf-1' } });

		expect(queryByTestId('workflow-callers-link')).not.toBeInTheDocument();
	});

	it('should render a singular link label for one caller', () => {
		mockCounts = { 'wf-1': { workflowParent: 1 } };
		const { getByTestId } = renderComponent({ props: { workflowId: 'wf-1' } });

		expect(getByTestId('workflow-callers-link')).toHaveTextContent('Used by 1 workflow');
	});

	it('should render a plural link label for multiple callers', () => {
		mockCounts = { 'wf-1': { workflowParent: 3 } };
		const { getByTestId } = renderComponent({ props: { workflowId: 'wf-1' } });

		expect(getByTestId('workflow-callers-link')).toHaveTextContent('Used by 3 workflows');
	});
});
