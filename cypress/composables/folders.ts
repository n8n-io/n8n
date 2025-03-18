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

export function getWorkflowCards() {
	return cy.getByTestId('resources-list-item-workflow');
}

export function getWorkflowCard(name: string) {
	return cy
		.getByTestId('workflow-card-name')
		.contains(name)
		.closest('[data-test-id="resources-list-item-workflow"]');
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

export function getFolderCardBreadCrumbs(folderName: string) {
	return getFolderCard(folderName).find('[data-test-id="folder-card-breadcrumbs"]');
}

export function getFolderCardBreadCrumbsEllipsis(folderName: string) {
	return getFolderCardBreadCrumbs(folderName).find('[data-test-id="ellipsis"]');
}

export function getFolderCardHomeProjectBreadcrumb(folderName: string) {
	return getFolderCardBreadCrumbs(folderName).find('[data-test-id="folder-card-home-project"]');
}

export function getFolderCardCurrentBreadcrumb(folderName: string) {
	return getFolderCardBreadCrumbs(folderName).find('[data-test-id="breadcrumbs-item-current"]');
}

export function getOpenHiddenItemsTooltip() {
	return cy.getByTestId('hidden-items-tooltip').filter(':visible');
}

export function getListActionsToggle() {
	return cy.getByTestId('folder-breadcrumbs-actions');
}

export function getListActionItem(name: string) {
	return cy
		.getByTestId('folder-breadcrumbs-actions')
		.find('span[aria-controls]')
		.invoke('attr', 'aria-controls')
		.then((popperId) => {
			return cy.get(`#${popperId}`).find(`[data-test-id="action-${name}"]`);
		});
}

export function getFolderCardActionToggle(folderName: string) {
	return getFolderCard(folderName).find('[data-test-id="folder-card-actions"]');
}

export function getFolderCardActionItem(folderName: string, actionName: string) {
	return getFolderCard(folderName)
		.findChildByTestId('folder-card-actions')
		.filter(':visible')
		.find('span[aria-controls]')
		.invoke('attr', 'aria-controls')
		.then((popperId) => {
			return cy.get(`#${popperId}`).find(`[data-test-id="action-${actionName}"]`);
		});
}

export function getFolderDeleteModal() {
	return cy.getByTestId('deleteFolder-modal');
}

export function getDeleteRadioButton() {
	return cy.getByTestId('delete-content-radio');
}

export function getTransferContentRadioButton() {
	return cy.getByTestId('transfer-content-radio');
}

export function getConfirmDeleteInput() {
	return getFolderDeleteModal().findChildByTestId('delete-data-input').find('input');
}

export function getDeleteFolderModalConfirmButton() {
	return getFolderDeleteModal().findChildByTestId('confirm-delete-folder-button');
}

export function getProjectEmptyState() {
	return cy.getByTestId('list-empty-state');
}

export function getFolderEmptyState() {
	return cy.getByTestId('empty-folder-container');
}

export function getProjectMenuItem(name: string) {
	if (name.toLowerCase() === 'personal') {
		return getPersonalProjectMenuItem();
	}
	return cy.getByTestId('project-menu-item').contains(name);
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
	getAddResourceDropdown().click();
	cy.getByTestId('action-folder').click();
	createNewFolder(folderName);
}

export function createFolderFromListDropdown(folderName: string) {
	getListActionsToggle().click();
	getListActionItem('create').click();
	createNewFolder(folderName);
}

export function createFolderFromCardActions(parentName: string, folderName: string) {
	getFolderCardActionToggle(parentName).click();
	getFolderCardActionItem(parentName, 'create').click();
	createNewFolder(folderName);
}

export function renameFolderFromListActions(folderName: string, newName: string) {
	getFolderCard(folderName).click();
	getListActionsToggle().click();
	getListActionItem('rename').click();
	renameFolder(newName);
}

export function renameFolderFromCardActions(folderName: string, newName: string) {
	getFolderCardActionToggle(folderName).click();
	getFolderCardActionItem(folderName, 'rename').click();
	renameFolder(newName);
}

export function deleteEmptyFolderFromCardDropdown(folderName: string) {
	cy.intercept('DELETE', '/rest/projects/**').as('deleteFolder');
	getFolderCard(folderName).click();
	getListActionsToggle().click();
	getListActionItem('delete').click();
	cy.wait('@deleteFolder');
	successToast().should('contain.text', 'Folder deleted');
}

export function deleteEmptyFolderFromListDropdown(folderName: string) {
	cy.intercept('DELETE', '/rest/projects/**').as('deleteFolder');
	getFolderCard(folderName).click();
	getListActionsToggle().click();
	getListActionItem('delete').click();
	cy.wait('@deleteFolder');
	successToast().should('contain.text', 'Folder deleted');
}

export function deleteFolderWithContentsFromListDropdown(folderName: string) {
	getListActionsToggle().click();
	getListActionItem('delete').click();
	confirmFolderDelete(folderName);
}

export function deleteFolderWithContentsFromCardDropdown(folderName: string) {
	getFolderCardActionToggle(folderName).click();
	getFolderCardActionItem(folderName, 'delete').click();
	confirmFolderDelete(folderName);
}

export function deleteAndTransferFolderContentsFromCardDropdown(
	folderName: string,
	destinationName: string,
) {
	getFolderCardActionToggle(folderName).click();
	getFolderCardActionItem(folderName, 'delete').click();
	deleteFolderAndMoveContents(folderName, destinationName);
}

export function deleteAndTransferFolderContentsFromListDropdown(destinationName: string) {
	getListActionsToggle().click();
	getListActionItem('delete').click();
	getCurrentBreadcrumb()
		.find('span')
		.invoke('text')
		.then((currentFolderName) => {
			deleteFolderAndMoveContents(currentFolderName, destinationName);
		});
}

export function createNewProject(projectName: string, options: { openAfterCreate?: boolean } = {}) {
	cy.getByTestId('universal-add').should('exist').click();
	cy.getByTestId('navigation-menu-item').contains('Project').click();
	cy.getByTestId('project-settings-name-input').type(projectName, { delay: 50 });
	cy.getByTestId('project-settings-save-button').click();
	successToast().should('exist');
	if (options.openAfterCreate) {
		getProjectMenuItem(projectName).click();
	}
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
			cy.get('input.el-input__inner').type(name, { delay: 50 });
			cy.get('button.btn--confirm').click();
		});
	cy.wait('@createFolder');
	successToast().should('exist');
}

