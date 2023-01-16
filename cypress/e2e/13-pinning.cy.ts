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

		ndv.getters.outputDataContainer().should('be.visible');
		ndv.getters.outputDataContainer().get('table').should('be.visible');
		ndv.getters.outputTableRows().should('have.length', 2);
		ndv.getters.outputTableHeaders().should('have.length.at.least', 10);
		ndv.getters.outputTableHeaders().first().should('include.text', 'timestamp');
		ndv.getters.outputTableHeaders().eq(1).should('include.text', 'Readable date');

		ndv.getters.outputTbodyCell(1, 0).invoke('text').then((prevValue) => {
			ndv.actions.pinData();
			ndv.actions.close();

			workflowPage.actions.executeWorkflow();
			workflowPage.actions.openNode('Schedule Trigger');

			ndv.getters.outputTbodyCell(1, 0).invoke('text').should('eq', prevValue);
		});
	});

	it('Should be be able to set pinned data', () => {
		workflowPage.actions.addInitialNodeToCanvas('Schedule Trigger');
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.container().should('be.visible');
		ndv.getters.pinDataButton().should('not.exist');
		ndv.getters.editPinnedDataButton().should('be.visible');

		ndv.actions.setPinnedData([{ test: 1 }]);

		ndv.getters.outputTableRows().should('have.length', 2);
		ndv.getters.outputTableHeaders().should('have.length', 2);
		ndv.getters.outputTableHeaders().first().should('include.text', 'test');
		ndv.getters.outputTbodyCell(1, 0).should('include.text', 1);

		ndv.actions.close();

		workflowPage.actions.saveWorkflowOnButtonClick();

		cy.reload();
		workflowPage.actions.openNode('Schedule Trigger');

		ndv.getters.outputTableHeaders().first().should('include.text', 'test');
		ndv.getters.outputTbodyCell(1, 0).should('include.text', 1);
	});
});
