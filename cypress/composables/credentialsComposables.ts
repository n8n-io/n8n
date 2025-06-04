export function getCredentialsPageUrl() {
	return '/home/credentials';
}

export const verifyCredentialsListPageIsLoaded = () => {
	cy.get('[data-test-id="resources-list-wrapper"], [data-test-id="empty-resources-list"]').should(
		'be.visible',
	);
};

export const loadCredentialsPage = (credentialsPageUrl: string) => {
	cy.visit(credentialsPageUrl);
	verifyCredentialsListPageIsLoaded();
};

/**
 * Getters - Page
 */

export function getEmptyListCreateCredentialButton() {
	return cy.getByTestId('empty-resources-list').find('button');
}

export function getCredentialCards() {
	return cy.getByTestId('resources-list-item');
}

/**
 * Getters - Modal
 */

export function getNewCredentialModal() {
	return cy.getByTestId('selectCredential-modal', { timeout: 5000 });
}

export function getEditCredentialModal() {
	return cy.getByTestId('editCredential-modal', { timeout: 5000 });
}

export function getNewCredentialTypeSelect() {
	return cy.getByTestId('new-credential-type-select');
}

export function getNewCredentialTypeOption(credentialType: string) {
	return cy.getByTestId('new-credential-type-select-option').contains(credentialType);
}

export function getNewCredentialTypeButton() {
	return cy.getByTestId('new-credential-type-button');
}

export function getCredentialConnectionParameterInputs() {
	return cy.getByTestId('credential-connection-parameter');
}

export function getConnectionParameter(fieldName: string) {
	return getCredentialConnectionParameterInputs().find(
		`:contains('${fieldName}') .n8n-input input`,
	);
}

export function getCredentialSaveButton() {
	return cy.getByTestId('credential-save-button', { timeout: 5000 });
}

/**
 * Actions - Modal
 */

export function setCredentialName(name: string) {
	cy.getByTestId('credential-name').find('span[data-test-id=inline-edit-preview]').click();
	cy.getByTestId('credential-name').type(name);
}
export function saveCredential() {
	getCredentialSaveButton()
		.click({ force: true })
		.within(() => {
			cy.get('button').should('not.exist');
		});
	getCredentialSaveButton().should('have.text', 'Saved');
}
export function saveCredentialWithWait() {
	cy.intercept('POST', '/rest/credentials').as('saveCredential');
	saveCredential();
	cy.wait('@saveCredential');
	getCredentialSaveButton().should('contain.text', 'Saved');
}

export function closeNewCredentialModal() {
	getNewCredentialModal().find('.el-dialog__close').first().click();
}

export function createNewCredential(
	type: string,
	name: string,
	parameter: string,
	parameterValue: string,
	closeModal = true,
) {
	getEmptyListCreateCredentialButton().click();

	getNewCredentialModal().should('be.visible');
	getNewCredentialTypeSelect().should('be.visible');
	getNewCredentialTypeOption(type).click();

	getNewCredentialTypeButton().click();
	getConnectionParameter(parameter).type(parameterValue);

	setCredentialName(name);
	saveCredential();
	if (closeModal) {
		getEditCredentialModal().find('.el-dialog__close').first().click();
	}
}