function renameFolder(newName: string) {
	cy.intercept('PATCH', '/rest/projects/**').as('renameFolder');
	cy.get('[role=dialog]')
		.filter(':visible')
		.within(() => {
			cy.get('input.el-input__inner').type('{selectall}');
			cy.get('input.el-input__inner').type(newName, { delay: 50 });
			cy.get('button.btn--confirm').click();
		});
	cy.wait('@renameFolder');
	successToast().should('exist');
}

function confirmFolderDelete(folderName: string) {
	cy.intercept('DELETE', '/rest/projects/**').as('deleteFolder');
	getFolderDeleteModal().should('be.visible');
	getDeleteRadioButton().click();
	getConfirmDeleteInput().should('be.visible');
	getConfirmDeleteInput().type(`delete ${folderName}`, { delay: 50 });
	getDeleteFolderModalConfirmButton().should('be.enabled').click();
	cy.wait('@deleteFolder');
	successToast().contains('Folder deleted').should('exist');
}

function deleteFolderAndMoveContents(folderName: string, destinationName: string) {
	cy.intercept('DELETE', '/rest/projects/**').as('deleteFolder');
	getFolderDeleteModal().should('be.visible');
	getFolderDeleteModal().find('h1').first().contains(`Delete "${folderName}"`);
	getTransferContentRadioButton().should('be.visible').click();
	cy.getByTestId('move-to-folder-dropdown').click();
	cy.getByTestId('move-to-folder-dropdown').find('input').type(destinationName);
	cy.getByTestId('move-to-folder-option').contains(destinationName).click();
	getDeleteFolderModalConfirmButton().should('be.enabled').click();
	cy.wait('@deleteFolder');
	successToast().should('contain.text', `Data transferred to "${destinationName}"`);
}
