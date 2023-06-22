import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

describe('Inline expression editor', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.addNodeToCanvas('Hacker News');
		WorkflowPage.actions.openNode('Hacker News');
		WorkflowPage.actions.openInlineExpressionEditor();

		cy.on('uncaught:exception', (err) => err.name !== 'ExpressionError');
	});

	it('should resolve primitive resolvables', () => {
		WorkflowPage.getters.inlineExpressionEditorInput().clear();
		WorkflowPage.getters.inlineExpressionEditorInput().type('{{');
		WorkflowPage.getters.inlineExpressionEditorInput().type('1 + 2');
		WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^3$/);
		WorkflowPage.getters.inlineExpressionEditorInput().clear();

		WorkflowPage.getters.inlineExpressionEditorInput().type('{{');
		WorkflowPage.getters.inlineExpressionEditorInput().type('"ab"');
		WorkflowPage.getters.inlineExpressionEditorInput().type('{rightArrow}+');
		WorkflowPage.getters.inlineExpressionEditorInput().type('"cd"');
		WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^abcd$/);
		WorkflowPage.getters.inlineExpressionEditorInput().clear();

		WorkflowPage.getters.inlineExpressionEditorInput().type('{{');
		WorkflowPage.getters.inlineExpressionEditorInput().type('true && false');
		WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^false$/);
	});

	it('should resolve object resolvables', () => {
		WorkflowPage.getters.inlineExpressionEditorInput().clear();
		WorkflowPage.getters.inlineExpressionEditorInput().type('{{');
		WorkflowPage.getters
			.inlineExpressionEditorInput()
			.type('{ a: 1 }', { parseSpecialCharSequences: false });
		WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^\[Object: \{"a": 1\}\]$/);
		WorkflowPage.getters.inlineExpressionEditorInput().clear();

		WorkflowPage.getters.inlineExpressionEditorInput().type('{{');
		WorkflowPage.getters
			.inlineExpressionEditorInput()
			.type('{ a: 1 }.a', { parseSpecialCharSequences: false });
		WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^1$/);
	});

	it('should resolve array resolvables', () => {
		WorkflowPage.getters.inlineExpressionEditorInput().clear();
		WorkflowPage.getters.inlineExpressionEditorInput().type('{{');
		WorkflowPage.getters.inlineExpressionEditorInput().type('[1, 2, 3]');
		WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^\[Array: \[1,2,3\]\]$/);

		WorkflowPage.getters.inlineExpressionEditorInput().clear();

		WorkflowPage.getters.inlineExpressionEditorInput().type('{{');
		WorkflowPage.getters.inlineExpressionEditorInput().type('[1, 2, 3]');
		WorkflowPage.getters.inlineExpressionEditorInput().type('[0]');
		WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^1$/);
	});

	it('should resolve $parameter[]', () => {
		WorkflowPage.getters.inlineExpressionEditorInput().clear();
		WorkflowPage.getters.inlineExpressionEditorInput().type('{{');
		WorkflowPage.getters.inlineExpressionEditorInput().type('$parameter["operation"]');
		WorkflowPage.getters.inlineExpressionEditorOutput().contains(/^get$/);
	});
});
