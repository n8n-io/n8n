import { WorkflowPage } from '../pages';
import { errorToast, successToast } from '../pages/notifications';

const workflowPage = new WorkflowPage();

before(() => {
	cy.fixture('Onboarding_workflow.json').then((data) => {
		cy.intercept('GET', '/rest/workflows/from-url*', {
			body: { data },
		}).as('downloadWorkflowFromURL');
	});
});

describe('Import workflow', () => {
	describe('From URL', () => {
		it('should import workflow', () => {
			workflowPage.actions.visit(true);
			workflowPage.getters.workflowMenu().click();
			workflowPage.getters.workflowMenuItemImportFromURLItem().click();

			workflowPage.getters.inputURLImportWorkflowFromURL().should('be.visible');

			workflowPage.getters
				.inputURLImportWorkflowFromURL()
				.type('https://fakepage.com/workflow.json');

			workflowPage.getters.confirmActionImportWorkflowFromURL().click();

			workflowPage.actions.zoomToFit();

			workflowPage.getters.canvasNodes().should('have.length', 4);

			errorToast().should('not.exist');

			successToast().should('not.exist');
		});

		it('clicking outside modal should not show error toast', () => {
			workflowPage.actions.visit(true);
			workflowPage.getters.workflowMenu().click();
			workflowPage.getters.workflowMenuItemImportFromURLItem().click();

			cy.get('body').click(0, 0);

			errorToast().should('not.exist');
		});

		it('canceling modal should not show error toast', () => {
			workflowPage.actions.visit(true);

			workflowPage.getters.workflowMenu().click();
			workflowPage.getters.workflowMenuItemImportFromURLItem().click();
			workflowPage.getters.cancelActionImportWorkflowFromURL().click();

			errorToast().should('not.exist');
		});
	});

	describe('From File', () => {
		it('should import workflow', () => {
			workflowPage.actions.visit(true);

			workflowPage.getters.workflowMenu().click();
			workflowPage.getters.workflowMenuItemImportFromFile().click();
			workflowPage.getters
				.workflowImportInput()
				.selectFile('fixtures/Test_workflow-actions_paste-data.json', { force: true });
			cy.waitForLoad(false);
			workflowPage.actions.zoomToFit();
			workflowPage.getters.canvasNodes().should('have.length', 5);
			workflowPage.getters.nodeConnections().should('have.length', 5);
		});
	});
});
