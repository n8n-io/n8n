import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowState, type WorkflowState } from './useWorkflowState';

describe('useWorkflowState', () => {
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let workflowState: WorkflowState;
	beforeEach(() => {
		workflowsStore = useWorkflowsStore();
		workflowState = useWorkflowState();
	});

	describe('setWorkflowName()', () => {
		it('should set the workflow name correctly', () => {
			workflowState.setWorkflowName({
				newName: 'New Workflow Name',
				setStateDirty: false,
			});
			expect(workflowsStore.private.name).toBe('New Workflow Name');
		});

		it('should propagate name to workflowObject for pre-exec expressions', () => {
			workflowState.setWorkflowName({ newName: 'WF Title', setStateDirty: false });
			expect(workflowsStore.workflowObject.name).toBe('WF Title');
		});
	});
});
