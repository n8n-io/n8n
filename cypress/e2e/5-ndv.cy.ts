import { setCredentialValues } from '../composables/modals/credential-modal';
import {
	clickCreateNewCredential,
	clickGetBackToCanvas,
	setParameterSelectByContent,
} from '../composables/ndv';
import { openNode } from '../composables/workflow';
import {
	EDIT_FIELDS_SET_NODE_NAME,
	MANUAL_TRIGGER_NODE_DISPLAY_NAME,
	NOTION_NODE_NAME,
} from '../constants';
import { NDV, WorkflowPage } from '../pages';
import { NodeCreator } from '../pages/features/node-creator';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('NDV', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
		workflowPage.actions.renameWithUniqueName();
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	it('can link and unlink run selectors between input and output', () => {
		cy.createFixtureWorkflow('Test_workflow_5.json', 'Test');
		workflowPage.actions.zoomToFit();
		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Set3');

		ndv.actions.switchInputMode('Table');
		ndv.actions.switchOutputMode('Table');

		// Start from linked state
		ndv.getters.outputLinkRun().then(($el) => {
			const classList = Array.from($el[0].classList);
			if (!classList.includes('linked')) {
				ndv.actions.toggleOutputRunLinking();
				ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
			}
		});

		ndv.getters
			.inputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');
		ndv.getters
			.outputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters.inputRunSelector().find('input').should('include.value', '1 of 2 (6 items)');
		ndv.getters.inputTbodyCell(1, 0).should('have.text', '1111');
		ndv.getters.outputTbodyCell(1, 0).should('have.text', '1111');

		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.actions.changeInputRunSelector('2 of 2 (6 items)');
		ndv.getters.outputRunSelector().find('input').should('include.value', '2 of 2 (6 items)');

		// unlink
		ndv.actions.toggleOutputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.actions.changeOutputRunSelector('1 of 2 (6 items)');
		ndv.getters
			.inputRunSelector()
			.should('exist')
			.find('input')
			.should('include.value', '2 of 2 (6 items)');

		// link again
		ndv.actions.toggleOutputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.getters.inputRunSelector().find('input').should('include.value', '1 of 2 (6 items)');

		// unlink again
		ndv.actions.toggleInputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.actions.changeInputRunSelector('2 of 2 (6 items)');
		ndv.getters.outputRunSelector().find('input').should('include.value', '1 of 2 (6 items)');

		// link again
		ndv.actions.toggleInputRunLinking();
		ndv.getters.inputTbodyCell(1, 0).click(); // remove tooltip
		ndv.getters.outputRunSelector().find('input').should('include.value', '2 of 2 (6 items)');
	});

	it('should not retrieve remote options when a parameter value changes', () => {
		cy.intercept(
			'POST',
			'/rest/dynamic-node-parameters/options',
			cy.spy().as('fetchParameterOptions'),
		);
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', { action: 'Remote Options' });
		// Type something into the field
		ndv.actions.typeIntoParameterInput('otherField', 'test');
		// Should call the endpoint only once (on mount), not for every keystroke
		cy.get('@fetchParameterOptions').should('have.been.calledOnce');
	});

	describe('floating nodes', () => {
		function getFloatingNodeByPosition(
			position: 'inputMain' | 'outputMain' | 'outputSub' | 'inputSub',
		) {
			return cy.get(`[data-node-placement=${position}]`);
		}

		it('should traverse floating nodes with mouse', () => {
			cy.createFixtureWorkflow('Floating_Nodes.json', 'Floating Nodes');

			workflowPage.actions.deselectAll();

			workflowPage.getters.canvasNodes().first().dblclick();
			getFloatingNodeByPosition('inputMain').should('not.exist');
			getFloatingNodeByPosition('outputMain').should('exist');
			// Traverse 4 connected node forwards
			Array.from(Array(4).keys()).forEach((i) => {
				getFloatingNodeByPosition('outputMain').click({ force: true });
				ndv.getters.nodeNameContainer().should('contain', `Node ${i + 1}`);
				getFloatingNodeByPosition('inputMain').should('exist');
				getFloatingNodeByPosition('outputMain').should('exist');
				ndv.actions.close();
				// These two lines are broken in V2
				workflowPage.getters.selectedNodes().should('have.length', 1);
				workflowPage.getters
					.selectedNodes()
					.first()
					.should('contain', `Node ${i + 1}`);
				workflowPage.getters.selectedNodes().first().dblclick();
			});
			getFloatingNodeByPosition('outputMain').click({ force: true });
			ndv.getters.nodeNameContainer().should('contain', 'Chain');
			// Traverse 4 connected node backwards
			Array.from(Array(4).keys()).forEach((i) => {
				getFloatingNodeByPosition('inputMain').click({ force: true });
				ndv.getters.nodeNameContainer().should('contain', `Node ${4 - i}`);
				getFloatingNodeByPosition('outputMain').should('exist');
				getFloatingNodeByPosition('inputMain').should('exist');
			});
			getFloatingNodeByPosition('inputMain').click({ force: true });
			workflowPage.getters
				.selectedNodes()
				.first()
				.should('contain', MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			getFloatingNodeByPosition('inputMain').should('not.exist');
			getFloatingNodeByPosition('inputSub').should('not.exist');
			getFloatingNodeByPosition('outputSub').should('not.exist');
			ndv.actions.close();
			workflowPage.getters.selectedNodes().should('have.length', 1);
			workflowPage.getters
				.selectedNodes()
				.first()
				.should('contain', MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		});

		it('should traverse floating nodes with keyboard', () => {
			cy.createFixtureWorkflow('Floating_Nodes.json', 'Floating Nodes');
			workflowPage.actions.deselectAll();

			workflowPage.getters.canvasNodes().first().dblclick();
			getFloatingNodeByPosition('inputMain').should('not.exist');
			getFloatingNodeByPosition('outputMain').should('exist');
			// Traverse 4 connected node forwards
			Array.from(Array(4).keys()).forEach((i) => {
				cy.realPress(['ShiftLeft', 'Meta', 'AltLeft', 'ArrowRight']);
				ndv.getters.nodeNameContainer().should('contain', `Node ${i + 1}`);
				getFloatingNodeByPosition('inputMain').should('exist');
				getFloatingNodeByPosition('outputMain').should('exist');
				ndv.actions.close();
				workflowPage.getters.selectedNodes().should('have.length', 1);
				workflowPage.getters
					.selectedNodes()
					.first()
					.should('contain', `Node ${i + 1}`);
				workflowPage.getters.selectedNodes().first().dblclick();
			});

			cy.realPress(['ShiftLeft', 'Meta', 'AltLeft', 'ArrowRight']);
			ndv.getters.nodeNameContainer().should('contain', 'Chain');

			// Traverse 4 connected node backwards
			Array.from(Array(4).keys()).forEach((i) => {
				cy.realPress(['ShiftLeft', 'Meta', 'AltLeft', 'ArrowLeft']);
				ndv.getters.nodeNameContainer().should('contain', `Node ${4 - i}`);
				getFloatingNodeByPosition('outputMain').should('exist');
				getFloatingNodeByPosition('inputMain').should('exist');
			});
			cy.realPress(['ShiftLeft', 'Meta', 'AltLeft', 'ArrowLeft']);
			workflowPage.getters
				.selectedNodes()
				.first()
				.should('contain', MANUAL_TRIGGER_NODE_DISPLAY_NAME);
			getFloatingNodeByPosition('inputMain').should('not.exist');
			getFloatingNodeByPosition('inputSub').should('not.exist');
			getFloatingNodeByPosition('outputSub').should('not.exist');
			ndv.actions.close();
			workflowPage.getters.selectedNodes().should('have.length', 1);
			workflowPage.getters
				.selectedNodes()
				.first()
				.should('contain', MANUAL_TRIGGER_NODE_DISPLAY_NAME);
		});

		it('should connect floating sub-nodes', () => {
			const nodeCreator = new NodeCreator();
			const connectionGroups = [
				{
					title: 'Language Models',
					id: 'ai_languageModel',
					index: 0,
				},
				{
					title: 'Tools',
					id: 'ai_tool',
					index: 0,
				},
			];

			workflowPage.actions.addInitialNodeToCanvas('AI Agent', { keepNdvOpen: true });

			connectionGroups.forEach((group) => {
				cy.getByTestId(`add-subnode-${group.id}-${group.index}`).should('exist');
				cy.getByTestId(`add-subnode-${group.id}-${group.index}`).click();

				cy.getByTestId('nodes-list-header').contains(group.title).should('exist');
				// Add HTTP Request tool
				nodeCreator.getters.getNthCreatorItem(2).click();
				getFloatingNodeByPosition('outputSub').should('exist');
				getFloatingNodeByPosition('outputSub').click({ force: true });

				if (group.id === 'ai_languageModel') {
					cy.getByTestId(`add-subnode-${group.id}-${group.index}`).should('not.exist');
				} else {
					cy.getByTestId(`add-subnode-${group.id}-${group.index}`).should('exist');
					// Expand the subgroup
					cy.getByTestId('subnode-connection-group-ai_tool-0').click();
					cy.getByTestId(`add-subnode-${group.id}-${group.index}`).click();
					// Add HTTP Request tool
					nodeCreator.getters.getNthCreatorItem(2).click();
					getFloatingNodeByPosition('outputSub').click({ force: true });
					cy.getByTestId('subnode-connection-group-ai_tool-0')
						.findChildByTestId('floating-subnode')
						.should('have.length', 2);
				}
			});

			// Since language model has no credentials set, it should show an error
			// Since HTTP Request tool requires URL it would also show an error(2 errors, 1 for each tool node)
			cy.get('[class*=hasIssues]').should('have.length', 3);
		});

		it('should have the floating nodes in correct order', () => {
			cy.createFixtureWorkflow('Floating_Nodes.json', 'Floating Nodes');

			workflowPage.actions.deselectAll();

			// The first merge node has the wires crossed, so `Edit Fields1` is first in the order of connected nodes
			openNode('Merge');
			getFloatingNodeByPosition('inputMain').should('exist');
			getFloatingNodeByPosition('inputMain').should('have.length', 2);
			getFloatingNodeByPosition('inputMain')
				.first()
				.should('have.attr', 'data-node-name', 'Edit Fields1');
			getFloatingNodeByPosition('inputMain')
				.last()
				.should('have.attr', 'data-node-name', 'Edit Fields0');

			clickGetBackToCanvas();

			// The second merge node does not have wires crossed, so `Edit Fields0` is first
			openNode('Merge1');
			getFloatingNodeByPosition('inputMain').should('exist');
			getFloatingNodeByPosition('inputMain').should('have.length', 2);
			getFloatingNodeByPosition('inputMain')
				.first()
				.should('have.attr', 'data-node-name', 'Edit Fields0');
			getFloatingNodeByPosition('inputMain')
				.last()
				.should('have.attr', 'data-node-name', 'Edit Fields1');
		});
	});

	it('should properly show node execution indicator for multiple nodes', () => {
		workflowPage.actions.addInitialCodeNodeToCanvas();
		ndv.actions.typeIntoParameterInput('jsCode', 'testets');
		ndv.getters.backToCanvas().click();
		workflowPage.actions.executeWorkflow();
		// Manual tigger node should show success indicator
		workflowPage.actions.openNode('When clicking ‘Execute workflow’');
		ndv.getters.nodeRunSuccessIndicator().should('exist');
		ndv.getters.nodeRunTooltipIndicator().should('exist');
		// Code node should show error
		ndv.getters.backToCanvas().click();
		workflowPage.actions.openNode('Code');
		ndv.getters.nodeRunErrorIndicator().should('exist');
	});

	it('Should clear mismatched collection parameters', () => {
		workflowPage.actions.addInitialNodeToCanvas('LDAP', {
			keepNdvOpen: true,
			action: 'Create a new entry',
		});
		// Add some attributes in Create operation
		cy.getByTestId('parameter-item').contains('Add Attributes').click();
		ndv.actions.changeNodeOperation('Update');
		// Attributes should be empty after operation change
		cy.getByTestId('parameter-item').contains('Currently no items exist').should('exist');
	});

	it('Should keep RLC values after operation change', () => {
		const TEST_DOC_ID = '1111';
		workflowPage.actions.addInitialNodeToCanvas('Google Sheets', {
			keepNdvOpen: true,
			action: 'Append row in sheet',
		});
		ndv.actions.setRLCValue('documentId', TEST_DOC_ID);
		ndv.actions.changeNodeOperation('Update Row');
		ndv.getters.resourceLocatorInput('documentId').find('input').should('have.value', TEST_DOC_ID);
	});

	it('Should not clear resource/operation after credential change', () => {
		workflowPage.actions.addInitialNodeToCanvas('Discord', {
			keepNdvOpen: true,
			action: 'Delete a message',
		});

		clickCreateNewCredential();
		setCredentialValues({
			botToken: 'sk_test_123',
		});

		ndv.getters.parameterInput('resource').find('input').should('have.value', 'Message');
		ndv.getters.parameterInput('operation').find('input').should('have.value', 'Delete');
	});

	it('Should show a notice when remote options cannot be fetched because of missing credentials', () => {
		cy.intercept('POST', '/rest/dynamic-node-parameters/options', { statusCode: 403 }).as(
			'parameterOptions',
		);

		workflowPage.actions.addInitialNodeToCanvas(NOTION_NODE_NAME, {
			keepNdvOpen: true,
			action: 'Update a database page',
		});

		ndv.actions.addItemToFixedCollection('propertiesUi');
		ndv.getters
			.parameterInput('key')
			.find('input')
			.should('have.value', 'Set up credential to see options');
	});

	it('Should show error state when remote options cannot be fetched', () => {
		cy.intercept('POST', '/rest/dynamic-node-parameters/options', { statusCode: 500 }).as(
			'parameterOptions',
		);

		workflowPage.actions.addInitialNodeToCanvas(NOTION_NODE_NAME, {
			keepNdvOpen: true,
			action: 'Update a database page',
		});

		clickCreateNewCredential();
		setCredentialValues({
			apiKey: 'sk_test_123',
		});

		ndv.actions.addItemToFixedCollection('propertiesUi');
		ndv.getters
			.parameterInput('key')
			.find('input')
			.should('have.value', 'Error fetching options from Notion');
	});

	// Correctly failing in V2 - NodeCreator is not opened after clicking on the link
	it('Should open appropriate node creator after clicking on connection hint link', () => {
		const nodeCreator = new NodeCreator();
		const hintMapper = {
			Memory: 'AI Nodes',
			'Output Parser': 'AI Nodes',
			'Token Splitter': 'Document Loaders',
			Tool: 'AI Nodes',
			Embeddings: 'Vector Stores',
			'Vector Store': 'Retrievers',
		};
		cy.createFixtureWorkflow(
			'open_node_creator_for_connection.json',
			'open_node_creator_for_connection',
		);

		Object.entries(hintMapper).forEach(([node, group]) => {
			workflowPage.actions.openNode(node);
			// This fails to open the NodeCreator
			cy.get('[data-action=openSelectiveNodeCreator]').contains('Insert one').click();
			nodeCreator.getters.activeSubcategory().should('contain', group);
			cy.realPress('Escape');
		});
	});

	it('should allow selecting item for expressions', () => {
		workflowPage.actions.visit();

		cy.createFixtureWorkflow('Test_workflow_3.json', 'My test workflow 2');
		workflowPage.actions.openNode('Set');

		ndv.actions.typeIntoParameterInput('value', '='); // switch to expressions
		ndv.actions.typeIntoParameterInput('value', '{{', {
			parseSpecialCharSequences: false,
		});
		ndv.actions.typeIntoParameterInput('value', '$json.input[0].count');
		ndv.getters.inlineExpressionEditorOutput().should('have.text', '0');

		ndv.actions.expressionSelectNextItem();
		ndv.getters.inlineExpressionEditorOutput().should('have.text', '1');
		ndv.getters.inlineExpressionEditorItemInput().should('have.value', '1');
		ndv.getters.inlineExpressionEditorItemNextButton().should('be.disabled');

		ndv.actions.expressionSelectPrevItem();
		ndv.getters.inlineExpressionEditorOutput().should('have.text', '0');
		ndv.getters.inlineExpressionEditorItemInput().should('have.value', '0');
		ndv.getters.inlineExpressionEditorItemPrevButton().should('be.disabled');

		ndv.actions.expressionSelectItem(1);
		ndv.getters.inlineExpressionEditorOutput().should('have.text', '1');
	});

	it('should show data from the correct output in schema view', () => {
		cy.createFixtureWorkflow('Test_workflow_multiple_outputs.json');
		workflowPage.actions.zoomToFit();

		workflowPage.actions.executeWorkflow();
		workflowPage.actions.openNode('Only Item 1');
		ndv.getters.inputPanel().should('be.visible');
		ndv.getters
			.inputPanel()
			.find('[data-test-id=run-data-schema-item]')
			.should('contain.text', 'onlyOnItem1');
		ndv.actions.close();

		workflowPage.actions.openNode('Only Item 2');
		ndv.getters.inputPanel().should('be.visible');
		ndv.getters
			.inputPanel()
			.find('[data-test-id=run-data-schema-item]')
			.should('contain.text', 'onlyOnItem2');
		ndv.actions.close();

		workflowPage.actions.openNode('Only Item 3');
		ndv.getters.inputPanel().should('be.visible');
		ndv.getters
			.inputPanel()
			.find('[data-test-id=run-data-schema-item]')
			.should('contain.text', 'onlyOnItem3');
	});

	it('should not show items count when seaching in schema view', () => {
		cy.createFixtureWorkflow('Test_ndv_search.json');
		workflowPage.actions.zoomToFit();
		workflowPage.actions.openNode('Edit Fields');
		ndv.getters.outputPanel().should('be.visible');
		ndv.actions.execute();
		ndv.actions.switchOutputMode('Schema');
		ndv.getters.outputPanel().find('[data-test-id=ndv-search]').click().type('US');
		ndv.getters.outputPanel().find('[data-test-id=ndv-items-count]').should('not.exist');
	});

	it('should show additional tooltip when seaching in schema view if no matches', () => {
		cy.createFixtureWorkflow('Test_ndv_search.json');
		workflowPage.actions.zoomToFit();
		workflowPage.actions.openNode('Edit Fields');
		ndv.getters.outputPanel().should('be.visible');
		ndv.actions.execute();
		ndv.actions.switchOutputMode('Schema');
		ndv.getters.outputPanel().find('[data-test-id=ndv-search]').click().type('foo');
		ndv.getters
			.outputPanel()
			.contains('To search field values, switch to table or JSON view.')
			.should('exist');
	});

	it('ADO-2931 - should handle multiple branches of the same input with the first branch empty correctly', () => {
		cy.createFixtureWorkflow('Test_ndv_two_branches_of_same_parent_false_populated.json');
		workflowPage.actions.zoomToFit();
		workflowPage.actions.openNode('DebugHelper');
		ndv.getters.inputPanel().should('be.visible');
		ndv.getters.outputPanel().should('be.visible');
		ndv.actions.execute();
		// This ensures we rendered the inputPanel
		ndv.getters
			.inputPanel()
			.find('[data-test-id=run-data-schema-item]')
			.should('contain.text', 'a1');
	});
});
