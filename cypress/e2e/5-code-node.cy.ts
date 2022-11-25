import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

describe('Code node', () => {
	beforeEach(() => {
		cy.task('db:reset');
		cy.skipSetup();
	});

	it('should execute the placeholder in all-items mode successfully', () => {
		WorkflowsPage.actions.createWorkflowFromCard();
		WorkflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNodeNdv('Code');

		WorkflowPage.actions.executeNodeFromNdv();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});

	it('should execute the placeholder in each-item mode successfully', () => {
		WorkflowsPage.actions.createWorkflowFromCard();
		WorkflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNodeNdv('Code');
		WorkflowPage.getters.ndvParameterInput('mode').click();
		WorkflowPage.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

		WorkflowPage.actions.executeNodeFromNdv();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});
});
