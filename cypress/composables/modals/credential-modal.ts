/**
 * Getters
 */

import { clearNotifications } from '../../pages/notifications';

export function getCredentialConnectionParameterInputs() {
	return cy.getByTestId('credential-connection-parameter');
}

export function getCredentialConnectionParameterInputByName(name: string) {
	return cy.getByTestId(`parameter-input-${name}`);
}

export function getEditCredentialModal() {
	return cy.getByTestId('editCredential-modal', { timeout: 5000 });
}

export function getCredentialSaveButton() {
	return cy.getByTestId('credential-save-button', { timeout: 5000 });
}

export function getCredentialDeleteButton() {
	return cy.getByTestId('credential-delete-button');
}

export function getCredentialModalCloseButton() {
	return getEditCredentialModal().find('.el-dialog__close').first();
}

/**
 * Actions
 */

export function setCredentialConnectionParameterInputByName(name: string, value: string) {
	getCredentialConnectionParameterInputByName(name).type(value);
}

export function saveCredential() {
	getCredentialSaveButton()
		.click({ force: true })
		.within(() => {
			cy.get('button').should('not.exist');
		});
	getCredentialSaveButton().should('have.text', 'Saved');
}

export function closeCredentialModal() {
	getCredentialModalCloseButton().click();
}

export function setCredentialValues(values: Record<string, string>, save = true) {
	Object.entries(values).forEach(([key, value]) => {
		setCredentialConnectionParameterInputByName(key, value);
	});

	if (save) {
		saveCredential();
		closeCredentialModal();
		clearNotifications();
	}
}
