import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

describe('Expression editor modal', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.addNodeToCanvas('Hacker News');
		WorkflowPage.actions.openNode('Hacker News');
		WorkflowPage.actions.openExpressionEditorModal();
	});

	it('should resolve primitive resolvables', () => {
		WorkflowPage.getters.expressionModalInput().clear();
		WorkflowPage.getters.expressionModalInput().type('{{ 1 + 2');
		WorkflowPage.getters.expressionModalOutput().contains(/^3$/);
		WorkflowPage.getters.expressionModalInput().clear();

		WorkflowPage.getters.expressionModalInput().type('{{ "ab" + "cd"');
		WorkflowPage.getters.expressionModalOutput().contains(/^abcd$/);

		WorkflowPage.getters.expressionModalInput().clear();

		WorkflowPage.getters.expressionModalInput().type('{{ true && false');
		WorkflowPage.getters.expressionModalOutput().contains(/^false$/);
	});

	it('should resolve object resolvables', () => {
		WorkflowPage.getters.expressionModalInput().clear();
		WorkflowPage.getters
			.expressionModalInput()
			.type('{{ { a : 1 }', { parseSpecialCharSequences: false });
		WorkflowPage.getters.expressionModalOutput().contains(/^\[Object: \{"a": 1\}\]$/);

		WorkflowPage.getters.expressionModalInput().clear();

		WorkflowPage.getters
			.expressionModalInput()
			.type('{{ { a : 1 }.a', { parseSpecialCharSequences: false });
		WorkflowPage.getters.expressionModalOutput().contains(/^1$/);
	});

	it('should resolve array resolvables', () => {
		WorkflowPage.getters.expressionModalInput().clear();
		WorkflowPage.getters.expressionModalInput().type('{{ [1, 2, 3]');
		WorkflowPage.getters.expressionModalOutput().contains(/^\[Array: \[1,2,3\]\]$/);

		WorkflowPage.getters.expressionModalInput().clear();

		WorkflowPage.getters.expressionModalInput().type('{{ [1, 2, 3][0]');
		WorkflowPage.getters.expressionModalOutput().contains(/^1$/);
	});

	it('should resolve $parameter[]', () => {
		WorkflowPage.getters.expressionModalInput().clear();
		WorkflowPage.getters.expressionModalInput().type('{{ $parameter["operation"]');
		WorkflowPage.getters.expressionModalOutput().contains(/^get$/);
	});
});
