import { BasePage } from "./base";

export class WorkflowPage extends BasePage {
	url = '/workflow/new';
	getters = {
		// workflowNameInput: () => cy.getByTestId('workflow-name-input', { timeout: 5000 }).then($el => cy.wrap($el.find('input'))),
		workflowImportInput: () => cy.getByTestId('workflow-import-input'),
		workflowTags: () => cy.getByTestId('workflow-tags'),
		saveButton: () => cy.getByTestId('wf-save-button').children().first(),
		activatorSwitch: () => cy.getByTestId('wf-activate-switch'),
		workflowMenu: () => cy.getByTestId('workflow-menu'),
		firstStepButton: () => cy.getByTestId('canvas-add-button'),
		triggerNodeItem: (name: string) => cy.getByTestId(name),
		workflowNameInput: () => cy.getByTestId('workflow-name-input'),
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
		addTriggerNode: (name: string) => {
			this.getters.firstStepButton().click();
			this.getters.triggerNodeItem(name).click();
			cy.get('body').type('{esc}');
		},
		activateWorkflow: () => {
			this.getters.activatorSwitch().find('input').first().should('be.enabled');
			this.getters.activatorSwitch().click();
			cy.get('body').type('{esc}');
		},
		renameWorkflow: (newName: string) => {
			this.getters.workflowNameInput().click();
			cy.get('body').type('{selectall}');
			cy.get('body').type(newName);
			cy.get('body').type('{enter}');
		},
	};
}
