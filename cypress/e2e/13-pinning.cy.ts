import {
	HTTP_REQUEST_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	PIPEDRIVE_NODE_NAME,
	SET_NODE_NAME,
} from '../constants';
import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Data pinning', () => {
	before(() => {
		cy.skipSetup();
	});

	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('Should be able to pin node output', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.getters.container().should('be.visible');
		ndv.getters.pinDataButton().should('not.exist');
		ndv.getters.editPinnedDataButton().should('be.visible');

		ndv.actions.execute();

		ndv.getters.outputDataContainer().should('be.visible');
		// We hover over the table to get rid of the pinning tooltip which would overlay the table
		// slightly and cause the test to fail
		ndv.getters.outputDataContainer().get('table').realHover().should('be.visible');
		ndv.getters.outputTableRows().should('have.length', 2);
		ndv.getters.outputTableHeaders().should('have.length.at.least', 10);
		ndv.getters.outputTableHeaders().first().should('include.text', 'timestamp');
		ndv.getters.outputTableHeaders().eq(1).should('include.text', 'Readable date');

		ndv.getters
			.outputTbodyCell(1, 0)
			.invoke('text')
			.then((prevValue) => {
				ndv.actions.pinData();
				ndv.actions.close();

				workflowPage.actions.executeWorkflow();
				workflowPage.actions.openNode('Schedule Trigger');

				ndv.getters.outputTbodyCell(1, 0).invoke('text').should('eq', prevValue);
			});
	});

	it('Should be able to set pinned data', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger', { keepNdvOpen: true });
		ndv.getters.container().should('be.visible');
		ndv.getters.pinDataButton().should('not.exist');
		ndv.getters.editPinnedDataButton().should('be.visible');

		ndv.actions.setPinnedData([{ test: 1 }]);

		ndv.getters.outputTableRows().should('have.length', 2);
		ndv.getters.outputTableHeaders().should('have.length', 2);
		ndv.getters.outputTableHeaders().first().should('include.text', 'test');
		ndv.getters.outputTbodyCell(1, 0).should('include.text', 1);

		ndv.actions.close();

		workflowPage.actions.saveWorkflowOnButtonClick();

		cy.reload();
		workflowPage.actions.openNode('Schedule Trigger');

		ndv.getters.outputTableHeaders().first().should('include.text', 'test');
		ndv.getters.outputTbodyCell(1, 0).should('include.text', 1);
	});

	it('Should be able to reference paired items in a node located before pinned data', () => {
		workflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(HTTP_REQUEST_NODE_NAME, true, true);
		ndv.actions.setPinnedData([{ http: 123 }]);
		ndv.actions.close();

		workflowPage.actions.addNodeToCanvas(PIPEDRIVE_NODE_NAME, true, true);
		ndv.actions.setPinnedData(Array(3).fill({ pipedrive: 123 }));
		ndv.actions.close();

		workflowPage.actions.addNodeToCanvas(SET_NODE_NAME, true, true);
		setExpressionOnStringValueInSet(`{{ $('${HTTP_REQUEST_NODE_NAME}').item`);

		const output = '[Object: {"json": {"http": 123}, "pairedItem": {"item": 0}}]';

		cy.get('div').contains(output).should('be.visible');
	});
});

function setExpressionOnStringValueInSet(expression: string) {
	cy.get('button').contains('Execute node').click();
	cy.get('input[placeholder="Add Value"]').click();
	cy.get('span').contains('String').click();

	ndv.getters.nthParam(3).contains('Expression').invoke('show').click();

	ndv.getters
		.inlineExpressionEditorInput()
		.clear()
		.type(expression, { parseSpecialCharSequences: false });
}
