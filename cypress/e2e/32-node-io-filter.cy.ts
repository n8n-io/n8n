import { WorkflowPage as WorkflowPageClass, NDV } from '../pages';

const workflowPage = new WorkflowPageClass();
const ndv = new NDV();

describe('Node IO Filter', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
		cy.createFixtureWorkflow('Node_IO_filter.json');
		workflowPage.actions.saveWorkflowOnButtonClick();
		workflowPage.actions.executeWorkflow();
	});

	it('should filter pinned data', () => {
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.actions.close();
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.outputDataContainer().should('be.visible');
		ndv.getters.outputPanel().findChildByTestId('ndv-search').should('exist');
		cy.document().trigger('keyup', { key: '/' });

		const searchInput = ndv.getters.searchInput();

		searchInput.should('have.focus');
		ndv.getters.pagination().find('li').should('have.length', 3);
		ndv.getters.outputDataContainer().find('mark').should('not.exist');

		searchInput.type('ar');
		ndv.getters.pagination().find('li').should('have.length', 2);
		ndv.getters.outputDataContainer().find('mark').its('length').should('be.gt', 0);

		searchInput.type('i');
		ndv.getters.pagination().should('not.exist');
		ndv.getters.outputDataContainer().find('mark').its('length').should('be.gt', 0);
	});

	it('should filter input/output data separately', () => {
		workflowPage.getters.canvasNodes().eq(1).dblclick();
		ndv.getters.outputDataContainer().should('be.visible');
		ndv.getters.inputDataContainer().should('be.visible');
		ndv.actions.switchInputMode('Table');
		ndv.getters.outputPanel().findChildByTestId('ndv-search').should('exist');
		cy.document().trigger('keyup', { key: '/' });

		ndv.getters.outputPanel().findChildByTestId('ndv-search').should('not.have.focus');

		let focusedInput = ndv.getters
			.inputPanel()
			.findChildByTestId('ndv-search')
			.should('have.focus');

		const getInputPagination = () =>
			ndv.getters.inputPanel().findChildByTestId('ndv-data-pagination');
		const getInputCounter = () => ndv.getters.inputPanel().findChildByTestId('ndv-items-count');
		const getOuputPagination = () =>
			ndv.getters.outputPanel().findChildByTestId('ndv-data-pagination');
		const getOutputCounter = () => ndv.getters.outputPanel().findChildByTestId('ndv-items-count');

		getInputPagination().find('li').should('have.length', 3);
		getInputCounter().contains('21 items').should('exist');
		getOuputPagination().find('li').should('have.length', 3);
		getOutputCounter().contains('21 items').should('exist');
		focusedInput.type('ar');

		getInputPagination().find('li').should('have.length', 2);
		getInputCounter().should('contain', '14 of 21 items');
		getOuputPagination().find('li').should('have.length', 3);
		getOutputCounter().should('contain', '21 items');
		focusedInput.type('i');

		getInputPagination().should('not.exist');
		getInputCounter().should('contain', '8 of 21 items');
		getOuputPagination().find('li').should('have.length', 3);
		getOutputCounter().should('contain', '21 items');

		focusedInput.clear();
		getInputPagination().find('li').should('have.length', 3);
		getInputCounter().contains('21 items').should('exist');
		getOuputPagination().find('li').should('have.length', 3);
		getOutputCounter().contains('21 items').should('exist');

		ndv.getters.outputDataContainer().trigger('mouseover');
		cy.document().trigger('keyup', { key: '/' });
		ndv.getters.inputPanel().findChildByTestId('ndv-search').should('not.have.focus');

		focusedInput = ndv.getters.outputPanel().findChildByTestId('ndv-search').should('have.focus');

		getInputPagination().find('li').should('have.length', 3);
		getInputCounter().contains('21 items').should('exist');
		getOuputPagination().find('li').should('have.length', 3);
		getOutputCounter().contains('21 items').should('exist');
		focusedInput.type('ar');

		getInputPagination().find('li').should('have.length', 3);
		getInputCounter().contains('21 items').should('exist');
		getOuputPagination().find('li').should('have.length', 2);
		getOutputCounter().should('contain', '14 of 21 items');
		focusedInput.type('i');

		getInputPagination().find('li').should('have.length', 3);
		getInputCounter().contains('21 items').should('exist');
		getOuputPagination().should('not.exist');
		getOutputCounter().should('contain', '8 of 21 items');

		focusedInput.clear();
		getInputPagination().find('li').should('have.length', 3);
		getInputCounter().contains('21 items').should('exist');
		getOuputPagination().find('li').should('have.length', 3);
		getOutputCounter().contains('21 items').should('exist');
	});
});
