import { clickGetBackToCanvas, getNdvContainer, getOutputTableRow } from '../composables/ndv';
import {
	clickExecuteWorkflowButton,
	getExecuteWorkflowButton,
	getNodeByName,
	getZoomToFitButton,
	openNode,
} from '../composables/workflow';
import { SCHEDULE_TRIGGER_NODE_NAME, EDIT_FIELDS_SET_NODE_NAME } from '../constants';
import { NDV, WorkflowExecutionsTab, WorkflowPage as WorkflowPageClass } from '../pages';
import { clearNotifications, errorToast, successToast } from '../pages/notifications';

const workflowPage = new WorkflowPageClass();
const executionsTab = new WorkflowExecutionsTab();
const ndv = new NDV();

describe('Execution', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should test manual workflow', () => {
		cy.createFixtureWorkflow('Manual_wait_set.json');

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
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=node-success]').should('not.exist'));
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=refresh-cw]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('svg[data-icon=node-success]').should('not.exist'));

		cy.wait(2000);

		// Check canvas nodes after 2nd step (waiting node finished its execution and the http request node is about to start)
		workflowPage.getters
			.canvasNodeByName('Manual')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		successToast().should('be.visible');
		clearNotifications();

		// Clear execution data
		workflowPage.getters.clearExecutionDataButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');
	});

	it('should test manual workflow stop', () => {
		cy.createFixtureWorkflow('Manual_wait_set.json');

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
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=node-success]').should('not.exist'));
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=refresh-cw]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('svg[data-icon=node-success]').should('not.exist'));

		successToast().should('be.visible');
		clearNotifications();

		workflowPage.getters.stopExecutionButton().should('exist');
		workflowPage.getters.stopExecutionButton().click();

		// Check canvas nodes after workflow stopped
		workflowPage.getters
			.canvasNodeByName('Manual')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=refresh-cw]').should('not.exist'));

		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('svg[data-icon=node-success]').should('not.exist'));

		successToast().should('be.visible');

		// Clear execution data
		workflowPage.getters.clearExecutionDataButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');
	});

	it('should test webhook workflow', () => {
		cy.createFixtureWorkflow('Webhook_wait_set.json');

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
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=node-success]').should('not.exist'));
		workflowPage.getters
			.canvasNodeByName('Wait')
			.within(() => cy.get('svg[data-icon=refresh-cw]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('svg[data-icon=node-success]').should('not.exist'));

		cy.wait(2000);

		// Check canvas nodes after 2nd step (waiting node finished its execution and the http request node is about to start)
		workflowPage.getters
			.canvasNodeByName('Webhook')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Set')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		successToast().should('be.visible');
		clearNotifications();

		// Clear execution data
		workflowPage.getters.clearExecutionDataButton().should('be.visible');
		workflowPage.getters.clearExecutionDataButton().click();
		workflowPage.getters.clearExecutionDataButton().should('not.exist');
	});

	it('should test workflow with specific trigger node', () => {
		cy.createFixtureWorkflow('Two_schedule_triggers.json');

		getZoomToFitButton().click();
		getExecuteWorkflowButton('Trigger A').should('not.be.visible');
		getExecuteWorkflowButton('Trigger B').should('not.be.visible');

		// Execute the workflow from trigger A
		getNodeByName('Trigger A').realHover();
		getExecuteWorkflowButton('Trigger A').should('be.visible');
		getExecuteWorkflowButton('Trigger B').should('not.be.visible');
		clickExecuteWorkflowButton('Trigger A');

		// Check the output
		successToast().contains('Workflow executed successfully');
		openNode('Edit Fields');
		getOutputTableRow(1).should('include.text', 'Trigger A');

		clickGetBackToCanvas();
		getNdvContainer().should('not.be.visible');

		// Execute the workflow from trigger B
		getNodeByName('Trigger B').realHover();
		getExecuteWorkflowButton('Trigger A').should('not.be.visible');
		getExecuteWorkflowButton('Trigger B').should('be.visible');
		clickExecuteWorkflowButton('Trigger B');

		// Check the output
		successToast().contains('Workflow executed successfully');
		openNode('Edit Fields');
		getOutputTableRow(1).should('include.text', 'Trigger B');
	});

	describe('execution preview', () => {
		it('when deleting the last execution, it should show empty state', () => {
			workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
			workflowPage.actions.executeWorkflow();
			executionsTab.actions.switchToExecutionsTab();

			executionsTab.actions.deleteExecutionInPreview();

			executionsTab.getters.successfulExecutionListItems().should('have.length', 0);
			successToast().contains('Execution deleted');
		});
	});

	/**
	 * @TODO New Canvas: Different classes for pinned states on edges and nodes
	 */
	// eslint-disable-next-line n8n-local-rules/no-skipped-tests
	describe.skip('connections should be colored differently for pinned data', () => {
		beforeEach(() => {
			cy.createFixtureWorkflow('Schedule_pinned.json');
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
		cy.createFixtureWorkflow('Multiple_trigger_node_rerun.json', 'Multiple trigger node rerun');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		workflowPage.getters.clearExecutionDataButton().should('be.visible');

		cy.intercept('POST', '/rest/workflows/**/run?**').as('workflowRun');

		workflowPage.getters
			.canvasNodeByName('Process The Data')
			.findChildByTestId('execute-node-button')
			.click({ force: true });

		cy.wait('@workflowRun').then((interception) => {
			expect(interception.request.body).to.have.property('runData').that.is.an('object');

			const expectedKeys = ['Start on Schedule', 'Edit Fields', 'Process The Data'];

			const { runData } = interception.request.body;
			expect(Object.keys(runData)).to.have.lengthOf(expectedKeys.length);
			expect(runData).to.include.all.keys(expectedKeys);
		});
	});

	it('should send proper payload for manual node run', () => {
		cy.createFixtureWorkflow('Check_manual_node_run_for_pinned_and_rundata.json');

		workflowPage.getters.zoomToFitButton().click();

		cy.intercept('POST', '/rest/workflows/**/run?**').as('workflowRun');

		workflowPage.getters
			.canvasNodeByName('If')
			.findChildByTestId('execute-node-button')
			.click({ force: true });

		cy.wait('@workflowRun').then((interception) => {
			expect(interception.request.body).not.to.have.property('runData').that.is.an('object');
			expect(interception.request.body).to.have.property('workflowData').that.is.an('object');
			expect(interception.request.body.workflowData)
				.to.have.property('pinData')
				.that.is.an('object');
			const expectedPinnedDataKeys = ['Webhook'];

			const { pinData } = interception.request.body.workflowData as Record<string, object>;
			expect(Object.keys(pinData)).to.have.lengthOf(expectedPinnedDataKeys.length);
			expect(pinData).to.include.all.keys(expectedPinnedDataKeys);
		});

		workflowPage.getters.clearExecutionDataButton().should('be.visible');

		cy.intercept('POST', '/rest/workflows/**/run?**').as('workflowRun');

		workflowPage.getters
			.canvasNodeByName('NoOp2')
			.findChildByTestId('execute-node-button')
			.click({ force: true });

		cy.wait('@workflowRun').then((interception) => {
			expect(interception.request.body).to.have.property('runData').that.is.an('object');
			expect(interception.request.body).to.have.property('workflowData').that.is.an('object');
			expect(interception.request.body.workflowData)
				.to.have.property('pinData')
				.that.is.an('object');
			const expectedPinnedDataKeys = ['Webhook'];
			const expectedRunDataKeys = ['If', 'Webhook'];

			const { pinData } = interception.request.body.workflowData as Record<string, object>;
			expect(Object.keys(pinData)).to.have.lengthOf(expectedPinnedDataKeys.length);
			expect(pinData).to.include.all.keys(expectedPinnedDataKeys);

			const { runData } = interception.request.body as Record<string, object>;
			expect(Object.keys(runData)).to.have.lengthOf(expectedRunDataKeys.length);
			expect(runData).to.include.all.keys(expectedRunDataKeys);
		});
	});

	it('should successfully execute partial executions with nodes attached to the second output', () => {
		cy.createFixtureWorkflow('Test_Workflow_pairedItem_incomplete_manual_bug.json');

		cy.intercept('POST', '/rest/workflows/**/run?**').as('workflowRun');

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
		errorToast({ timeout: 1 }).should('not.exist');
	});

	it('should execute workflow partially up to the node that has issues', () => {
		cy.createFixtureWorkflow('Test_workflow_partial_execution_with_missing_credentials.json');

		cy.intercept('POST', '/rest/workflows/**/run?**').as('workflowRun');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		// Wait for the execution to return.
		cy.wait('@workflowRun');

		// Check that the previous nodes executed successfully
		workflowPage.getters
			.canvasNodeByName('DebugHelper')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');
		workflowPage.getters
			.canvasNodeByName('Filter')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		errorToast().should('contain', 'Problem in node ‘Telegram‘');
	});

	it('Paired items should be correctly mapped after passed through the merge node with more than two inputs', () => {
		cy.createFixtureWorkflow('merge_node_inputs_paired_items.json');

		workflowPage.getters.zoomToFitButton().click();
		workflowPage.getters.executeWorkflowButton().click();

		workflowPage.getters
			.canvasNodeByName('Edit Fields')
			.within(() => cy.get('svg[data-icon=node-success]'))
			.should('exist');

		workflowPage.getters.canvasNodeByName('Edit Fields').dblclick();
		ndv.actions.switchOutputMode('JSON');
		ndv.getters.outputPanel().contains('Branch 1 Value').should('be.visible');
		ndv.getters.outputPanel().contains('Branch 2 Value').should('be.visible');
		ndv.getters.outputPanel().contains('Branch 3 Value').should('be.visible');
	});
});
