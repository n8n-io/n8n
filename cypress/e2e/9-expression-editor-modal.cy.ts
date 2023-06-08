import { randFirstName, randLastName } from '@ngneat/falso';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();

describe('Expression editor modal', () => {
	before(() => {
		cy.setup({ email, firstName, lastName, password });
	});

	beforeEach(() => {
		cy.signin({ email, password });
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.addNodeToCanvas('Hacker News');
		WorkflowPage.actions.openNode('Hacker News');
		WorkflowPage.actions.openExpressionEditorModal();

		cy.on('uncaught:exception', (err) => err.name !== 'ExpressionError');
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
