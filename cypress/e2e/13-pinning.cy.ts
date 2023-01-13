import { WorkflowPage, NDV } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('Data pinning', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		workflowPage.actions.visit();
		cy.waitForLoad();
	});

	it('Should be able to pin node output', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.container().should('be.visible');
		ndv.getters.pinDataButton().should('not.exist');
		ndv.getters.editPinnedDataButton().should('be.visible');

		ndv.actions.execute();

		ndv.getters.dataContainer().should('be.visible');
		ndv.getters.dataContainer().get('table').should('be.visible');
		ndv.getters.dataContainer().find('table tr').should('have.length', 2);
		ndv.getters.dataContainer().find('table thead th').should('have.length.at.least', 10);
		ndv.getters.dataContainer().find('table tbody td').should('have.length.at.least', 10);
		ndv.getters.dataContainer().find('table thead th:first').should('include.text', 'timestamp');
		ndv.getters.dataContainer().find('table thead th:nth-child(2)').should('include.text', 'Readable date');


		let prevValue = '';
		ndv.getters.dataContainer().find('table tbody td:first').should((before) => {
			prevValue = before.text();
		});

		ndv.actions.pinData();
		ndv.actions.close();

		workflowPage.actions.executeWorkflow();

		workflowPage.actions.openNodeNdv('Schedule Trigger');

		ndv.getters.dataContainer().find('table tbody td:first').should((after) => {
			const currValue = after.text();

			expect(prevValue).to.equal(currValue);
		});
	});
});
