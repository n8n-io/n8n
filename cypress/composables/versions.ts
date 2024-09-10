/**
 * Getters
 */

export function getVersionUpdatesPanelOpenButton() {
	return cy.getByTestId('version-updates-panel-button');
}

export function getVersionUpdatesPanel() {
	return cy.getByTestId('version-updates-panel');
}

export function getVersionUpdatesPanelCloseButton() {
	return getVersionUpdatesPanel().get('.el-drawer__close-btn').first();
}

export function getVersionCard() {
	return cy.getByTestId('version-card');
}

/**
 * Actions
 */

export function openVersionUpdatesPanel() {
	getVersionUpdatesPanelOpenButton().click();
	getVersionUpdatesPanel().should('be.visible');
}

export function closeVersionUpdatesPanel() {
	getVersionUpdatesPanelCloseButton().click();
}
