import {
	clickExecuteNode,
	clickGetBackToCanvas,
	clickResourceLocatorInput,
	getExecuteNodeButton,
	getOutputTableHeaders,
	getOutputTbodyCell,
	getParameterInputByName,
	getResourceLocator,
	getResourceLocatorInput,
	populateFixedCollection,
	selectResourceLocatorItem,
} from '../composables/ndv';
import {
	clickWorkflowCardContent,
	clickZoomToFit,
	navigateToNewWorkflowPage,
	openNode,
	pasteWorkflow,
	saveWorkflowOnButtonClick,
} from '../composables/workflow';
import SUB_WORKFLOW_INPUTS from '../fixtures/Test_Subworkflow-Inputs.json';
import { NDV, WorkflowsPage, WorkflowPage } from '../pages';
import { errorToast, successToast } from '../pages/notifications';
import { getVisiblePopper } from '../utils';

const ndv = new NDV();
const workflowsPage = new WorkflowsPage();
const workflow = new WorkflowPage();

const DEFAULT_WORKFLOW_NAME = 'My workflow';
const DEFAULT_SUBWORKFLOW_NAME_1 = 'My Sub-Workflow 1';
const DEFAULT_SUBWORKFLOW_NAME_2 = 'My Sub-Workflow 2';

const exampleFields = [
	['aNumber', 'Number'],
	['aString', 'String'],
	['aArray', 'Array'],
	['aObject', 'Object'],
	['aAny', 'Allow Any Type'],
	// bool last since it's a switch instead of a normal inputField so we'll skip it for some cases
	['aBool', 'Boolean'],
] as const;

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

function populateMapperFields(fields: ReadonlyArray<[string, string]>) {
	for (const [name, value] of fields) {
		getParameterInputByName(name).type(value);

		// Click on a parent to dismiss the pop up which hides the field below.
		getParameterInputByName(name).parent().parent().parent().click('topLeft');
	}
}

function assertOutputTableContent(expectedContent: unknown[][]) {
	for (const [i, row] of expectedContent.entries()) {
		for (const [j, value] of row.entries()) {
			getOutputTbodyCell(1 + i, j).should('have.text', value);
		}
	}
}

// This function starts off in the Child Workflow Input Trigger, assuming we just defined the input fields
// It then navigates back to the parent and validates output
function validateAndReturnToParent(targetChild: string, offset: number, fields: string[]) {
	clickExecuteNode();

	// + 1 to account for formatting-only column
	getOutputTableHeaders().should('have.length', fields.length + 1);
	for (const [i, name] of fields.entries()) {
		getOutputTableHeaders().eq(i).should('have.text', name);
	}

	clickGetBackToCanvas();
	saveWorkflowOnButtonClick();

	cy.visit(workflowsPage.url);

	clickWorkflowCardContent(DEFAULT_WORKFLOW_NAME);

	openNode('Execute Workflow');

	// Note that outside of e2e tests this will be pre-selected correctly.
	// Due to our workaround to remain in the same tab we need to select the correct tab manually
	selectResourceLocatorItem('workflowId', offset, targetChild);

	// This fails, pointing to `usePushConnection` `const triggerNode = subWorkflow?.nodes.find` being `undefined.find()`I <think>
	clickExecuteNode();

	getOutputTableHeaders().should('have.length', fields.length + 1);
	for (const [i, name] of fields.entries()) {
		getOutputTableHeaders().eq(i).should('have.text', name);
	}

	// todo: verify the fields appear and show the correct types

	// todo: fill in the input fields (and mock previous node data in the json fixture to match)

	// todo: validate the actual output data
}

function setWorkflowInputFieldValue(index: number, value: string) {
	ndv.actions.addItemToFixedCollection('workflowInputs');
	ndv.actions.typeIntoFixedCollectionItem('workflowInputs', index, value);
}

