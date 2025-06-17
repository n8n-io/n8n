import {
	addItemToFixedCollection,
	assertNodeOutputHintExists,
	clickExecuteNode,
	clickGetBackToCanvas,
	getExecuteNodeButton,
	getOutputTableHeaders,
	getParameterInputByName,
	populateFixedCollection,
	selectResourceLocatorItem,
	selectResourceLocatorAddResourceItem,
	typeIntoFixedCollectionItem,
	clickWorkflowCardContent,
	assertOutputTableContent,
	populateMapperFields,
	getNodeRunInfoStale,
	assertNodeOutputErrorMessageExists,
	checkParameterCheckboxInputByName,
	uncheckParameterCheckboxInputByName,
} from '../composables/ndv';
import {
	clickExecuteWorkflowButton,
	clickZoomToFit,
	navigateToNewWorkflowPage,
	openNode,
	pasteWorkflow,
	saveWorkflowOnButtonClick,
} from '../composables/workflow';
import { visitWorkflowsPage } from '../composables/workflowsPage';
import SUB_WORKFLOW_INPUTS from '../fixtures/Test_Subworkflow-Inputs.json';
import { errorToast, successToast } from '../pages/notifications';
import { getVisiblePopper } from '../utils';

const DEFAULT_WORKFLOW_NAME = 'My workflow';
const DEFAULT_SUBWORKFLOW_NAME_1 = 'My Sub-Workflow 1';
const DEFAULT_SUBWORKFLOW_NAME_2 = 'My Sub-Workflow 2';

const EXAMPLE_FIELDS = [
	['aNumber', 'Number'],
	['aString', 'String'],
	['aArray', 'Array'],
	['aObject', 'Object'],
	['aAny', 'Allow Any Type'],
	// bool last because it's a switch instead of a normal inputField so we'll skip it for some cases
	['aBool', 'Boolean'],
] as const;

type TypeField = 'Allow Any Type' | 'String' | 'Number' | 'Boolean' | 'Array' | 'Object';

