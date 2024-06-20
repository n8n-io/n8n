import { NDV, WorkflowPage as WorkflowPageClass } from '../pages';
import { successToast } from '../pages/notifications';

const workflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('ADO-1338-ndv-missing-input-panel', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should show the input and output panels when node is missing input and output data', () => {
		cy.createFixtureWorkflow('Test_ado_1338.json');

		// Execute the workflow
		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();
		// Check success toast (works because Cypress waits enough for the element to show after the http request node has finished)
		successToast().should('be.visible');

		workflowPage.actions.openNode('Discourse1');
		ndv.getters.inputPanel().should('be.visible');
		ndv.getters.outputPanel().should('be.visible');
	});
});
