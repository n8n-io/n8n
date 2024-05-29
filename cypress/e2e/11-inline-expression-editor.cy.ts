import { NDV } from '../pages/ndv';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const ndv = new NDV();
const WorkflowPage = new WorkflowPageClass();

describe('Inline expression editor', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addInitialNodeToCanvas('Schedule');
		cy.on('uncaught:exception', (err) => err.name !== 'ExpressionError');
	});

	describe('Static data', () => {
		beforeEach(() => {
			WorkflowPage.actions.addNodeToCanvas('Hacker News');
			WorkflowPage.actions.openNode('Hacker News');
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
			WorkflowPage.actions.openNode('Hacker News');
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
			WorkflowPage.actions.executeNode('No Operation');
			WorkflowPage.actions.openNode('Hacker News');
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
