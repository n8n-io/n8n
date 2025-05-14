import {
	clickAssignmentCollectionAdd,
	clickGetBackToCanvas,
	getNodeRunInfoStale,
	getOutputTbodyCell,
} from '../composables/ndv';
import {
	clickExecuteWorkflowButton,
	getNodeByName,
	getZoomToFitButton,
	navigateToNewWorkflowPage,
	openNode,
} from '../composables/workflow';
import { NDV, WorkflowPage } from '../pages';

const canvas = new WorkflowPage();
const ndv = new NDV();

describe('Manual partial execution', () => {
	it('should not execute parent nodes with no run data', () => {
		canvas.actions.visit();

		cy.fixture('manual-partial-execution.json').then((data) => {
			cy.get('body').paste(JSON.stringify(data));
		});

		canvas.actions.zoomToFit();

		canvas.actions.openNode('Edit Fields');

		cy.get('button').contains('Execute step').click(); // create run data
		cy.get('button').contains('Execute step').click(); // use run data

		ndv.actions.close();

		canvas.actions.openNode('Webhook1');

		ndv.getters.nodeRunSuccessIndicator().should('not.exist');
		ndv.getters.nodeRunTooltipIndicator().should('not.exist');
		ndv.getters.outputRunSelector().should('not.exist');
	});

	describe('partial execution v2', () => {
		beforeEach(() => {
			cy.window().then((win) => {
				win.localStorage.setItem('PartialExecution.version', '2');
			});
			navigateToNewWorkflowPage();
		});

		it('should execute from the first dirty node up to the current node', () => {
			cy.createFixtureWorkflow('Test_workflow_partial_execution_v2.json');

			getZoomToFitButton().click();

			// First, execute the whole workflow
			clickExecuteWorkflowButton();

			getNodeByName('A').findChildByTestId('canvas-node-status-success').should('be.visible');
			getNodeByName('B').findChildByTestId('canvas-node-status-success').should('be.visible');
			getNodeByName('C').findChildByTestId('canvas-node-status-success').should('be.visible');
			openNode('A');
			getOutputTbodyCell(1, 0).invoke('text').as('before', { type: 'static' });
			clickGetBackToCanvas();

			// Change parameter of the node in the middle
			openNode('B');
			clickAssignmentCollectionAdd();
			getNodeRunInfoStale().should('be.visible');
			clickGetBackToCanvas();

			getNodeByName('A').findChildByTestId('canvas-node-status-success').should('be.visible');
			getNodeByName('B').findChildByTestId('canvas-node-status-warning').should('be.visible');
			getNodeByName('C').findChildByTestId('canvas-node-status-success').should('be.visible');

			// Partial execution
			getNodeByName('C').findChildByTestId('execute-node-button').click();

			getNodeByName('A').findChildByTestId('canvas-node-status-success').should('be.visible');
			getNodeByName('B').findChildByTestId('canvas-node-status-success').should('be.visible');
			getNodeByName('C').findChildByTestId('canvas-node-status-success').should('be.visible');
			openNode('A');
			getOutputTbodyCell(1, 0).invoke('text').as('after', { type: 'static' });

			// Assert that 'A' ran only once by comparing its output
			cy.get('@before').then((before) =>
				cy.get('@after').then((after) => expect(before).to.equal(after)),
			);
		});
	});
});
