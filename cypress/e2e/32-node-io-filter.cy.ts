import { WorkflowPage as WorkflowPageClass, NDV } from '../pages';

const workflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Node IO Filter', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
		cy.createFixtureWorkflow('Node_IO_filter.json', `Node IO filter`);
		workflowPage.actions.saveWorkflowOnButtonClick();
		workflowPage.actions.executeWorkflow();
	});

	it('should filter pinned data', () => {
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.actions.close();
		workflowPage.getters.canvasNodes().first().dblclick();
		cy.wait(500);
		ndv.getters.outputDataContainer().should('be.visible');
		cy.document().trigger('keyup', { key: '/' });

		const searchInput = ndv.getters.searchInput();

		searchInput.filter(':focus').should('exist');
		ndv.getters.pagination().find('li').should('have.length', 3);
		cy.get('.highlight').should('not.exist');

		searchInput.type('ar');
		ndv.getters.pagination().find('li').should('have.length', 2);
		cy.get('.highlight').its('length').should('be.gt', 0);

		searchInput.type('i');
		ndv.getters.pagination().should('not.exist');
		cy.get('.highlight').its('length').should('be.gt', 0);
	});
});
