import { v4 as uuid } from 'uuid';
import { NDV, WorkflowExecutionsTab, WorkflowPage as WorkflowPageClass } from '../pages';
import { SCHEDULE_TRIGGER_NODE_NAME, EDIT_FIELDS_SET_NODE_NAME } from '../constants';

const workflowPage = new WorkflowPageClass();
const executionsTab = new WorkflowExecutionsTab();
const ndv = new NDV();

describe('Execution', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
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

		workflowPage.getters.stopExecutionButton().should('exist');
		workflowPage.getters.stopExecutionButton().click();

		// Check canvas nodes after workflow stopped
		workflowPage.getters
			.canvasNodeByName('Manual')
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

	describe('execution preview', () => {
		it('when deleting the last execution, it should show empty state', () => {
			workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
			workflowPage.actions.executeWorkflow();
			executionsTab.actions.switchToExecutionsTab();

			executionsTab.actions.deleteExecutionInPreview();

			executionsTab.getters.successfulExecutionListItems().should('have.length', 0);
			workflowPage.getters.successToast().contains('Execution deleted');
		});
	});

	describe('connections should be colored differently for pinned data', () => {
		beforeEach(() => {
			cy.createFixtureWorkflow('Schedule_pinned.json', `Schedule pinned ${uuid()}`);
			workflowPage.actions.deselectAll();
			workflowPage.getters.zoomToFitButton().click();

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields1')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields5', 'Edit Fields6')
				.should('not.have.class', 'success')
				.should('not.have.class', 'pinned');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields7', 'Edit Fields9')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields1', 'Edit Fields2')
				.should('not.have.class', 'success')
				.should('not.have.class', 'pinned');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields2', 'Edit Fields3')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('not.have.class', 'has-run');
		});

		it('when executing the workflow', () => {
			workflowPage.actions.executeWorkflow();

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields1')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields5', 'Edit Fields6')
				.should('have.class', 'success')
				.should('not.have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields7', 'Edit Fields9')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields1', 'Edit Fields2')
				.should('have.class', 'success')
				.should('not.have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields2', 'Edit Fields3')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');
		});

		it('when executing a node', () => {
			workflowPage.actions.executeNode('Edit Fields3');

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields1')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields5', 'Edit Fields6')
				.should('not.have.class', 'success')
				.should('not.have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields7', 'Edit Fields9')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields1', 'Edit Fields2')
				.should('have.class', 'success')
				.should('not.have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields2', 'Edit Fields3')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');
		});

		it('when connecting pinned node by output drag and drop', () => {
			cy.drag(
				workflowPage.getters.getEndpointSelector('output', SCHEDULE_TRIGGER_NODE_NAME),
				[-200, -300],
			);
			workflowPage.getters.nodeCreatorSearchBar().should('be.visible');
			workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, false);
			cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', [150, 200], {
				clickToFinish: true,
			});

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields8')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.actions.executeWorkflow();

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields8')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');

			cy.drag(workflowPage.getters.getEndpointSelector('output', 'Edit Fields2'), [-200, -300]);
			workflowPage.getters.nodeCreatorSearchBar().should('be.visible');
			workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, false);
			cy.drag('[data-test-id="canvas-node"].jtk-drag-selected', [150, 200], {
				clickToFinish: true,
			});

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields2', 'Edit Fields11')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');
		});

		it('when connecting pinned node after adding an unconnected node', () => {
			workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);

			cy.draganddrop(
				workflowPage.getters.getEndpointSelector('output', SCHEDULE_TRIGGER_NODE_NAME),
				workflowPage.getters.getEndpointSelector('input', 'Edit Fields8'),
			);
			workflowPage.getters.zoomToFitButton().click();

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields8')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('not.have.class', 'has-run');

			workflowPage.actions.executeWorkflow();

			workflowPage.getters
				.getConnectionBetweenNodes('Schedule Trigger', 'Edit Fields8')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');

			workflowPage.actions.deselectAll();
			workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
			workflowPage.getters.zoomToFitButton().click();

			cy.draganddrop(
				workflowPage.getters.getEndpointSelector('output', 'Edit Fields7'),
				workflowPage.getters.getEndpointSelector('input', 'Edit Fields11'),
			);

			workflowPage.getters
				.getConnectionBetweenNodes('Edit Fields7', 'Edit Fields11')
				.should('have.class', 'success')
				.should('have.class', 'pinned')
				.should('have.class', 'has-run');
		});
	});
});
