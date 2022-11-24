import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { v4 as uuid } from 'uuid';

const workflowsPage = new WorkflowsPageClass();
const workflowPage = new WorkflowPageClass();

describe('NDV', () => {
	const workflowName = `Webhook Code Set ${uuid()}`;

	beforeEach(() => {
		cy.skipSetup();
		workflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		workflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Webhook-Code-Set-nodes.json', workflowName);
	});

	afterEach(() => {
		cy.deleteWorkflowByName(workflowName);
	});

	it('should should check nodes', () => {
		workflowPage.getters.nodeByName('Webhook').should('be.visible');
	});


	// TODO test NDV for each node

});
