import { NDV } from '../pages';

/**
 * Getters
 */

export function getCredentialSelect(eq = 0) {
	return cy.getByTestId('node-credentials-select').eq(eq);
}

export function getCreateNewCredentialOption() {
	return cy.getByTestId('node-credentials-select-item-new');
}

export function getBackToCanvasButton() {
	return cy.getByTestId('back-to-canvas');
}

/**
 * Actions
 */

export function openCredentialSelect(eq = 0) {
	getCredentialSelect(eq).click();
}

export function setCredentialByName(name: string) {
	openCredentialSelect();
	getCredentialSelect().contains(name).click();
}

export function clickCreateNewCredential() {
	openCredentialSelect();
	getCreateNewCredentialOption().click();
}

export function clickGetBackToCanvas() {
	getBackToCanvasButton().click();
}

/**
 * Composables
 */

export function useNDVPage() {
	const page = new NDV();
	return {
		setCredentialByName,
		clickCreateNewCredential,
		clickGetBackToCanvas,
		...page.actions,
	};
}
