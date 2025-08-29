import { openNodeCreator, searchBar } from '../composables/nodeCreator';
import { addNodeToCanvas, navigateToNewWorkflowPage } from '../composables/workflow';

describe('RAG callout experiment', () => {
	describe('NDV callout', () => {
		it('should show callout and open template on click', () => {
			cy.intercept('workflows/templates/rag-starter-template?fromJson=true');

			navigateToNewWorkflowPage();

			addNodeToCanvas('Zep Vector Store', true, true, 'Add documents to vector store');

			cy.contains('Tip: Get a feel for vector stores in n8n with our').should('exist');

			let openedUrl = '';
			cy.window().then((win) => {
				cy.stub(win, 'open').callsFake((url) => {
					openedUrl = url;
				});
			});
			cy.contains('RAG starter template').click();
			cy.then(() => cy.visit(openedUrl));

			cy.url().should('include', '/workflows/templates/rag-starter-template?fromJson=true');
		});
	});
	describe('search callout', () => {
		it('should show callout and open template on click', () => {
			cy.intercept('workflows/templates/rag-starter-template?fromJson=true');

			navigateToNewWorkflowPage();

			openNodeCreator();
			searchBar().type('rag');

			let openedUrl = '';
			cy.window().then((win) => {
				cy.stub(win, 'open').callsFake((url) => {
					openedUrl = url;
				});
			});
			cy.contains('RAG starter template').should('exist').click();
			cy.then(() => cy.visit(openedUrl));

			cy.url().should('include', '/workflows/templates/rag-starter-template?fromJson=true');
		});
	});
});
