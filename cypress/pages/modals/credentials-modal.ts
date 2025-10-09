import { getCredentialSaveButton, saveCredential } from '../../composables/modals/credential-modal';
import { getVisibleSelect } from '../../utils';
import { BasePage } from '../base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class CredentialsModal extends BasePage {
	getters = {
		newCredentialModal: () => cy.getByTestId('selectCredential-modal', { timeout: 5000 }),
		editCredentialModal: () => cy.getByTestId('editCredential-modal', { timeout: 5000 }),
		newCredentialTypeSelect: () => cy.getByTestId('new-credential-type-select'),
		newCredentialTypeOption: (credentialType: string) =>
			cy.getByTestId('new-credential-type-select-option').contains(credentialType),
		newCredentialTypeButton: () => cy.getByTestId('new-credential-type-button'),
		connectionParameter: (fieldName: string) =>
			this.getters.credentialInputs().find(`:contains('${fieldName}') .n8n-input input`),
		name: () => cy.getByTestId('credential-name'),
		namePreview: () =>
			cy.getByTestId('credential-name').find('span[data-test-id=inline-edit-preview]'),
		nameInput: () => cy.getByTestId('credential-name').find('input'),
		deleteButton: () => cy.getByTestId('credential-delete-button'),
		closeButton: () => this.getters.editCredentialModal().find('.el-dialog__close').first(),
		oauthConnectButton: () => cy.getByTestId('oauth-connect-button'),
		oauthConnectSuccessBanner: () => cy.getByTestId('oauth-connect-success-banner'),
		credentialsEditModal: () => cy.getByTestId('credential-edit-dialog'),
		credentialsAuthTypeSelector: () => cy.getByTestId('node-auth-type-selector'),
		credentialAuthTypeRadioButtons: () =>
			this.getters.credentialsAuthTypeSelector().find('label.el-radio'),
		credentialInputs: () => cy.getByTestId('credential-connection-parameter'),
		menuItem: (name: string) => cy.getByTestId('menu-item').contains(name),
		usersSelect: () => cy.getByTestId('project-sharing-select').filter(':visible'),
		testSuccessTag: () => cy.getByTestId('credentials-config-container-test-success'),
	};

	actions = {
		addUser: (email: string) => {
			this.getters.usersSelect().click();
			getVisibleSelect().contains(email.toLowerCase()).click();
		},
		setName: (name: string) => {
			this.getters.name().getByTestId('inline-edit-preview').click();
			this.getters.nameInput().clear().type(name);
		},
		save: (test = false) => {
			cy.intercept('POST', '/rest/credentials').as('saveCredential');
			saveCredential();

			cy.wait('@saveCredential');
			if (test) cy.wait('@testCredential');
			getCredentialSaveButton().should('contain.text', 'Saved');
		},
		saveSharing: () => {
			cy.intercept('PUT', '/rest/credentials/*/share').as('shareCredential');
			saveCredential();
			cy.wait('@shareCredential');
			getCredentialSaveButton().should('contain.text', 'Saved');
		},
		close: () => {
			this.getters.closeButton().click();
		},
		fillCredentialsForm: (closeModal = true) => {
			this.getters.credentialsEditModal().should('be.visible');
			this.getters.credentialInputs().should('have.length.greaterThan', 0);
			this.getters
				.credentialInputs()
				.find('input[type=text], input[type=password]')
				.filter(':not([readonly])')
				.each(($el) => {
					cy.wrap($el).type('test');
				})
				// wait for text input debounce
				.wait(300);
			saveCredential();
			if (closeModal) {
				this.getters.closeButton().click();
			}
		},
		fillField: (fieldName: string, value: string) => {
			this.getters
				.credentialInputs()
				.getByTestId(`parameter-input-${fieldName}`)
				.find('input')
				.type(value);
		},
		createNewCredential: (type: string, closeModal = true) => {
			this.getters.newCredentialModal().should('be.visible');
			this.getters.newCredentialTypeSelect().should('be.visible');
			this.getters.newCredentialTypeOption(type).click();
			this.getters.newCredentialTypeButton().click();
			this.actions.fillCredentialsForm(closeModal);
		},
		renameCredential: (newName: string) => {
			this.getters.namePreview().click();
			this.getters.nameInput().type(newName);
			this.getters.nameInput().type('{enter}');
		},
		changeTab: (tabName: 'Sharing') => {
			this.getters.menuItem(tabName).click();
		},
	};
}
