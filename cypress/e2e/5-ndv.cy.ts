import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { v4 as uuid } from 'uuid';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

describe('NDV', () => {
	beforeEach(() => {
		cy.skipSetup();
	});

	it('should create a new workflow', () => {
		WorkflowsPage.getters.newWorkflowButtonCard().should('be.visible');
		WorkflowsPage.getters.newWorkflowButtonCard().click();

		cy.createFixtureWorkflow('Webhook-Code-Set-nodes.json', `Webhook Code Set ${uuid()}`);

		WorkflowPage.getters.nodes().should('be.visible');
	})

	// TODO test NDV for each node

});
