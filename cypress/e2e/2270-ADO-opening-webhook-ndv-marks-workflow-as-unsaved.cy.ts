import { WEBHOOK_NODE_NAME } from '../constants';
import { NDV, WorkflowPage } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();

// Migrated to Playwright
// eslint-disable-next-line n8n-local-rules/no-skipped-tests
describe.skip('ADO-2270 Save button resets on webhook node open', () => {
	it('should not reset the save button if webhook node is opened and closed', () => {
		workflowPage.actions.visit();
		workflowPage.actions.addInitialNodeToCanvas(WEBHOOK_NODE_NAME);
		workflowPage.getters.saveButton().click();
		workflowPage.actions.openNode(WEBHOOK_NODE_NAME);

		ndv.actions.close();

		cy.getByTestId('workflow-save-button').should('contain', 'Saved');
	});
});
