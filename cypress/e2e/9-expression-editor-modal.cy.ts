import { NDV } from '../pages/ndv';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Expression editor modal', () => {
	beforeEach(() => {
		WorkflowPage.actions.visit();
		WorkflowPage.actions.addInitialNodeToCanvas('Schedule');
		cy.on('uncaught:exception', (err) => err.name !== 'ExpressionError');
	});

	describe('Static data', () => {
		beforeEach(() => {
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
	});

	describe('Dynamic data', () => {
		beforeEach(() => {
			WorkflowPage.actions.openNode('Schedule Trigger');
			ndv.actions.setPinnedData([{ myStr: 'Monday' }]);
			ndv.actions.close();
			WorkflowPage.actions.addNodeToCanvas('No Operation');
			WorkflowPage.actions.addNodeToCanvas('Hacker News');
			WorkflowPage.actions.openNode('Hacker News');
			WorkflowPage.actions.openExpressionEditorModal();
		});

		it('should resolve $parameter[]', () => {
			WorkflowPage.getters.expressionModalInput().clear();
			WorkflowPage.getters.expressionModalInput().type('{{ $parameter["operation"]');
			WorkflowPage.getters.expressionModalOutput().should('have.text', 'getAll');
		});

		it('should resolve input: $json,$input,$(nodeName)', () => {
			// Previous nodes have not run, input is empty
			WorkflowPage.getters.expressionModalInput().clear();
			WorkflowPage.getters.expressionModalInput().type('{{ $json.myStr');
			WorkflowPage.getters
				.expressionModalOutput()
				.should('have.text', '[Execute previous nodes for preview]');
			WorkflowPage.getters.expressionModalInput().clear();
			WorkflowPage.getters.expressionModalInput().type('{{ $input.item.json.myStr');
			WorkflowPage.getters
				.expressionModalOutput()
				.should('have.text', '[Execute previous nodes for preview]');
			WorkflowPage.getters.expressionModalInput().clear();
			WorkflowPage.getters.expressionModalInput().type("{{ $('Schedule Trigger').item.json.myStr");
			WorkflowPage.getters
				.expressionModalOutput()
				.should('have.text', '[Execute previous nodes for preview]');

			// Run workflow
			cy.get('body').type('{esc}');
			ndv.actions.close();
			WorkflowPage.actions.executeNode('No Operation');
			WorkflowPage.actions.openNode('Hacker News');
			WorkflowPage.actions.openExpressionEditorModal();

			// Previous nodes have run, input can be resolved
			WorkflowPage.getters.expressionModalInput().clear();
			WorkflowPage.getters.expressionModalInput().type('{{ $json.myStr');
			WorkflowPage.getters.expressionModalOutput().should('have.text', 'Monday');
			WorkflowPage.getters.expressionModalInput().clear();
			WorkflowPage.getters.expressionModalInput().type('{{ $input.item.json.myStr');
			WorkflowPage.getters.expressionModalOutput().should('have.text', 'Monday');
			WorkflowPage.getters.expressionModalInput().clear();
			WorkflowPage.getters.expressionModalInput().type("{{ $('Schedule Trigger').item.json.myStr");
			WorkflowPage.getters.expressionModalOutput().should('have.text', 'Monday');
		});
	});
});
