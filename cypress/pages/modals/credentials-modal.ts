import { BasePage } from "../base";

export class CredentialsModal extends BasePage {
	getters = {
		newCredentialModal: () => cy.getByTestId('selectCredential-modal', { timeout: 5000 }),
		newCredentialTypeSelect: () => cy.getByTestId('new-credential-type-select'),
		newCredentialTypeOption: (credentialType: string) => cy.getByTestId('new-credential-type-select-option').contains(credentialType),
		newCredentialTypeButton: () => cy.getByTestId('new-credential-type-button'),
		connectionParameters: () => cy.getByTestId('credential-connection-parameter'),
		connectionParameter: (fieldName: string) => this.getters.connectionParameters().contains(fieldName)
			.parents('[data-test-id="credential-connection-parameter"]')
			.find('.n8n-input input'),
		name: () => cy.getByTestId('credential-name'),
		nameInput: () => cy.getByTestId('credential-name').find('input'),
		saveButton: () => cy.getByTestId('credential-save-button')
	};
	actions = {
		setName: (name: string) => {
			this.getters.name().click();
			this.getters.nameInput().clear().type(name);
		},
		save: () => {
			this.getters.saveButton().click();
		}
	};
}
