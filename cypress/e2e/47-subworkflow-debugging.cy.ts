import {
	changeOutputRunSelector,
	getOutputPanelItemsCount,
	getOutputPanelRelatedExecutionLink,
	getOutputRunSelectorInput,
	getOutputTableHeaders,
	getOutputTableRows,
	getOutputTbodyCell,
} from '../composables/ndv';
import {
	clickExecuteWorkflowButton,
	clickZoomToFit,
	getCanvasNodes,
	navigateToNewWorkflowPage,
	openNode,
	pasteWorkflow,
	saveWorkflowOnButtonClick,
} from '../composables/workflow';
import SUBWORKFLOW_DEBUGGING_EXAMPLE from '../fixtures/Subworkflow-debugging-execute-workflow.json';

describe('Subworkflow debugging', () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
		pasteWorkflow(SUBWORKFLOW_DEBUGGING_EXAMPLE);
		saveWorkflowOnButtonClick();
		getCanvasNodes().should('have.length', 11);
		clickZoomToFit();

		clickExecuteWorkflowButton();
	});

	describe('can inspect sub executed workflow', () => {
		it('(Run once with all items/ Wait for Sub-workflow completion) (default behavior)', () => {
			openNode('Execute Workflow with param');

			getOutputPanelItemsCount().should('contain.text', '2 items, 1 sub-execution');
			getOutputPanelRelatedExecutionLink().should('contain.text', 'View sub-execution');
			getOutputPanelRelatedExecutionLink().should('have.attr', 'href');

			// ensure workflow executed and waited on output
			getOutputTableHeaders().should('have.length', 2);
			getOutputTbodyCell(1, 0).should('have.text', 'world Natalie Moore');
		});

		it('(Run once for each item/ Wait for Sub-workflow completion)', () => {
			openNode('Execute Workflow with param1');

			getOutputPanelItemsCount().should('contain.text', '2 items, 2 sub-execution');
			getOutputPanelRelatedExecutionLink().should('not.exist');

			// ensure workflow executed and waited on output
			getOutputTableHeaders().should('have.length', 3);
			getOutputTbodyCell(1, 0).find('a').should('have.attr', 'href');
			getOutputTbodyCell(1, 1).should('have.text', 'world Natalie Moore');
		});

		it('(Run once with all items/ Wait for Sub-workflow completion)', () => {
			openNode('Execute Workflow with param2');

			getOutputPanelItemsCount().should('not.exist');
			getOutputPanelRelatedExecutionLink().should('contain.text', 'View sub-execution');
			getOutputPanelRelatedExecutionLink().should('have.attr', 'href');

			// ensure workflow executed but returned same data as input
			getOutputRunSelectorInput().should('have.value', '2 of 2 (3 items, 1 sub-execution)');
			getOutputTableHeaders().should('have.length', 6);
			getOutputTableHeaders().eq(0).should('have.text', 'uid');
			getOutputTableRows().should('have.length', 4);
			getOutputTbodyCell(1, 1).should('include.text', 'Jon_Ebert@yahoo.com');

			changeOutputRunSelector('1 of 2 (2 items, 1 sub-execution)');
			getOutputRunSelectorInput().should('have.value', '1 of 2 (2 items, 1 sub-execution)');
			getOutputTableHeaders().should('have.length', 6);
			getOutputTableHeaders().eq(0).should('have.text', 'uid');
			getOutputTableRows().should('have.length', 3);
			getOutputTbodyCell(1, 1).should('include.text', 'Terry.Dach@hotmail.com');
		});

		it('(Run once for each item/ Wait for Sub-workflow completion)', () => {
			openNode('Execute Workflow with param3');

			// ensure workflow executed but returned same data as input
			getOutputRunSelectorInput().should('have.value', '2 of 2 (3 items, 3 sub-executions)');
			getOutputTableHeaders().should('have.length', 7);
			getOutputTableHeaders().eq(1).should('have.text', 'uid');
			getOutputTableRows().should('have.length', 4);
			getOutputTbodyCell(1, 0).find('a').should('have.attr', 'href');
			getOutputTbodyCell(1, 2).should('include.text', 'Jon_Ebert@yahoo.com');

			changeOutputRunSelector('1 of 2 (2 items, 2 sub-executions)');
			getOutputRunSelectorInput().should('have.value', '1 of 2 (2 items, 2 sub-executions)');
			getOutputTableHeaders().should('have.length', 7);
			getOutputTableHeaders().eq(1).should('have.text', 'uid');
			getOutputTableRows().should('have.length', 3);

			getOutputTbodyCell(1, 0).find('a').should('have.attr', 'href');
			getOutputTbodyCell(1, 2).should('include.text', 'Terry.Dach@hotmail.com');
		});
	});
});
