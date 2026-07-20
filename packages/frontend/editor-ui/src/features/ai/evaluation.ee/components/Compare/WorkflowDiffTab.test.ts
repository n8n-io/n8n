import { waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import type { CompareVersion } from '../../composables/useCompareData';
import WorkflowDiffTab from './WorkflowDiffTab.vue';

const fetchWorkflow = vi.fn();
const getWorkflowVersion = vi.fn();

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({ fetchWorkflow }),
}));
vi.mock('@/features/workflows/workflowHistory/workflowHistory.store', () => ({
	useWorkflowHistoryStore: () => ({ getWorkflowVersion }),
}));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));
// Stub the heavy diff canvas — this tab only wires data into it.
vi.mock('@/features/workflows/workflowDiff/WorkflowDiffView.vue', () => ({
	default: { name: 'WorkflowDiffView', template: '<div data-test-id="wf-diff-stub" />' },
}));

const version = (over: Partial<CompareVersion>): CompareVersion => ({
	index: 0,
	testRunId: 'run',
	workflowVersionId: 'v0',
	letter: 'A',
	label: 'Baseline',
	status: 'completed',
	avgScore: null,
	...over,
});

const renderComponent = createComponentRenderer(WorkflowDiffTab);

describe('WorkflowDiffTab', () => {
	beforeEach(() => {
		fetchWorkflow.mockReset().mockResolvedValue({ id: 'wf-1', nodes: [], connections: {} });
		getWorkflowVersion.mockReset().mockResolvedValue({
			versionId: 'v1',
			workflowId: 'wf-1',
			nodes: [],
			connections: {},
			nodeGroups: [],
		});
	});

	it('prompts for a second version and skips loading when only one is present', () => {
		const { queryByTestId } = renderComponent({
			props: { versions: [version({ index: 0 })], workflowId: 'wf-1' },
		});

		expect(queryByTestId('workflow-diff-source-select')).toBeNull();
		expect(fetchWorkflow).not.toHaveBeenCalled();
	});

	it('resolves the current draft from the base workflow and a version from its snapshot', async () => {
		const versions = [
			version({ index: 0, workflowVersionId: null, letter: 'A', label: 'Current draft' }),
			version({ index: 1, workflowVersionId: 'v1', letter: 'B', label: 'v1' }),
		];

		const { findByTestId } = renderComponent({ props: { versions, workflowId: 'wf-1' } });

		await findByTestId('wf-diff-stub');
		await waitFor(() => expect(fetchWorkflow).toHaveBeenCalledWith('wf-1'));
		// Only the real version pulls a history snapshot; the draft reuses the base.
		expect(getWorkflowVersion).toHaveBeenCalledTimes(1);
		expect(getWorkflowVersion).toHaveBeenCalledWith('wf-1', 'v1');
	});
});
