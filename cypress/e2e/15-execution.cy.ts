import { v4 as uuid } from 'uuid';
import { WorkflowPage as WorkflowPageClass, WorkflowsPage } from '../pages';

const workflowPage = new WorkflowPageClass();
const workflowsPage = new WorkflowsPage();

describe('Execution',() => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
		cy.visit('/');
	});

	it('should test manual workflow', () => {
		// Import workflow
		workflowsPage.getters.newWorkflowButtonCard().click();
		cy.createFixtureWorkflow('Manual_waiting_set.json', `Manual waiting set ${uuid()}`);

		// Check workflow buttons
		workflowPage.getters.executeWorkflowButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().should('not.exist');
		workflowPage.getters.stopExecutionButton().should('not.exist');
		workflowPage.getters.stopExecutionWaitingForWebhookButton().should('not.exist');

		// Execute the workflow
		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		// Check workflow buttons
		workflowPage.getters.executeWorkflowButton().get('.n8n-spinner').should('be.visible');
		workflowPage.getters.clearExecutionDataButton().should('not.exist');
		workflowPage.getters.stopExecutionButton().should('be.visible');
		workflowPage.getters.stopExecutionWaitingForWebhookButton().should('not.exist');

		// Check canvas nodes after 1st step (workflow passed the manual trigger node
		workflowPage.getters.canvasNodeByName('Manual').within(() => cy.get('.fa-check')).should('be.visible');
		workflowPage.getters.canvasNodeByName('Wait').within(() => cy.get('.fa-check').should('not.exist'));
		workflowPage.getters.canvasNodeByName('Wait').within(() => cy.get('.fa-sync-alt')).should('be.visible');
		workflowPage.getters.canvasNodeByName('Set').within(() => cy.get('.fa-check').should('not.exist'));

		cy.wait(2000);

		// Check canvas nodes after 2nd step (waiting node finished its execution and the http request node is about to start)
		workflowPage.getters.canvasNodeByName('Manual').within(() => cy.get('.fa-check')).should('be.visible');
		workflowPage.getters.canvasNodeByName('Wait').within(() => cy.get('.fa-check')).should('be.visible');
		workflowPage.getters.canvasNodeByName('Set').within(() => cy.get('.fa-check')).should('be.visible');

		// Check success toast (works because Cypress waits enough for the element to show after the http request node has finished)
		workflowPage.getters.successToast().should('be.visible');
	});
});
