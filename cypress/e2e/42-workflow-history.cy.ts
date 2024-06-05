import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';
import { getVisibleSelect } from '../utils';

const WorkflowPage = new WorkflowPageClass();

describe('Editor actions should work', () => {
	beforeEach(() => {
		cy.enableFeature('workflowHistory');
		WorkflowPage.actions.visit();
	});

	afterEach(() => {
		cy.disableFeature('workflowHistory');
	});

	it('should create new workflow version when settings are updated', () => {
		WorkflowPage.actions.addInitialNodeToCanvas('Manual');
		WorkflowPage.actions.saveWorkflowOnButtonClick();
		WorkflowPage.getters.workflowHistoryButton().should('be.enabled');
		WorkflowPage.getters.workflowHistoryButton().click();
		cy.url().should('include', '/history');
		WorkflowPage.getters.workflowHistoryItems().its('length').should('be.greaterThan', 0);
		WorkflowPage.getters.workflowHistoryItems().its('length').then((initialVersionCount) => {
			WorkflowPage.getters.workflowHistoryCloseButton().click();
			WorkflowPage.getters.workflowMenu().should('be.visible');
			WorkflowPage.getters.workflowMenu().click();
			WorkflowPage.getters.workflowMenuItemSettings().should('be.visible');
			WorkflowPage.getters.workflowMenuItemSettings().click();
			// Update manual executions settings
			WorkflowPage.getters.workflowSettingsSaveManualExecutionsSelect().click();
			getVisibleSelect().find('li').should('have.length', 3);
			getVisibleSelect().find('li').last().click({ force: true });
			// Save settings
			WorkflowPage.getters.workflowSettingsSaveButton().click();
			WorkflowPage.getters.workflowSettingsModal().should('not.exist');
			WorkflowPage.getters.successToast().should('exist');
			// Check if new version was created
			WorkflowPage.getters.workflowHistoryButton().should('be.enabled');
			WorkflowPage.getters.workflowHistoryButton().click();
			WorkflowPage.getters.workflowHistoryItems().its('length').should('be.greaterThan', initialVersionCount);
		});
	});
});
