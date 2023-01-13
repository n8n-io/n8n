import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { NDV } from '../pages/ndv';

const WorkflowPage = new WorkflowPageClass();
const ndv = new NDV();

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
		ndv.getters.parameterInput('mode').click();
		ndv.actions.selectOptionInParameterDropdown('mode', 'Run Once for Each Item');

		WorkflowPage.actions.executeNodeFromNdv();

		WorkflowPage.getters.successToast().contains('Node executed successfully');
	});
});
