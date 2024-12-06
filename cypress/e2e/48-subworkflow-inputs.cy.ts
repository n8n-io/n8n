import { clickGetBackToCanvas, getOutputTableHeaders } from '../composables/ndv';
import {
	clickZoomToFit,
	navigateToNewWorkflowPage,
	openNode,
	pasteWorkflow,
	saveWorkflowOnButtonClick,
} from '../composables/workflow';
import SUB_WORKFLOW_INPUTS from '../fixtures/Test_Subworkflow-Inputs.json';
import { NDV, WorkflowsPage } from '../pages';
import { getVisiblePopper } from '../utils';

const ndv = new NDV();
const workflowsPage = new WorkflowsPage();

const DEFAULT_WORKFLOW_NAME = 'My workflow';
const DEFAULT_SUBWORKFLOW_NAME_1 = 'My Sub-Workflow 1';
const DEFAULT_SUBWORKFLOW_NAME_2 = 'My Sub-Workflow 2';

type FieldRow = readonly string[];

/**
 * Populate multiValue fixedCollections. Only supports fixedCollections for which all fields can be defined via keyboard typing
 *
 * @param items - 2D array of items to populate, i.e. [["myField1", "String"], [""]
 * @param collectionName - name of the fixedCollection to populate
 * @param offset - amount of 'parameter-input's before the fixedCollection under test
 * @returns
 */
function populateFixedCollection(
	items: readonly FieldRow[],
	collectionName: string,
	offset: number,
) {
	if (items.length === 0) return;
	const n = items[0].length;
	for (const [i, params] of items.entries()) {
		ndv.actions.addItemToFixedCollection(collectionName);
		for (const [j, param] of params.entries()) {
			ndv.getters
				.fixedCollectionParameter(collectionName)
				.getByTestId('parameter-input')
				.eq(offset + i * n + j)
				.type(`${param}{downArrow}{enter}`);
		}
	}
}

function makeExample(type: TypeField) {
	switch (type) {
		case 'String':
			return '"example"';
		case 'Number':
			return '42';
		case 'Boolean':
			return 'true';
		case 'Array':
			return '["example", 123, null]';
		case 'Object':
			return '{{}"example": [123]}';
		case 'Allow Any Type':
			return 'null';
	}
}

type TypeField = 'Allow Any Type' | 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';
function populateFields(items: ReadonlyArray<readonly [string, TypeField]>) {
	populateFixedCollection(items, 'workflowInputs', 1);
}

function navigateWorkflowSelectionDropdown(index: number, expectedText: string) {
	ndv.getters.resourceLocator('workflowId').should('be.visible');
	ndv.getters.resourceLocatorInput('workflowId').click();

	getVisiblePopper().findChildByTestId('rlc-item').eq(0).should('exist');
	getVisiblePopper()
		.findChildByTestId('rlc-item')
		.eq(index)
		.find('span')
		.should('have.text', expectedText)
		.click();
}

// This function starts off in the Child Workflow Input Trigger, assuming we just defined the input fields
// It then navigates back to the parent and validates output
function validateAndReturnToParent(fields: string[]) {
	ndv.actions.execute();

	// + 1 to account for formatting-only column
	getOutputTableHeaders().should('have.length', fields.length + 1);
	for (const [i, name] of fields.entries()) {
		getOutputTableHeaders().eq(i).should('have.text', name);
	}

	clickGetBackToCanvas();
	saveWorkflowOnButtonClick();

	cy.visit(workflowsPage.url);

	workflowsPage.getters.workflowCardContent(DEFAULT_WORKFLOW_NAME).click();

	openNode('Execute Workflow');

	// Note that outside of e2e tests this will be pre-selected correctly.
	// Due to our workaround to remain in the same tab we need to select the correct tab manually

	// TODO: This gets repeated, can extract based on item index and workflow name
	navigateWorkflowSelectionDropdown(1, DEFAULT_SUBWORKFLOW_NAME_1);

	ndv.actions.execute();

	// todo: verify the fields appear and show the correct types

	// todo: fill in the input fields (and mock previous node data in the json fixture to match)

	// todo: validate the actual output data
}

describe('Sub-workflow creation', () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
		pasteWorkflow(SUB_WORKFLOW_INPUTS);
		saveWorkflowOnButtonClick();
		clickZoomToFit();

		openNode('Execute Workflow');

		// Prevent sub-workflow from opening in new window
		cy.window().then((win) => {
			cy.stub(win, 'open').callsFake((url) => {
				cy.visit(url);
			});
		});
		navigateWorkflowSelectionDropdown(0, 'Create a new sub-workflow');
		// **************************
		// NAVIGATE TO CHILD WORKFLOW
		// **************************

		openNode('Workflow Input Trigger');
	});

	it('works with Fields input source into JSON input source', () => {
		ndv.getters.nodeOutputHint().should('exist');

		ndv.actions.execute();

		// + 1 to account for formatting-only column
		getOutputTableHeaders().should('have.length', 2);

		const fields = [
			['aString', 'String'],
			['aNumber', 'Number'],
			['aBool', 'Boolean'],
			['aArray', 'Array'],
			['aObject', 'Object'],
			['aAny', 'Allow Any Type'],
		] as const;
		populateFields(fields);

		validateAndReturnToParent(fields.map((f) => f[0]));

		cy.window().then((win) => {
			cy.stub(win, 'open').callsFake((url) => {
				cy.visit(url);
			});
		});
		navigateWorkflowSelectionDropdown(0, 'Create a new sub-workflow');

		openNode('Workflow Input Trigger');

		cy.getByTestId('parameter-input').eq(0).click();

		// Todo: Check if there's a better way to interact with option dropdowns
		// This PR would add this child testId
		getVisiblePopper()
			.getByTestId('parameter-input')
			.eq(0)
			.type('Using JSON Example{downArrow}{enter}');

		const exampleJson =
			'{{}' + fields.map((x) => `"${x[0]}": ${makeExample(x[1])}`).join(',') + '}';
		cy.getByTestId('parameter-input-jsonExample')
			.find('.cm-line')
			.eq(0)
			.type(`{selectAll}{backspace}${exampleJson}{enter}`);

		ndv.actions.execute();
		ndv.actions.execute();

		// populateJson(fields);

		// test for either InputSource mode and options combinations:
		// + we're showing the notice in the output panel
		// + we start with no fields
		// + Test Step works and we create the fields
		// + create field of each type (string, number, boolean, object, array, any)
		// + exit ndv
		// + save
		// + go back to parent workflow
		// - verify fields appear [needs Ivan's PR]
		// - link fields [needs Ivan's PR]
		// + run parent
		// - verify output is as expected (Unit test should cover concrete behavior of how all input combinations are handled though)
		//
	});
});
