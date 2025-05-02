import * as executions from '../composables/executions';
import * as logs from '../composables/logs';
import * as ndv from '../composables/ndv';
import * as workflow from '../composables/workflow';
import Workflow_if from '../fixtures/Workflow_if.json';
import Workflow_loop from '../fixtures/Workflow_loop.json';

describe('Logs', () => {
	beforeEach(() => {
		cy.overrideSettings({ logsView: { enabled: true } });
	});

	it('should populate logs as manual execution progresses', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_loop);
		workflow.clickZoomToFit();
		logs.openLogsPanel();
		logs.getLogEntries().should('have.length', 0);

		workflow.executeWorkflow();
		logs.getOverviewStatus().contains('Running').should('exist');

		logs.getLogEntries().should('have.length', 4);
		logs.getLogEntries().eq(0).should('contain.text', 'When clicking ‘Test workflow’');
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

	it('should show logs for a past execution', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow_if);
		workflow.clickZoomToFit();
		logs.openLogsPanel();

		workflow.executeWorkflowAndWait(false);
		executions.openExecutions();
		// TODO: make this work
		executions
			.getLogsOverviewStatus()
			.contains(/Success in [\d\.]+s/)
			.should('exist');
	});
});
