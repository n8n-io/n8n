import { WorkflowsPage, WorkflowPage, NDV } from '../pages';
import { v4 as uuid } from 'uuid';

const workflowsPage = new WorkflowsPage();
const workflowPage = new WorkflowPage();
const ndv = new NDV();

describe('NDV', () => {
	beforeEach(() => {
		cy.resetAll();
		cy.skipSetup();
		workflowsPage.actions.createWorkflowFromCard();
		workflowPage.actions.renameWorkflow(uuid());
		workflowPage.actions.saveWorkflowOnButtonClick();
	});

	it('should show up when double clicked on a node and close when Back to canvas clicked', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		workflowPage.getters.canvasNodes().first().dblclick();
		ndv.getters.container().should('be.visible');
		ndv.getters.backToCanvas().click()
		ndv.getters.container().should('not.be.visible');
	});

	it('should test webhook node', () => {
		workflowPage.actions.addInitialNodeToCanvas('Webhook');
		workflowPage.getters.canvasNodes().first().dblclick();

		ndv.getters.nodeExecuteButton().first().click();
		ndv.getters.copyInput().click();

		cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');

		cy.readClipboard().then(url => {
			cy.request({
				method: 'GET',
				url,
			}).then((resp) => {
				expect(resp.status).to.eq(200)
			})
		});

		ndv.getters.runDataDisplayMode().should('have.length.at.least', 1).and('be.visible');
	});

	it('should change input', () => {
		cy.createFixtureWorkflow('NDV-test-select-input.json', `NDV test select input ${uuid()}`);
		workflowPage.actions.zoomToFit();
		workflowPage.getters.canvasNodes().last().dblclick();
		ndv.getters.inputSelect().click();
		ndv.getters.inputOption().last().click();
		ndv.getters.inputPanel().within(() => {
			ndv.getters.dataContainer().should('contain', 'start');
		});
	});
});
