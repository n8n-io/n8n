import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Schedule Trigger node', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should execute and return the execution timestamp', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.actions.openNode('Schedule Trigger');
		ndv.actions.execute();
		ndv.getters.outputPanel().contains('timestamp');
		ndv.getters.backToCanvas().click();
	});
});
