import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('SQL editors', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should preserve changes when opening-closing Postgres node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Postgres', {
			action: 'Execute a SQL query',
			keepNdvOpen: true,
		});
		ndv.getters
			.sqlEditorContainer()
			.click()
			.find('.cm-content')
			.type('SELECT * FROM `testTable`')
			.type('{esc}');
		ndv.actions.close();
		workflowPage.actions.openNode('Postgres');
		ndv.getters.sqlEditorContainer().find('.cm-content').type('{end} LIMIT 10').type('{esc}');
		ndv.actions.close();
		workflowPage.actions.openNode('Postgres');
		ndv.getters.sqlEditorContainer().should('contain', 'SELECT * FROM `testTable` LIMIT 10');
	});

	it('should update expression output dropdown as the query is edited', () => {
		workflowPage.actions.addInitialNodeToCanvas('MySQL', {
			action: 'Execute a SQL query',
		});
		ndv.actions.close();

		workflowPage.actions.openNode('When clicking "Test workflow"');
		ndv.actions.setPinnedData([{ table: 'test_table' }]);
		ndv.actions.close();

		workflowPage.actions.openNode('MySQL');
		ndv.getters
			.sqlEditorContainer()
			.find('.cm-content')
			.type('SELECT * FROM {{ $json.table }}', { parseSpecialCharSequences: false });
		workflowPage.getters
			.inlineExpressionEditorOutput()
			.should('have.text', 'SELECT * FROM test_table');
	});

	it('should not push NDV header out with a lot of code in Postgres editor', () => {
		workflowPage.actions.addInitialNodeToCanvas('Postgres', {
			action: 'Execute a SQL query',
			keepNdvOpen: true,
		});
		cy.fixture('Dummy_javascript.txt').then((code) => {
			ndv.getters.sqlEditorContainer().find('.cm-content').paste(code);
		});
		ndv.getters.nodeExecuteButton().should('be.visible');
	});

	it('should not push NDV header out with a lot of code in MySQL editor', () => {
		workflowPage.actions.addInitialNodeToCanvas('MySQL', {
			action: 'Execute a SQL query',
			keepNdvOpen: true,
		});
		cy.fixture('Dummy_javascript.txt').then((code) => {
			ndv.getters.sqlEditorContainer().find('.cm-content').paste(code);
		});
		ndv.getters.nodeExecuteButton().should('be.visible');
	});
});
