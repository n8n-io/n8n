import * as logs from '../composables/logs';
import * as ndv from '../composables/ndv';
import * as workflow from '../composables/workflow';
import Workflow from '../fixtures/Workflow_if.json';

describe('Logs', () => {
	beforeEach(() => {
		cy.overrideSettings({ logsView: { enabled: true } });
	});

	it('should show input and output data of correct run index and branch', () => {
		workflow.navigateToNewWorkflowPage();
		workflow.pasteWorkflow(Workflow);
		workflow.clickZoomToFit();
		logs.openLogsPanel();
		workflow.executeWorkflowAndWait(false);

		logs.clickLogEntryAtRow(2); // Run #1 of 'Edit Fields' node; input is 'Code' node
		logs.toggleInputPanel();
		logs.setInputDisplayMode('table');
		logs.getInputTableRows().should('have.length', 11);
		logs.getInputTbodyCell(1, 0).should('contain.text', '0');
		logs.getInputTbodyCell(10, 0).should('contain.text', '9');
		logs.clickOpenNdvAtRow(2);
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
});
