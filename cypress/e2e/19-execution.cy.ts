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

	it('should send proper payload for node rerun', () => {
		cy.createFixtureWorkflow(
			'Multiple_trigger_node_rerun.json',
			`Multiple trigger node rerun ${uuid()}`,
		);

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		workflowPage.getters.clearExecutionDataButton().should('be.visible');

		cy.intercept('POST', '/rest/workflows/**/run').as('workflowRun');

		workflowPage.getters
			.canvasNodeByName('do something with them')
			.findChildByTestId('execute-node-button')
			.click({ force: true });

		cy.wait('@workflowRun').then((interception) => {
			expect(interception.request.body).to.have.property('runData').that.is.an('object');
			const expectedKeys = ['When clicking "Test workflow"', 'fetch 5 random users'];

			expect(Object.keys(interception.request.body.runData)).to.have.lengthOf(expectedKeys.length);
			expect(interception.request.body.runData).to.include.all.keys(expectedKeys);
		});
	});

	it('should send proper payload for manual node run', () => {
		cy.createFixtureWorkflow(
			'Check_manual_node_run_for_pinned_and_rundata.json',
			`Check manual node run for pinned and rundata ${uuid()}`,
		);

		workflowPage.getters.zoomToFitButton().click();

		cy.intercept('POST', '/rest/workflows/**/run').as('workflowRun');

		workflowPage.getters
			.canvasNodeByName('If')
			.findChildByTestId('execute-node-button')
			.click({ force: true });

		cy.wait('@workflowRun').then((interception) => {
			expect(interception.request.body).not.to.have.property('runData').that.is.an('object');
			expect(interception.request.body).to.have.property('pinData').that.is.an('object');
			const expectedPinnedDataKeys = ['Webhook'];

			expect(Object.keys(interception.request.body.pinData)).to.have.lengthOf(
				expectedPinnedDataKeys.length,
			);
			expect(interception.request.body.pinData).to.include.all.keys(expectedPinnedDataKeys);
		});

		workflowPage.getters.clearExecutionDataButton().should('be.visible');

		cy.intercept('POST', '/rest/workflows/**/run').as('workflowRun');

		workflowPage.getters
			.canvasNodeByName('NoOp2')
			.findChildByTestId('execute-node-button')
			.click({ force: true });

		cy.wait('@workflowRun').then((interception) => {
			expect(interception.request.body).to.have.property('runData').that.is.an('object');
			expect(interception.request.body).to.have.property('pinData').that.is.an('object');
			const expectedPinnedDataKeys = ['Webhook'];
			const expectedRunDataKeys = ['If', 'Webhook'];

			expect(Object.keys(interception.request.body.pinData)).to.have.lengthOf(
				expectedPinnedDataKeys.length,
			);
			expect(interception.request.body.pinData).to.include.all.keys(expectedPinnedDataKeys);

			expect(Object.keys(interception.request.body.runData)).to.have.lengthOf(
				expectedRunDataKeys.length,
			);
			expect(interception.request.body.runData).to.include.all.keys(expectedRunDataKeys);
		});
	});

	it('should successfully execute partial executions with nodes attached to the second output', () => {
		cy.createFixtureWorkflow(
			'Test_Workflow_pairedItem_incomplete_manual_bug.json',
			'My test workflow',
		);

		cy.intercept('POST', '/rest/workflows/**/run').as('workflowRun');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();
		workflowPage.getters
			.canvasNodeByName('Test Expression')
			.findChildByTestId('execute-node-button')
			.click({ force: true });

		// Check  toast (works because Cypress waits enough for the element to show after the http request node has finished)
		// Wait for the execution to return.
		cy.wait('@workflowRun');
		// Wait again for the websocket message to arrive and the UI to update.
		cy.wait(100);
		workflowPage.getters.errorToast({ timeout: 1 }).should('not.exist');
	});

	it('should execute workflow partially up to the node that has issues', () => {
		cy.createFixtureWorkflow(
			'Test_workflow_partial_execution_with_missing_credentials.json',
			'My test workflow',
		);

		cy.intercept('POST', '/rest/workflows/**/run').as('workflowRun');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		// Wait for the execution to return.
		cy.wait('@workflowRun');

		// Check that the previous nodes executed successfully
		workflowPage.getters
			.canvasNodeByName('DebugHelper')
			.within(() => cy.get('.fa-check'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Filter')
			.within(() => cy.get('.fa-check'))
			.should('exist');

		workflowPage.getters.errorToast().should('contain', `Problem in node ‘Telegram‘`);
	});
});
