import { BasePage } from '../base';

export class CredentialsModal extends BasePage {
	getters = {
		newCredentialModal: () => cy.getByTestId('selectCredential-modal', { timeout: 5000 }),
		editCredentialModal: () => cy.getByTestId('editCredential-modal', { timeout: 5000 }),
		newCredentialTypeSelect: () => cy.getByTestId('new-credential-type-select'),
		newCredentialTypeOption: (credentialType: string) =>
			cy.getByTestId('new-credential-type-select-option').contains(credentialType),
		newCredentialTypeButton: () => cy.getByTestId('new-credential-type-button'),
		connectionParameters: () => cy.getByTestId('credential-connection-parameter'),
		connectionParameter: (fieldName: string) =>
			this.getters
				.connectionParameters()
				.find(`:contains('${fieldName}') .n8n-input input`),
		name: () => cy.getByTestId('credential-name'),
		nameInput: () => cy.getByTestId('credential-name').find('input'),
		// Saving of the credentials takes a while on the CI so we need to increase the timeout
		saveButton: () => cy.getByTestId('credential-save-button', { timeout: 5000 }),
		deleteButton: () => cy.getByTestId('credential-delete-button'),
		closeButton: () => this.getters.editCredentialModal().find('.el-dialog__close').first(),
		credentialsEditModal: () => cy.getByTestId('credential-edit-dialog'),
		credentialsAuthTypeSelector: () => cy.getByTestId('node-auth-type-selector'),
		credentialAuthTypeRadioButtons: () =>
			this.getters.credentialsAuthTypeSelector().find('label[role=radio]'),
		credentialInputs: () => cy.getByTestId('credential-connection-parameter'),
		menu: () => this.getters.editCredentialModal().get('.menu-container'),
		menuItem: (name: string) => this.getters.menu().get('.n8n-menu-item').contains(name),
		usersSelect: () => cy.getByTestId('credential-sharing-modal-users-select'),
	};
	actions = {
		addUser: (email: string) => {
			this.getters.usersSelect().click();
			this.getters
				.usersSelect()
				.get('.el-select-dropdown__item')
				.contains(email.toLowerCase())
				.click();
		},
		setName: (name: string) => {
			this.getters.name().click();
			this.getters.nameInput().clear().type(name);
		},
		save: (test = false) => {
			cy.intercept('POST', '/rest/credentials').as('saveCredential');
			this.getters.saveButton().click();

			cy.wait('@saveCredential');
			if (test) cy.wait('@testCredential');
			this.getters.saveButton().should('contain.text', 'Saved');
		},
		close: () => {
			this.getters.closeButton().click();
		},
		fillCredentialsForm: () => {
			this.getters.credentialsEditModal().should('be.visible');
			this.getters.credentialInputs().should('have.length.greaterThan', 0);
			this.getters
				.credentialInputs()
				.find('input[type=text], input[type=password]')
				.each(($el) => {
					cy.wrap($el).type('test');
				});
			this.getters.saveButton().click();
			this.getters.closeButton().click();
		},
		renameCredential: (newName: string) => {
			this.getters.nameInput().type('{selectall}');
			this.getters.nameInput().type(newName);
			this.getters.nameInput().type('{enter}');
		},
		changeTab: (tabName: string) => {
			this.getters.menuItem(tabName).click();
		},
	};
}
