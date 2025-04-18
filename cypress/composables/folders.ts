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

export function getWorkflowCardActions(name: string) {
	return getWorkflowCard(name).find('[data-test-id="workflow-card-actions"]');
}

export function getWorkflowCardActionItem(workflowName: string, actionName: string) {
	return getWorkflowCardActions(workflowName)
		.find('span[aria-controls]')
		.invoke('attr', 'aria-controls')
		.then((popperId) => {
			return cy.get(`#${popperId}`).find(`[data-test-id="action-${actionName}"]`);
		});
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

export function getListBreadcrumbItem(name: string) {
	return getListBreadcrumbs().findChildByTestId('breadcrumbs-item').contains(name);
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

export function getMoveFolderModal() {
	return cy.getByTestId('moveFolder-modal');
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

export function getMoveToFolderDropdown() {
	return cy.getByTestId('move-to-folder-dropdown');
}

export function getMoveToFolderOption(name: string) {
	return cy.getByTestId('move-to-folder-option').contains(name);
}

export function getMoveToFolderInput() {
	return getMoveToFolderDropdown().find('input');
}

export function getEmptyFolderDropdownMessage(text: string) {
	return cy.get('.el-select-dropdown__empty').contains(text);
}

export function getMoveFolderConfirmButton() {
	return cy.getByTestId('confirm-move-folder-button');
}

export function getMoveWorkflowModal() {
	return cy.getByTestId('moveFolder-modal');
}

export function getWorkflowCardBreadcrumbs(workflowName: string) {
	return getWorkflowCard(workflowName).find('[data-test-id="workflow-card-breadcrumbs"]');
}

export function getWorkflowCardBreadcrumbsEllipsis(workflowName: string) {
	return getWorkflowCardBreadcrumbs(workflowName).find('[data-test-id="ellipsis"]');
}

export function getNewFolderNameInput() {
	return cy.get('.add-folder-modal').filter(':visible').find('input.el-input__inner');
}

export function getNewFolderModalErrorMessage() {
	return cy.get('.el-message-box__errormsg').filter(':visible');
}

export function getProjectTab(tabId: string) {
	return cy.getByTestId('project-tabs').find(`#${tabId}`);
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

export function createWorkflowFromEmptyState(workflowName?: string) {
	getFolderEmptyState().find('button').contains('Create Workflow').click();
	if (workflowName) {
		cy.getByTestId('workflow-name-input').type(`{selectAll}{backspace}${workflowName}`, {
			delay: 50,
		});
	}
	cy.getByTestId('workflow-save-button').click();
	successToast().should('exist');
}

export function createWorkflowFromProjectHeader(folderName?: string, workflowName?: string) {
	cy.getByTestId('add-resource-workflow').click();
	if (workflowName) {
		cy.getByTestId('workflow-name-input').type(`{selectAll}{backspace}${workflowName}`, {
			delay: 50,
		});
	}
	cy.getByTestId('workflow-save-button').click();
	if (folderName) {
		successToast().should(
			'contain.text',
			`Workflow successfully created in "Personal", within "${folderName}"`,
		);
	}
}

export function createWorkflowFromListDropdown(workflowName?: string) {
	getListActionsToggle().click();
	getListActionItem('create_workflow').click();
	if (workflowName) {
		cy.getByTestId('workflow-name-input').type(`{selectAll}{backspace}${workflowName}`, {
			delay: 50,
		});
	}
	cy.getByTestId('workflow-save-button').click();
	successToast().should('exist');
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

export function moveFolderFromFolderCardActions(folderName: string, destinationName: string) {
	getFolderCardActionToggle(folderName).click();
	getFolderCardActionItem(folderName, 'move').click();
	moveFolder(folderName, destinationName);
}

export function moveFolderFromListActions(folderName: string, destinationName: string) {
	getFolderCard(folderName).click();
	getListActionsToggle().click();
	getListActionItem('move').click();
	moveFolder(folderName, destinationName);
}

export function moveWorkflowToFolder(workflowName: string, folderName: string) {
	getWorkflowCardActions(workflowName).click();
	getWorkflowCardActionItem(workflowName, 'moveToFolder').click();
	getMoveFolderModal().should('be.visible');
	getMoveToFolderDropdown().click();
	getMoveToFolderInput().type(folderName, { delay: 50 });
	getMoveToFolderOption(folderName).should('be.visible').click();
	getMoveFolderConfirmButton().should('be.enabled').click();
}

export function dragAndDropToFolder(sourceName: string, destinationName: string) {
	const draggable = `[data-test-id=draggable]:has([data-resourcename="${sourceName}"])`;
	const droppable = `[data-test-id=draggable]:has([data-resourcename="${destinationName}"])`;
	cy.get(draggable).trigger('mousedown');
	cy.draganddrop(draggable, droppable, { position: 'center' });
}

export function dragAndDropToProjectRoot(sourceName: string) {
	const draggable = `[data-test-id=draggable]:has([data-resourcename="${sourceName}"])`;
	const droppable = '[data-test-id="home-project"]';
	cy.get(draggable).trigger('mousedown');
	cy.draganddrop(draggable, droppable, { position: 'center' });
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
	getMoveToFolderDropdown().click();
	getMoveToFolderInput().type(destinationName);
	getMoveToFolderOption(destinationName).click();
	getDeleteFolderModalConfirmButton().should('be.enabled').click();
	cy.wait('@deleteFolder');
	successToast().should('contain.text', `Data transferred to "${destinationName}"`);
}

function moveFolder(folderName: string, destinationName: string) {
	cy.intercept('PATCH', '/rest/projects/**').as('moveFolder');
	getMoveFolderModal().should('be.visible');
	getMoveFolderModal().find('h1').first().contains(`Move "${folderName}" to another folder`);
	// Try to find current folder in the dropdown
	// This tests that auto-focus worked as expected
	cy.focused().type(folderName, { delay: 50 });
	// Should not be available
	getEmptyFolderDropdownMessage('No folders found').should('exist');
	// Select destination folder
	getMoveToFolderInput().type(`{selectall}{backspace}${destinationName}`, {
		delay: 50,
	});
	getMoveToFolderOption(destinationName).should('be.visible').click();
	getMoveFolderConfirmButton().should('be.enabled').click();
	cy.wait('@moveFolder');
}
