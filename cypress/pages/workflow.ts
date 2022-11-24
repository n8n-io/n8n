import { BasePage } from "./base";

export class WorkflowPage extends BasePage {
	url = '/workflow/new';
	getters = {
		workflowNameInput: () => cy.getByTestId('workflow-name-input').then($el => cy.wrap($el.find('input'))),
		workflowImportInput: () => cy.getByTestId('workflow-import-input'),
		workflowTags: () => cy.getByTestId('workflow-tags'),
		saveButton: () => cy.getByTestId('wf-save-button').children().first(),
		activatorSwitch: () => cy.getByTestId('wf-activate-switch'),
		workflowMenu: () => cy.getByTestId('workflow-menu'),
	};
	actions = {
		visit: () => {
			cy.visit(this.url);
			cy.get('[data-test-id=node-view-loader]', { timeout: 5000 }).should('not.exist');
			cy.get('.el-loading-mask', { timeout: 5000 }).should('not.exist');
		},
		openWorkflowMenu: () => {
			this.getters.workflowMenu().click();
		},
		saveWorkflowOnButtonClick: () => {
			this.getters.saveButton().click();
		},
		saveWorkflowUsingKeyboardShortcut: () => {
			cy.get('body').type('{meta}', { release: false }).type('s');
		},
	};
}
