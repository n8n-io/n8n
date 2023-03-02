import { v4 as uuid } from 'uuid';
import { NDV, WorkflowPage as WorkflowPageClass, WorkflowsPage } from '../pages';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Execution', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		// Import workflow
		workflowsPage.getters.newWorkflowButtonCard().click();
		cy.waitForLoad();
	});

	it('should test manual workflow', () => {
		cy.createFixtureWorkflow('Manual_wait_set.json', `Manual wait set ${uuid()}`);

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
		workflowPage.getters
			.canvasNodeByName('Manual')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-check').should('not.exist'));
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-sync-alt'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('.fa-check').should('not.exist'));

		cy.wait(2000);

		// Check canvas nodes after 2nd step (waiting node finished its execution and the http request node is about to start)
		workflowPage.getters
			.canvasNodeByName('Manual')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('.fa-check'))
			.should('exist');

		// Clear execution data
		workflowPage.getters.clearExecutionDataButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');

		// Check success toast (works because Cypress waits enough for the element to show after the http request node has finished)
		workflowPage.getters.successToast().should('be.visible');
	});

	it('should test manual workflow stop', () => {
		cy.createFixtureWorkflow('Manual_wait_set.json', `Manual wait set ${uuid()}`);

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
		workflowPage.getters
			.canvasNodeByName('Manual')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-check').should('not.exist'));
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-sync-alt'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('.fa-check').should('not.exist'));

		cy.wait(1000);
		workflowPage.getters.stopExecutionButton().click();

		// Check canvas nodes after workflow stopped
		workflowPage.getters
			.canvasNodeByName('Manual')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-sync-alt').should('not.visible'));
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('.fa-check').should('not.exist'));

		// Clear execution data
		workflowPage.getters.clearExecutionDataButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');

		// Check success toast (works because Cypress waits enough for the element to show after the http request node has finished)
		workflowPage.getters.successToast().should('be.visible');
	});

	it('should test webhook workflow', () => {
		cy.createFixtureWorkflow('Webhook_wait_set.json', `Webhook wait set ${uuid()}`);

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
		workflowPage.getters.stopExecutionButton().should('not.exist');
		workflowPage.getters.stopExecutionWaitingForWebhookButton().should('be.visible');

		workflowPage.getters.canvasNodes().first().dblclick();

		ndv.getters.copyInput().click();

		cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');

		ndv.getters.backToCanvas().click();

		cy.readClipboard().then((url) => {
			cy.request({
				method: 'GET',
				url,
			}).then((resp) => {
				expect(resp.status).to.eq(200);
			});
		});

		// Check canvas nodes after 1st step (workflow passed the manual trigger node
		workflowPage.getters
			.canvasNodeByName('Webhook')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-check').should('not.exist'));
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-sync-alt'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('.fa-check').should('not.exist'));

		cy.wait(2000);

		// Check canvas nodes after 2nd step (waiting node finished its execution and the http request node is about to start)
		workflowPage.getters
			.canvasNodeByName('Webhook')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('.fa-check'))
			.should('exist');

		// Clear execution data
		workflowPage.getters.clearExecutionDataButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');

		// Check success toast (works because Cypress waits enough for the element to show after the http request node has finished)
		workflowPage.getters.successToast().should('be.visible');
	});

	it('should test webhook workflow stop', () => {
		cy.createFixtureWorkflow('Webhook_wait_set.json', `Webhook wait set ${uuid()}`);

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
		workflowPage.getters.stopExecutionButton().should('not.exist');
		workflowPage.getters.stopExecutionWaitingForWebhookButton().should('be.visible');

		workflowPage.getters.canvasNodes().first().dblclick();

		ndv.getters.copyInput().click();

		cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');

		ndv.getters.backToCanvas().click();

		cy.readClipboard().then((url) => {
			cy.request({
				method: 'GET',
				url,
			}).then((resp) => {
				expect(resp.status).to.eq(200);
			});
		});

		workflowPage.getters.stopExecutionButton().click();
		// Check canvas nodes after 1st step (workflow passed the manual trigger node
		workflowPage.getters
			.canvasNodeByName('Webhook')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-check').should('not.exist'));
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-sync-alt'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('.fa-check').should('not.exist'));


		// Check canvas nodes after workflow stopped
		workflowPage.getters
			.canvasNodeByName('Webhook')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('.fa-sync-alt').should('not.visible'));
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('.fa-check').should('not.exist'));

		// Clear execution data
		workflowPage.getters.clearExecutionDataButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');

		// Check success toast (works because Cypress waits enough for the element to show after the http request node has finished)
		workflowPage.getters.successToast().should('be.visible');
	});
});
