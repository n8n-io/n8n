import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

describe('Code node', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	it('should execute the placeholder in all-items mode successfully', () => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNodeNdv('Code');

		WorkflowPage.actions.executeNodeFromNdv();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});

	it('should execute the placeholder in each-item mode successfully', () => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		WorkflowPage.actions.addNodeToCanvas('Code');
		WorkflowPage.actions.openNodeNdv('Code');
		WorkflowPage.getters.ndvParameterInput('mode').click();
		WorkflowPage.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

		WorkflowPage.actions.executeNodeFromNdv();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});
});