describe('Sub-workflow creation and typed usage', () => {
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
		selectResourceLocatorItem('workflowId', 0, 'Create a new sub-workflow');
		// **************************
		// NAVIGATE TO CHILD WORKFLOW
		// **************************

		openNode('Workflow Input Trigger');
	});

	it.only('works with type-checked values', () => {
		populateFixedCollection(exampleFields, 'workflowInputs', 1);

		validateAndReturnToParent(
			DEFAULT_SUBWORKFLOW_NAME_1,
			1,
			exampleFields.map((f) => f[0]),
		);

		const values = [
			'-1', // number fields don't support `=` switch to expression, so let's test the Fixed case with it
			...exampleFields.slice(1).map((x) => `={{}{{} $json.a${x[0]}`), // }} are added automatically
		];

		// this matches with the pinned data provided in the fixture
		populateMapperFields(values.map((x, i) => [exampleFields[i][0], x]));

		clickExecuteNode();

		const expected = [
			['-1', 'A String', '0:11:true2:3', 'aKey:-1', '[empty object]', 'false'],
			['-1', 'Another String', '[empty array]', 'aDifferentKey:-1', '[empty array]', 'false'],
		];
		assertOutputTableContent(expected);

		// populateMapperFields(
		// 	values.map((x, i) => [exampleFields[i][0], `{selectAll}{backspace}${x.slice(1)}`]),
		// );

		// assertOutputTableContent(expected);

		// todo:
		// - validate output lines up
		// - change input to need casts
		// - run
		// - confirm error
		// - switch `attemptToConvertTypes` flag
		// - confirm success and changed output
		// - change input to be invalid despite cast
		// - run
		// - confirm error
		// - switch type option flags
		// - run
		// - confirm success
		// - turn off attempt to cast flag
		// - confirm a value was not cast
	});

	it('works with Fields input source, then changed to JSON input source', () => {
		ndv.getters.nodeOutputHint().should('exist');

		populateFixedCollection(exampleFields, 'workflowInputs', 1);

		validateAndReturnToParent(
			DEFAULT_SUBWORKFLOW_NAME_1,
			1,
			exampleFields.map((f) => f[0]),
		);

		cy.window().then((win) => {
			cy.stub(win, 'open').callsFake((url) => {
				cy.visit(url);
			});
		});
		selectResourceLocatorItem('workflowId', 0, 'Create a new sub-workflow');

		openNode('Workflow Input Trigger');

		cy.getByTestId('parameter-input').eq(0).click();

		getVisiblePopper()
			.getByTestId('parameter-input')
			.eq(0)
			.type('Using JSON Example{downArrow}{enter}');

		const exampleJson =
			'{{}' + exampleFields.map((x) => `"${x[0]}": ${makeExample(x[1])}`).join(',') + '}';
		cy.getByTestId('parameter-input-jsonExample')
			.find('.cm-line')
			.eq(0)
			.type(`${exampleJson}{enter}`);

		// first one doesn't work for some reason, might need to wait for something?
		clickExecuteNode();

		validateAndReturnToParent(
			DEFAULT_SUBWORKFLOW_NAME_2,
			2,
			exampleFields.map((f) => f[0]),
		);

		assertOutputTableContent([
			['[null]', '[null]', '[null]', '[null]', '[null]', 'false'],
			['[null]', '[null]', '[null]', '[null]', '[null]', 'false'],
		]);

		clickExecuteNode();

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
		// - verify output with `null` defaults exists
		//
	});

	it('should show node issue when no fields are defined in manual mode', () => {
		ndv.getters.nodeExecuteButton().should('be.disabled');
		ndv.actions.close();
		// Executing the workflow should show an error toast
		workflow.actions.executeWorkflow();
		errorToast().should('contain', 'The workflow has issues');
		openNode('Workflow Input Trigger');
		// Add a field to the workflowInputs fixedCollection
		setWorkflowInputFieldValue(0, 'test');
		// Executing the workflow should not show error now
		ndv.actions.close();
		workflow.actions.executeWorkflow();
		successToast().should('contain', 'Workflow executed successfully');
	});
});
