import { BasePage } from "./base";

export class WorkflowPage extends BasePage {
	url = '/workflow/new';
	elements = {
		workflowNameInput: () => cy.getByTestId('workflow-name-input').then($el => cy.wrap($el.find('input'))),
		workflowImportInput: () => cy.getByTestId('workflow-import-input'),
		workflowTags: () => cy.getByTestId('workflow-tags'),
		saveButton: () => cy.getByTestId('save-button'),
	};
}
