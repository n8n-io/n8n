import { WorkflowPage } from '../pages';
import { MessageBox as MessageBoxClass } from '../pages/modals/message-box';

const workflowPage = new WorkflowPage();
const messageBox = new MessageBoxClass();

before(() => {
	cy.fixture('Onboarding_workflow.json').then((data) => {
		cy.intercept('GET', '/rest/workflows/from-url*', {
			body: { data },
		}).as('downloadWorkflowFromURL');
	});
});

describe('Import workflow', () => {
	it('should allow importing workflow via URL', () => {
		workflowPage.actions.visit(true);
		workflowPage.getters.workflowMenu().click();
		workflowPage.getters.workflowMenuItemImportFromURLItem().click();

		messageBox.getters.modal().should('be.visible');

		messageBox.getters.content().type('https://fakepage.com/workflow.json');

		messageBox.getters.confirm().click();

		workflowPage.actions.zoomToFit();

		workflowPage.getters.canvasNodes().should('have.length', 4);

		workflowPage.getters.errorToast().should('not.exist');

		workflowPage.getters.successToast().should('not.exist');
	});

	it('clicking outside import workflow by URL modal should not show error toast', () => {
		workflowPage.actions.visit(true);

		workflowPage.getters.workflowMenu().click();
		workflowPage.getters.workflowMenuItemImportFromURLItem().click();

		cy.get('body').click(0, 0);

		workflowPage.getters.errorToast().should('not.exist');
	});

	it('canceling workflow by URL modal should not show error toast', () => {
		workflowPage.actions.visit(true);

		workflowPage.getters.workflowMenu().click();
		workflowPage.getters.workflowMenuItemImportFromURLItem().click();
		messageBox.getters.cancel().click();

		workflowPage.getters.errorToast().should('not.exist');
	});
});
