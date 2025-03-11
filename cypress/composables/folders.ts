import { successToast } from '../pages/notifications';

/**
 * Getters
 */
export function getPersonalProjectMenuItem() {
	return cy.getByTestId('project-personal-menu-item');
}

export function getOverviewMenuItem() {
	return cy.getByTestId('menu-item').contains('Overview');
}

export function getAddResourceDropdown() {
	return cy.getByTestId('add-resource');
}

export function getFolderCards() {
	return cy.getByTestId('folder-card');
}

export function getFolderCard(name: string) {
	return cy.getByTestId('folder-card-name').contains(name).closest('[data-test-id="folder-card"]');
}
export function getAddFolderButton() {
	return cy.getByTestId('add-folder-button');
}

export function getListBreadcrumbs() {
	return cy.getByTestId('main-breadcrumbs');
}

export function getHomeProjectBreadcrumb() {
	return getListBreadcrumbs().findChildByTestId('home-project');
}

export function getVisibleListBreadcrumbs() {
	return getListBreadcrumbs().findChildByTestId('breadcrumbs-item');
}

export function getCurrentBreadcrumb() {
	return getListBreadcrumbs().findChildByTestId('breadcrumbs-item-current');
}

export function getMainBreadcrumbsEllipsis() {
	return getListBreadcrumbs().findChildByTestId('hidden-items-menu');
}

export function getMainBreadcrumbsEllipsisMenuItems() {
	return cy
		.getByTestId('hidden-items-menu')
		.find('span[aria-controls]')
		.invoke('attr', 'aria-controls')
		.then((popperId) => {
			return cy.get(`#${popperId}`).find('li');
		});
}
/**
 * Actions
 */
export function goToPersonalProject() {
	getPersonalProjectMenuItem().click();
}

export function createFolderInsideFolder(childName: string, parentName: string) {
	getFolderCard(parentName).click();
	createFolderFromListHeaderButton(childName);
}

export function createFolderFromListHeaderButton(folderName: string) {
	getAddFolderButton().click();
	createNewFolder(folderName);
}

export function createFolderFromProjectHeader(folderName: string) {
	getPersonalProjectMenuItem().click();
	getAddResourceDropdown().click();
	cy.getByTestId('action-folder').click();
	createNewFolder(folderName);
}

/**
 * Utils
 */

/**
 * Types folder name in the prompt and waits for the folder to be created
 * @param name
 */
function createNewFolder(name: string) {
	cy.intercept('POST', '/rest/projects/**').as('createFolder');
	cy.get('[role=dialog]')
		.filter(':visible')
		.within(() => {
			cy.get('input.el-input__inner').type(name);
			cy.get('button.btn--confirm').click();
		});
	cy.wait('@createFolder');
	successToast().should('exist');
}
