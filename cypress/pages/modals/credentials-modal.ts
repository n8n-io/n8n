import { BasePage } from "../base";

export class CredentialsModal extends BasePage {
	getters = {
		newCredentialModal: () => cy.getByTestId('selectCredential-modal', { timeout: 5000 }),
		editCredentialModal: () => cy.getByTestId('editCredential-modal', { timeout: 5000 }),
		newCredentialTypeSelect: () => cy.getByTestId('new-credential-type-select'),
		newCredentialTypeOption: (credentialType: string) => cy.getByTestId('new-credential-type-select-option').contains(credentialType),
		newCredentialTypeButton: () => cy.getByTestId('new-credential-type-button'),
		connectionParameters: () => cy.getByTestId('credential-connection-parameter'),
		connectionParameter: (fieldName: string) => this.getters.connectionParameters().contains(fieldName)
			.parents('[data-test-id="credential-connection-parameter"]')
			.find('.n8n-input input'),
		name: () => cy.getByTestId('credential-name'),
		nameInput: () => cy.getByTestId('credential-name').find('input'),
		// Saving of the credentials takes a while on the CI so we need to increase the timeout
		saveButton: () => cy.getByTestId('credential-save-button', { timeout: 5000 }),
		closeButton: () => this.getters.editCredentialModal().find('.el-dialog__close').first(),
	};
	actions = {
		setName: (name: string) => {
			this.getters.name().click();
			this.getters.nameInput().clear().type(name);
		},
		save: (test = false) => {
			cy.intercept('POST', '/rest/credentials').as('saveCredential');
			if(test) {
				cy.intercept('POST', '/rest/credentials/test').as('testCredential');
			}

			this.getters.saveButton().click();

			cy.wait('@saveCredential');
			if(test) cy.wait('@testCredential')
			this.getters.saveButton().should('contain.text', 'Saved');
		},
		close: () => {
			this.getters.closeButton().click();
		},
	};
}
