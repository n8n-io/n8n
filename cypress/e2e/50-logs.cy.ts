import * as executions from '../composables/executions';
import * as logs from '../composables/logs';
import * as chat from '../composables/modals/chat-modal';
import * as ndv from '../composables/ndv';
import * as workflow from '../composables/workflow';
import Workflow_chat from '../fixtures/Workflow_ai_agent.json';
import Workflow_if from '../fixtures/Workflow_if.json';
import Workflow_loop from '../fixtures/Workflow_loop.json';
import Workflow_wait_for_webhook from '../fixtures/Workflow_wait_for_webhook.json';

describe('Logs', () => {
	it('should populate logs as manual execution progresses', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_loop);
		workflow.clickZoomToFit();
		logs.openLogsPanel();
		logs.getLogEntries().should('have.length', 0);

		workflow.executeWorkflow();
		logs.getOverviewStatus().contains('Running').should('exist');

		logs.getLogEntries().should('have.length', 4);
		logs.getLogEntries().eq(0).should('contain.text', 'When clicking ‘Execute workflow’');
		logs.getLogEntries().eq(1).should('contain.text', 'Code');
		logs.getLogEntries().eq(2).should('contain.text', 'Loop Over Items');
		logs.getLogEntries().eq(3).should('contain.text', 'Wait');

		logs.getLogEntries().should('have.length', 6);
		logs.getLogEntries().eq(4).should('contain.text', 'Loop Over Items');
		logs.getLogEntries().eq(5).should('contain.text', 'Wait');

		logs.getLogEntries().should('have.length', 8);
		logs.getLogEntries().eq(6).should('contain.text', 'Loop Over Items');
		logs.getLogEntries().eq(7).should('contain.text', 'Wait');

		logs.getLogEntries().should('have.length', 10);
		logs.getLogEntries().eq(8).should('contain.text', 'Loop Over Items');
		logs.getLogEntries().eq(9).should('contain.text', 'Code1');
		logs
			.getOverviewStatus()
			.contains(/Error in [\d\.]+s/)
			.should('exist');
		logs.getSelectedLogEntry().should('contain.text', 'Code1'); // Errored node is automatically selected
		logs.getNodeErrorMessageHeader().should('contain.text', 'test!!! [line 1]');
		workflow.getNodeIssuesByName('Code1').should('exist');

		logs.pressClearExecutionButton();
		logs.getLogEntries().should('have.length', 0);
		workflow.getNodeIssuesByName('Code1').should('not.exist');
	});

	it('should allow to trigger partial execution', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_if);
		workflow.clickZoomToFit();
		logs.openLogsPanel();

		workflow.executeWorkflowAndWait(false);
		logs.getLogEntries().should('have.length', 6);
		logs.getLogEntries().eq(0).should('contain.text', 'Schedule Trigger');
		logs.getLogEntries().eq(1).should('contain.text', 'Code');
		logs.getLogEntries().eq(2).should('contain.text', 'Edit Fields');
		logs.getLogEntries().eq(3).should('contain.text', 'If');
		logs.getLogEntries().eq(4).should('contain.text', 'Edit Fields');
		logs.getLogEntries().eq(5).should('contain.text', 'Edit Fields');

		logs.clickTriggerPartialExecutionAtRow(3);
		logs.getLogEntries().should('have.length', 3);
		logs.getLogEntries().eq(0).should('contain.text', 'Schedule Trigger');
		logs.getLogEntries().eq(1).should('contain.text', 'Code');
		logs.getLogEntries().eq(2).should('contain.text', 'If');
	});

	// TODO: make it possible to test workflows with AI model end-to-end
	// eslint-disable-next-line n8n-local-rules/no-skipped-tests
	it.skip('should show input and output data in the selected display mode', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_chat);
		workflow.clickZoomToFit();
		logs.openLogsPanel();
		chat.sendManualChatMessage('Hi!');
		workflow.waitForSuccessBannerToAppear();
		chat.getManualChatMessages().eq(0).should('contain.text', 'Hi!');
		chat.getManualChatMessages().eq(1).should('contain.text', 'Hello from e2e model!!!');
		logs.getLogEntries().eq(2).should('have.text', 'E2E Chat Model');
		logs.getLogEntries().eq(2).click();

		logs.getOutputPanel().should('contain.text', 'Hello from e2e model!!!');
		logs.setOutputDisplayMode('table');
		logs.getOutputTbodyCell(1, 0).should('contain.text', 'text:Hello from **e2e** model!!!');
		logs.getOutputTbodyCell(1, 1).should('contain.text', 'completionTokens:20');
		logs.setOutputDisplayMode('schema');
		logs.getOutputPanel().should('contain.text', 'generations[0]');
		logs.getOutputPanel().should('contain.text', 'Hello from **e2e** model!!!');
		logs.setOutputDisplayMode('json');
		logs.getOutputPanel().should('contain.text', '[{"response": {"generations": [');

		logs.toggleInputPanel();
		logs.getInputPanel().should('contain.text', 'Human: Hi!');
		logs.setInputDisplayMode('table');
		logs.getInputTbodyCell(1, 0).should('contain.text', '0:Human: Hi!');
		logs.setInputDisplayMode('schema');
		logs.getInputPanel().should('contain.text', 'messages[0]');
		logs.getInputPanel().should('contain.text', 'Human: Hi!');
		logs.setInputDisplayMode('json');
		logs.getInputPanel().should('contain.text', '[{"messages": ["Human: Hi!"],');
	});

	it('should show input and output data of correct run index and branch', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_if);
		workflow.clickZoomToFit();
		logs.openLogsPanel();
		workflow.executeWorkflow();

		logs.clickLogEntryAtRow(2); // Run #1 of 'Edit Fields' node; input is 'Code' node
		logs.toggleInputPanel();
		logs.setInputDisplayMode('table');
		logs.getInputTableRows().should('have.length', 11);
		logs.getInputTbodyCell(1, 0).should('contain.text', '0');
		logs.getInputTbodyCell(10, 0).should('contain.text', '9');
		logs.clickOpenNdvAtRow(2);
		ndv.setInputDisplayMode('Table');
		ndv.getInputSelect().should('have.value', 'Code ');
		ndv.getInputTableRows().should('have.length', 11);
		ndv.getInputTbodyCell(1, 0).should('contain.text', '0');
		ndv.getInputTbodyCell(10, 0).should('contain.text', '9');
		ndv.getOutputRunSelectorInput().should('have.value', '1 of 3 (10 items)');

		ndv.clickGetBackToCanvas();

		logs.clickLogEntryAtRow(4); // Run #2 of 'Edit Fields' node; input is false branch of 'If' node
		logs.getInputTableRows().should('have.length', 6);
		logs.getInputTbodyCell(1, 0).should('contain.text', '5');
		logs.getInputTbodyCell(5, 0).should('contain.text', '9');
		logs.clickOpenNdvAtRow(4);
		ndv.getInputSelect().should('have.value', 'If ');
		ndv.getInputTableRows().should('have.length', 6);
		ndv.getInputTbodyCell(1, 0).should('contain.text', '5');
		ndv.getInputTbodyCell(5, 0).should('contain.text', '9');
		ndv.getOutputRunSelectorInput().should('have.value', '2 of 3 (5 items)');

		ndv.clickGetBackToCanvas();

		logs.clickLogEntryAtRow(5); // Run #3 of 'Edit Fields' node; input is true branch of 'If' node
		logs.getInputTableRows().should('have.length', 6);
		logs.getInputTbodyCell(1, 0).should('contain.text', '0');
		logs.getInputTbodyCell(5, 0).should('contain.text', '4');
		logs.clickOpenNdvAtRow(5);
		ndv.getInputSelect().should('have.value', 'If ');
		ndv.getInputTableRows().should('have.length', 6);
		ndv.getInputTbodyCell(1, 0).should('contain.text', '0');
		ndv.getInputTbodyCell(5, 0).should('contain.text', '4');
		ndv.getOutputRunSelectorInput().should('have.value', '3 of 3 (5 items)');
	});

	it('should keep populated logs unchanged when workflow get edits after the execution', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_if);
		workflow.clickZoomToFit();
		logs.openLogsPanel();

		workflow.executeWorkflowAndWait(false);
		logs.getLogEntries().should('have.length', 6);
		workflow.disableNode('Edit Fields');
		logs.getLogEntries().should('have.length', 6);
		workflow.deleteNode('If');
		logs.getLogEntries().should('have.length', 6);
	});

	// TODO: make it possible to test workflows with AI model end-to-end
	// eslint-disable-next-line n8n-local-rules/no-skipped-tests
	it.skip('should show logs for a past execution', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_chat);
		workflow.clickZoomToFit();
		logs.openLogsPanel();
		chat.sendManualChatMessage('Hi!');
		workflow.waitForSuccessBannerToAppear();
		workflow.openExecutions();
		executions.toggleAutoRefresh(); // Stop unnecessary background requests
		executions.getManualChatMessages().eq(0).should('contain.text', 'Hi!');
		executions.getManualChatMessages().eq(1).should('contain.text', 'Hello from e2e model!!!');
		executions
			.getLogsOverviewStatus()
			.contains(/Success in [\d\.]+m?s/)
			.should('exist');
		executions.getLogEntries().should('have.length', 3);
		executions.getLogEntries().eq(0).should('contain.text', 'When chat message received');
		executions.getLogEntries().eq(1).should('contain.text', 'AI Agent');
		executions.getLogEntries().eq(2).should('contain.text', 'E2E Chat Model');
	});

	it('should show logs for a workflow with a node that waits for webhook', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_wait_for_webhook);
		workflow.getCanvas().click('topLeft'); // click canvas to deselect nodes
		workflow.clickZoomToFit();
		logs.openLogsPanel();

		workflow.executeWorkflow();

		workflow.getNodesWithSpinner().should('contain.text', 'Wait');
		workflow.getWaitingNodes().should('contain.text', 'Wait');
		logs.getLogEntries().should('have.length', 2);
		logs.getLogEntries().eq(1).should('contain.text', 'Wait node');
		logs.getLogEntries().eq(1).should('contain.text', 'Waiting');

		workflow.openNode('Wait node');
		ndv
			.getOutputPanelDataContainer()
			.find('a')
			.should('have.attr', 'href')
			.then((url) => {
				cy.request(url as unknown as string).then((response) => {
					expect(response.status).to.eq(200);
				});
			});
		ndv.getBackToCanvasButton().click();

		workflow.getNodesWithSpinner().should('not.exist');
		workflow.getWaitingNodes().should('not.exist');
		logs
			.getOverviewStatus()
			.contains(/Success in [\d\.]+m?s/)
			.should('exist');
		logs.getLogEntries().eq(1).click(); // click selected row to deselect
		logs.getLogEntries().should('have.length', 2);
		logs.getLogEntries().eq(1).should('contain.text', 'Wait node');
		logs.getLogEntries().eq(1).should('contain.text', 'Success');
	});
});
