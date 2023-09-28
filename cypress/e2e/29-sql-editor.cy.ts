import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('SQL editors', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should preserve changes when opening-closing Postgres node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Postgres');
		workflowPage.actions.openNode('Postgres');
		ndv.getters.parameterInput('operation').click();
		cy.get('div').contains('Execute Query').click();
		cy.get('div.cm-activeLine').type('SELECT * FROM `testTable`');
		ndv.actions.close();
		workflowPage.actions.openNode('Postgres');
		cy.get('div.cm-activeLine').type('{end} LIMIT 10');
		ndv.actions.close();
		workflowPage.actions.openNode('Postgres');

		cy.get('div.cm-activeLine').contains('SELECT * FROM `testTable` LIMIT 10');
	});

	it('should not push NDV header out with a lot of code in Postgres editor', () => {
		workflowPage.actions.addInitialNodeToCanvas('Postgres', { action: 'Execute a SQL query', keepNdvOpen: true });
		cy.fixture('Dummy_javascript.txt').then((code) => {
			ndv.getters.sqlEditorContainer().get('.cm-content').paste(code);
		});
		ndv.getters.nodeExecuteButton().should('be.visible');
	});

	it('should not push NDV header out with a lot of code in MySQL editor', () => {
		workflowPage.actions.addInitialNodeToCanvas('MySQL', { action: 'Execute a SQL query', keepNdvOpen: true });
		cy.fixture('Dummy_javascript.txt').then((code) => {
			ndv.getters.sqlEditorContainer().get('.cm-content').paste(code);
		});
		ndv.getters.nodeExecuteButton().should('be.visible');
	});
});
