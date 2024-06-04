import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

// Update is debounced in editors, so adding typing delay to catch up
const TYPING_DELAY = 100;

describe('Editors', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	describe('SQL Editor', () => {

		it('should preserve changes when opening-closing Postgres node', () => {
			workflowPage.actions.addInitialNodeToCanvas('Postgres', {
				action: 'Execute a SQL query',
				keepNdvOpen: true,
			});
			ndv.getters
				.sqlEditorContainer()
				.click()
				.find('.cm-content')
				.type('SELECT * FROM `testTable`', { delay: TYPING_DELAY })
				.type('{esc}');
			ndv.actions.close();
			workflowPage.actions.openNode('Postgres');
			ndv.getters.sqlEditorContainer().find('.cm-content').type('{end} LIMIT 10', { delay: TYPING_DELAY }).type('{esc}');
			ndv.actions.close();
			workflowPage.actions.openNode('Postgres');
			ndv.getters.sqlEditorContainer().should('contain', 'SELECT * FROM `testTable` LIMIT 10');
		});

		it('should update expression output dropdown as the query is edited', () => {
			workflowPage.actions.addInitialNodeToCanvas('MySQL', {
				action: 'Execute a SQL query',
			});
			ndv.actions.close();

			workflowPage.actions.openNode('When clicking ‘Test workflow’');
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

		it('should not trigger dirty flag if nothing is changed', () => {
			workflowPage.actions.addInitialNodeToCanvas('Postgres', {
				action: 'Execute a SQL query',
				keepNdvOpen: true,
			});
			ndv.actions.close();
			workflowPage.actions.saveWorkflowOnButtonClick();
			workflowPage.getters.isWorkflowSaved();
			workflowPage.actions.openNode('Postgres');
			ndv.actions.close();
			// Workflow should still be saved
			workflowPage.getters.isWorkflowSaved();
		});

		it('should trigger dirty flag if query is updated', () => {
			workflowPage.actions.addInitialNodeToCanvas('Postgres', {
				action: 'Execute a SQL query',
				keepNdvOpen: true,
			});
			ndv.actions.close();
			workflowPage.actions.saveWorkflowOnButtonClick();
			workflowPage.getters.isWorkflowSaved();
			workflowPage.actions.openNode('Postgres');
			ndv.getters
				.sqlEditorContainer()
				.click()
				.find('.cm-content')
				.type('SELECT * FROM `testTable`', { delay: TYPING_DELAY })
				.type('{esc}');
			ndv.actions.close();
			workflowPage.getters.isWorkflowSaved().should('not.be.true');
		});
	});

	describe('HTML Editor', () => {
		// Closing tags will be added by the editor
		const TEST_ELEMENT_H1 = '<h1>Test';
		const TEST_ELEMENT_P = '<p>Test';

		it('should preserve changes when opening-closing HTML node', () => {
			workflowPage.actions.addInitialNodeToCanvas('HTML', {
				action: 'Generate HTML template',
				keepNdvOpen: true,
			});
			ndv.getters
				.htmlEditorContainer()
				.click()
				.find('.cm-content')
				.type(`{selectall}${TEST_ELEMENT_H1}`, { delay: TYPING_DELAY, force: true })
				.type('{esc}');
			ndv.actions.close();
			workflowPage.actions.openNode('HTML');
			ndv.getters.htmlEditorContainer().find('.cm-content').type(`{end}${TEST_ELEMENT_P}`, { delay: TYPING_DELAY, force: true }).type('{esc}');
			ndv.actions.close();
			workflowPage.actions.openNode('HTML');
			ndv.getters.htmlEditorContainer().should('contain', TEST_ELEMENT_H1);
			ndv.getters.htmlEditorContainer().should('contain', TEST_ELEMENT_P);
		});

		it('should not trigger dirty flag if nothing is changed', () => {
			workflowPage.actions.addInitialNodeToCanvas('HTML', {
				action: 'Generate HTML template',
				keepNdvOpen: true,
			});
			ndv.actions.close();
			workflowPage.actions.saveWorkflowOnButtonClick();
			workflowPage.getters.isWorkflowSaved();
			workflowPage.actions.openNode('HTML');
			ndv.actions.close();
			// Workflow should still be saved
			workflowPage.getters.isWorkflowSaved();
		});

		it('should trigger dirty flag if query is updated', () => {
			workflowPage.actions.addInitialNodeToCanvas('HTML', {
				action: 'Generate HTML template',
				keepNdvOpen: true,
			});
			ndv.actions.close();
			workflowPage.actions.saveWorkflowOnButtonClick();
			workflowPage.getters.isWorkflowSaved();
			workflowPage.actions.openNode('HTML');
			ndv.getters
				.htmlEditorContainer()
				.click()
				.find('.cm-content')
				.type(`{selectall}${TEST_ELEMENT_H1}`, { delay: TYPING_DELAY, force: true })
				.type('{esc}');
			ndv.actions.close();
			workflowPage.getters.isWorkflowSaved().should('not.be.true');
		});
	});
});