// eslint-disable-next-line n8n-local-rules/no-skipped-tests
describe.skip('Sub-workflow creation and typed usage', () => {
	beforeEach(() => {
		navigateToNewWorkflowPage();
		pasteWorkflow(SUB_WORKFLOW_INPUTS);
		saveWorkflowOnButtonClick();
		clickZoomToFit();

		openNode('Execute Workflow');

		let openedUrl = '';

		// Prevent sub-workflow from opening in new window
		cy.window().then((win) => {
			cy.stub(win, 'open').callsFake((url) => {
				openedUrl = url;
			});
		});
		selectResourceLocatorAddResourceItem('workflowId', 'Create a');
		cy.then(() => cy.visit(openedUrl));
		// **************************
		// NAVIGATE TO CHILD WORKFLOW
		// **************************
		// Close NDV before opening the node creator
		clickGetBackToCanvas();
		openNode('When Executed by Another Workflow');
	});

	it('works with type-checked values', () => {
		populateFixedCollection(EXAMPLE_FIELDS, 'workflowInputs', 1);

		validateAndReturnToParent(
			DEFAULT_SUBWORKFLOW_NAME_1,
			1,
			EXAMPLE_FIELDS.map((f) => f[0]),
		);

		const values = [
			'-1', // number fields don't support `=` switch to expression, so let's test the Fixed case with it
			...EXAMPLE_FIELDS.slice(1).map((x) => `={{}{{} $json.a${x[0]}`), // the `}}` at the end are added automatically
		];

		// this matches with the pinned data provided in the fixture
		populateMapperFields(values.map((x, i) => [EXAMPLE_FIELDS[i][0], x]));

		clickExecuteNode();

		const expected = [
			['-1', 'A String', '0:11:true2:3', 'aKey:-1', '[empty object]', 'true'],
			['-1', 'Another String', '[empty array]', 'aDifferentKey:-1', '[empty array]', 'true'],
		];
		assertOutputTableContent(expected);

		// Test the type-checking options
		populateMapperFields([['aString', '{selectAll}{backspace}{{}{{} 5']]);

		getNodeRunInfoStale().should('exist');
		clickExecuteNode();

		assertNodeOutputErrorMessageExists();

		// attemptToConvertTypes enabled
		checkParameterCheckboxInputByName('attemptToConvertTypes');

		getNodeRunInfoStale().should('exist');
		clickExecuteNode();

		const expected2 = [
			['-1', '5', '0:11:true2:3', 'aKey:-1', '[empty object]', 'true'],
			['-1', '5', '[empty array]', 'aDifferentKey:-1', '[empty array]', 'true'],
		];

		assertOutputTableContent(expected2);

		// disabled again
		uncheckParameterCheckboxInputByName('attemptToConvertTypes');

		getNodeRunInfoStale().should('exist');
		clickExecuteNode();

		assertNodeOutputErrorMessageExists();
	});

	it('works with Fields input source, and can then be changed to JSON input source', () => {
		assertNodeOutputHintExists();

		populateFixedCollection(EXAMPLE_FIELDS, 'workflowInputs', 1);

		validateAndReturnToParent(
			DEFAULT_SUBWORKFLOW_NAME_1,
			1,
			EXAMPLE_FIELDS.map((f) => f[0]),
		);

		cy.window().then((win) => {
			cy.stub(win, 'open').callsFake((url) => {
				cy.visit(url);
				selectResourceLocatorAddResourceItem('workflowId', 'Create a');

				openNode('When Executed by Another Workflow');

				getParameterInputByName('inputSource').click();

				getVisiblePopper()
					.getByTestId('parameter-input')
					.eq(0)
					.type('Using JSON Example{downArrow}{enter}');

				const exampleJson =
					'{{}' + EXAMPLE_FIELDS.map((x) => `"${x[0]}": ${makeExample(x[1])}`).join(',') + '}';
				getParameterInputByName('jsonExample')
					.find('.cm-line')
					.eq(0)
					.type(`{selectAll}{backspace}${exampleJson}{enter}`);

				// first one doesn't work for some reason, might need to wait for something?
				clickExecuteNode();

				validateAndReturnToParent(
					DEFAULT_SUBWORKFLOW_NAME_2,
					2,
					EXAMPLE_FIELDS.map((f) => f[0]),
				);

				assertOutputTableContent([
					['[null]', '[null]', '[null]', '[null]', '[null]', 'true'],
					['[null]', '[null]', '[null]', '[null]', '[null]', 'true'],
				]);

				clickExecuteNode();
			});
		});
	});

	// eslint-disable-next-line n8n-local-rules/no-skipped-tests
	it.skip('should show node issue when no fields are defined in manual mode', () => {
		getExecuteNodeButton().should('be.disabled');
		clickGetBackToCanvas();
		// Executing the workflow should show an error toast
		clickExecuteWorkflowButton();
		errorToast().should('contain', 'The workflow has issues');
		openNode('When Executed by Another Workflow');
		// Add a field to the workflowInputs fixedCollection
		addItemToFixedCollection('workflowInputs');
		typeIntoFixedCollectionItem('workflowInputs', 0, 'test');
		// Executing the workflow should not show error now
		clickGetBackToCanvas();
		clickExecuteWorkflowButton();
		successToast().should('contain', 'Workflow executed successfully');
	});
});

// This function starts off in the Child Workflow Input Trigger, assuming we just defined the input fields
// It then navigates back to the parent and validates the outputPanel matches our changes
function validateAndReturnToParent(targetChild: string, offset: number, fields: string[]) {
	clickExecuteNode();

	// + 1 to account for formatting-only column
	getOutputTableHeaders().should('have.length', fields.length + 1);
	for (const [i, name] of fields.entries()) {
		getOutputTableHeaders().eq(i).should('have.text', name);
	}

	clickGetBackToCanvas();
	saveWorkflowOnButtonClick();

	visitWorkflowsPage();

	clickWorkflowCardContent(DEFAULT_WORKFLOW_NAME);

	openNode('Execute Workflow');

	// Note that outside of e2e tests this will be pre-selected correctly.
	// Due to our workaround to remain in the same tab we need to select the correct tab manually
	selectResourceLocatorItem('workflowId', offset - 1, targetChild);

	clickExecuteNode();

	getOutputTableHeaders().should('have.length', fields.length + 1);
	for (const [i, name] of fields.entries()) {
		getOutputTableHeaders().eq(i).should('have.text', name);
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
