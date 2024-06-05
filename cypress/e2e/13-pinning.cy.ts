import {
	HTTP_REQUEST_NODE_NAME,
	MANUAL_TRIGGER_NODE_NAME,
	PIPEDRIVE_NODE_NAME,
	EDIT_FIELDS_SET_NODE_NAME,
	BACKEND_BASE_URL,
} from '../constants';
import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Data pinning', () => {
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

		workflowPage.actions.openNode('Schedule Trigger');

		ndv.getters.outputTableHeaders().first().should('include.text', 'test');
		ndv.getters.outputTbodyCell(1, 0).should('include.text', 1);
	});

	it('should display pin data edit button for Webhook node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Webhook', { keepNdvOpen: true });

		ndv.getters
			.runDataPaneHeader()
			.find('button')
			.filter(':visible')
			.should('have.attr', 'title', 'Edit Output');
	});

	it('Should be duplicating pin data when duplicating node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true, true);
		ndv.getters.container().should('be.visible');
		ndv.getters.pinDataButton().should('not.exist');
		ndv.getters.editPinnedDataButton().should('be.visible');

		ndv.actions.setPinnedData([{ test: 1 }]);
		ndv.actions.close();

		workflowPage.actions.duplicateNode(EDIT_FIELDS_SET_NODE_NAME);

		workflowPage.actions.saveWorkflowOnButtonClick();

		workflowPage.actions.openNode('Edit Fields1');

		ndv.getters.outputTableHeaders().first().should('include.text', 'test');
		ndv.getters.outputTbodyCell(1, 0).should('include.text', 1);
	});

	it('Should be able to pin data from canvas (context menu or shortcut)', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
		workflowPage.actions.openContextMenu(EDIT_FIELDS_SET_NODE_NAME, 'overflow-button');
		workflowPage.getters
			.contextMenuAction('toggle_pin')
			.parent()
			.should('have.class', 'is-disabled');

		// Unpin using context menu
		workflowPage.actions.openNode(EDIT_FIELDS_SET_NODE_NAME);
		ndv.actions.setPinnedData([{ test: 1 }]);
		ndv.actions.close();
		workflowPage.actions.pinNode(EDIT_FIELDS_SET_NODE_NAME);
		workflowPage.actions.openNode(EDIT_FIELDS_SET_NODE_NAME);
		ndv.getters.nodeOutputHint().should('exist');
		ndv.actions.close();

		// Unpin using shortcut
		workflowPage.actions.openNode(EDIT_FIELDS_SET_NODE_NAME);
		ndv.actions.setPinnedData([{ test: 1 }]);
		ndv.actions.close();
		workflowPage.getters.canvasNodeByName(EDIT_FIELDS_SET_NODE_NAME).click();
		workflowPage.actions.hitPinNodeShortcut();
		workflowPage.actions.openNode(EDIT_FIELDS_SET_NODE_NAME);
		ndv.getters.nodeOutputHint().should('exist');
	});

	it('Should show an error when maximum pin data size is exceeded', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true, true);
		ndv.getters.container().should('be.visible');
		ndv.getters.pinDataButton().should('not.exist');
		ndv.getters.editPinnedDataButton().should('be.visible');

		ndv.actions.pastePinnedData([
			{
				test: '1'.repeat(Cypress.env('MAX_PINNED_DATA_SIZE')),
			},
		]);
		workflowPage.getters
			.errorToast()
			.should('contain', 'Workflow has reached the maximum allowed pinned data size');
	});

	it('Should show an error when pin data JSON in invalid', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true, true);
		ndv.getters.container().should('be.visible');
		ndv.getters.pinDataButton().should('not.exist');
		ndv.getters.editPinnedDataButton().should('be.visible');

		ndv.actions.setPinnedData('[ { "name": "First item", "code": 2dsa }]')
		workflowPage.getters
			.errorToast()
			.should('contain', 'Unable to save due to invalid JSON');
	});

	it('Should be able to reference paired items in a node located before pinned data', () => {
		workflowPage.actions.addInitialNodeToCanvas(MANUAL_TRIGGER_NODE_NAME);
		workflowPage.actions.addNodeToCanvas(HTTP_REQUEST_NODE_NAME, true, true);
		ndv.actions.setPinnedData([{ http: 123 }]);
		ndv.actions.close();

		workflowPage.actions.addNodeToCanvas(PIPEDRIVE_NODE_NAME, true, true);
		ndv.actions.setPinnedData(Array(3).fill({ pipedrive: 123 }));
		ndv.actions.close();

		workflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME, true, true);
		setExpressionOnStringValueInSet(`{{ $('${HTTP_REQUEST_NODE_NAME}').item`);

		const output = '[Object: {"json": {"http": 123}, "pairedItem": {"item": 0}}]';

		cy.get('div').contains(output).should('be.visible');
	});

	it('should use pin data in manual executions that are started by a webhook', () => {
		cy.createFixtureWorkflow('Test_workflow_webhook_with_pin_data.json', 'Test');

		workflowPage.actions.executeWorkflow();

		cy.request('GET', `${BACKEND_BASE_URL}/webhook-test/b0d79ddb-df2d-49b1-8555-9fa2b482608f`).then(
			(response) => {
				expect(response.status).to.eq(200);
			},
		);

		workflowPage.actions.openNode('End');

		ndv.getters.outputTableRow(1).should('exist');
		ndv.getters.outputTableRow(1).should('have.text', 'pin-overwritten');
	});

	it('should not use pin data in production executions that are started by a webhook', () => {
		cy.createFixtureWorkflow('Test_workflow_webhook_with_pin_data.json', 'Test');

		workflowPage.actions.activateWorkflow();
		cy.request('GET', `${BACKEND_BASE_URL}/webhook/b0d79ddb-df2d-49b1-8555-9fa2b482608f`).then(
			(response) => {
				expect(response.status).to.eq(200);
				// Assert that we get the data hard coded in the edit fields node,
				// instead of the data pinned in said node.
				expect(response.body).to.deep.equal({
					nodeData: 'pin',
				});
			},
		);
	});
});

function setExpressionOnStringValueInSet(expression: string) {
	cy.get('button').contains('Test step').click();

	ndv.getters.assignmentCollectionAdd('assignments').click();
	ndv.getters.assignmentValue('assignments').contains('Expression').invoke('show').click();

	ndv.getters
		.inlineExpressionEditorInput()
		.clear()
		.type(expression, { parseSpecialCharSequences: false })
		// hide autocomplete
		.type('{esc}');
}
