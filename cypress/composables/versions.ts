import { MainSidebar } from '../pages/sidebar/main-sidebar';

const mainSidebar = new MainSidebar();

/**
 * Getters
 */

export function getVersionUpdatesPanelOpenButton() {
	return cy.getByTestId('version-update-next-versions-link');
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

export function openWhatsNewMenu() {
	mainSidebar.getters.whatsNew().should('be.visible');
	mainSidebar.getters.whatsNew().click();
}

export function openVersionUpdatesPanel() {
	getVersionUpdatesPanelOpenButton().should('be.visible').click();
}

export function closeVersionUpdatesPanel() {
	getVersionUpdatesPanelCloseButton().click();
}
