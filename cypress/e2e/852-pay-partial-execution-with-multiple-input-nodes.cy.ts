import { v4 as uuid } from 'uuid';
import { NDV, WorkflowPage as WorkflowPageClass } from '../pages';

const workflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('pay-852-partial-workflow-executions-with-run-data-and-merge-node', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('it should combine old and new run data during partial executions for nodes with multiple inputs', () => {
		cy.createFixtureWorkflow('Test_pay_852.json', uuid());

		// Execute the workflow
		workflowPage.getters.zoomToFitButton().click();
		workflowPage.actions.deselectAll();

		// execute input 1 first then the rest
		workflowPage.actions.executeNode('Set Input 1');
		workflowPage.actions.executeNode('Set Output');
		workflowPage.actions.openNode('Merge');
		ndv.getters.nodeRunErrorIndicator().should('not.exist');
		ndv.getters.nodeRunSuccessIndicator().should('be.visible');
		ndv.actions.close();

		// execute input 2 first then the rest
		workflowPage.actions.executeNode('Set Input 2');
		workflowPage.actions.executeNode('Set Output');
		workflowPage.actions.openNode('Merge');
		ndv.getters.nodeRunErrorIndicator().should('not.exist');
		ndv.getters.nodeRunSuccessIndicator().should('be.visible');
	});
});
