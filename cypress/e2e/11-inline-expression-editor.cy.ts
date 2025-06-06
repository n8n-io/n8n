import { EDIT_FIELDS_SET_NODE_NAME } from '../constants';
import { NDV } from '../pages/ndv';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const ndv = new NDV();
const WorkflowPage = new WorkflowPageClass();

describe('Inline expression editor', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addInitialNodeToCanvas('Schedule');
		cy.on('uncaught:exception', (error) => error.name !== 'ExpressionError');
	});

	describe('Basic UI functionality', () => {
		it('should open and close inline expression preview', () => {
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.actions.openNode('Schedule');
			WorkflowPage.actions.openInlineExpressionEditor();
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('123');
			WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^123$/);
			// click outside to close
			ndv.getters.outputPanel().click();
			WorkflowPage.getters.inlineExpressionEditorOutput().should('not.exist');
		});

		it('should switch between expression and fixed using keyboard', () => {
			WorkflowPage.actions.addNodeToCanvas(EDIT_FIELDS_SET_NODE_NAME);
			WorkflowPage.actions.openNode(EDIT_FIELDS_SET_NODE_NAME);

			// Should switch to expression with =
			ndv.getters.assignmentCollectionAdd('assignments').click();
			ndv.actions.typeIntoParameterInput('value', '=');

			// Should complete {{ --> {{ | }}
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().should('have.text', '{{  }}');

			// Should switch back to fixed with backspace on empty expression
			ndv.actions.typeIntoParameterInput('value', '{selectall}{backspace}');
			ndv.getters.parameterInput('value').click();
			ndv.actions.typeIntoParameterInput('value', '{backspace}');
			ndv.getters.inlineExpressionEditorInput().should('not.exist');
		});
	});

	describe('Static data', () => {
		beforeEach(() => {
			WorkflowPage.actions.addNodeToCanvas('Hacker News');
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.actions.openNode('Get many items');
			WorkflowPage.actions.openInlineExpressionEditor();
		});

		it('should resolve primitive resolvables', () => {
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('1 + 2');
			WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^3$/);
			WorkflowPage.getters.inlineExpressionEditorInput().clear();

			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('"ab"');
			WorkflowPage.getters.inlineExpressionEditorInput().type('{rightArrow}+');
			WorkflowPage.getters.inlineExpressionEditorInput().type('"cd"');
			WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^abcd$/);
			WorkflowPage.getters.inlineExpressionEditorInput().clear();

			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('true && false');
			WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^false$/);
		});

		it('should resolve object resolvables', () => {
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters
				.inlineExpressionEditorInput()
				.type('{ a: 1 }', { parseSpecialCharSequences: false });
			WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^\[Object: \{"a": 1\}\]$/);
			WorkflowPage.getters.inlineExpressionEditorInput().clear();

			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters
				.inlineExpressionEditorInput()
				.type('{ a: 1 }.a', { parseSpecialCharSequences: false });
			WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^1$/);
		});

		it('should resolve array resolvables', () => {
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('[1, 2, 3]');
			WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^\[Array: \[1,2,3\]\]$/);

			WorkflowPage.getters.inlineExpressionEditorInput().clear();

			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('[1, 2, 3]');
			WorkflowPage.getters.inlineExpressionEditorInput().type('[0]');
			WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^1$/);
		});
	});

	describe('Dynamic data', () => {
		beforeEach(() => {
			WorkflowPage.actions.openNode('Schedule Trigger');
			ndv.actions.setPinnedData([{ myStr: 'Monday' }]);
			ndv.actions.close();
			WorkflowPage.actions.addNodeToCanvas('No Operation');
			WorkflowPage.actions.addNodeToCanvas('Hacker News');
			WorkflowPage.actions.zoomToFit();
			WorkflowPage.actions.openNode('Get many items');
			WorkflowPage.actions.openInlineExpressionEditor();
		});

		it('should resolve $parameter[]', () => {
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			// Resolving $parameter is slow, especially on CI runner
			WorkflowPage.getters.inlineExpressionEditorInput().type('$parameter["operation"]');
			WorkflowPage.getters.inlineExpressionEditorOutput().should('have.text', 'getAll');
		});

		it('should resolve input: $json,$input,$(nodeName)', () => {
			// Previous nodes have not run, input is empty
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('$json.myStr');
			WorkflowPage.getters
				.inlineExpressionEditorOutput()
				.should('have.text', '[Execute previous nodes for preview]');
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('$input.item.json.myStr');
			WorkflowPage.getters
				.inlineExpressionEditorOutput()
				.should('have.text', '[Execute previous nodes for preview]');
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters
				.inlineExpressionEditorInput()
				.type("$('Schedule Trigger').item.json.myStr");
			WorkflowPage.getters
				.inlineExpressionEditorOutput()
				.should('have.text', '[Execute previous nodes for preview]');

			// Run workflow
			ndv.actions.close();
			WorkflowPage.actions.executeNode('No Operation, do nothing', { anchor: 'topLeft' });
			WorkflowPage.actions.openNode('Get many items');
			WorkflowPage.actions.openInlineExpressionEditor();

			// Previous nodes have run, input can be resolved
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('$json.myStr');
			WorkflowPage.getters.inlineExpressionEditorOutput().should('have.text', 'Monday');
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters.inlineExpressionEditorInput().type('$input.item.json.myStr');
			WorkflowPage.getters.inlineExpressionEditorOutput().should('have.text', 'Monday');
			WorkflowPage.getters.inlineExpressionEditorInput().clear();
			WorkflowPage.getters.inlineExpressionEditorInput().click().type('{{');
			WorkflowPage.getters
				.inlineExpressionEditorInput()
				.type("$('Schedule Trigger').item.json.myStr");
			WorkflowPage.getters.inlineExpressionEditorOutput().should('have.text', 'Monday');
		});
	});
});
