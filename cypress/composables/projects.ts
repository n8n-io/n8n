import { CredentialsModal, WorkflowPage } from '../pages';
import { getVisibleSelect } from '../utils';

const workflowPage = new WorkflowPage();
const credentialsModal = new CredentialsModal();

export const getHomeButton = () => cy.getByTestId('project-home-menu-item');
export const getPersonalProjectsButton = () => cy.getByTestId('project-personal-menu-item');
export const getMenuItems = () => cy.getByTestId('project-menu-item');
export const getAddProjectButton = () => {
	cy.getByTestId('universal-add').should('be.visible').click();
	cy.getByTestId('universal-add')
		.find('.el-sub-menu__title')
		.as('menuitem')
		.should('have.attr', 'aria-describedby');

	cy.get('@menuitem')
		.invoke('attr', 'aria-describedby')
		.then((el) => cy.get(`[id="${el}"]`))
		.as('submenu');

	cy.get('@submenu').within((submenu) =>
		cy
			.wrap(submenu)
			.getByTestId('navigation-menu-item')
			.should('be.visible')
			.filter(':contains("Project")')
			.as('button'),
	);

	return cy.get('@button');
};
export const getAddFirstProjectButton = () => cy.getByTestId('add-first-project-button');
export const getIconPickerButton = () => cy.getByTestId('icon-picker-button');
export const getIconPickerTab = (tab: string) => cy.getByTestId('icon-picker-tabs').contains(tab);
export const getIconPickerIcons = () => cy.getByTestId('icon-picker-icon');
export const getIconPickerEmojis = () => cy.getByTestId('icon-picker-emoji');
// export const getAddProjectButton = () =>
// 	cy.getByTestId('universal-add').should('contain', 'Add project').should('be.visible');
export const getProjectTabs = () => cy.getByTestId('project-tabs').find('a');
export const getProjectTabWorkflows = () => getProjectTabs().filter('a[href$="/workflows"]');
export const getProjectTabCredentials = () => getProjectTabs().filter('a[href$="/credentials"]');
export const getProjectTabExecutions = () => getProjectTabs().filter('a[href$="/executions"]');
export const getProjectTabSettings = () => getProjectTabs().filter('a[href$="/settings"]');
export const getProjectSettingsNameInput = () =>
	cy.getByTestId('project-settings-name-input').find('input');
export const getProjectSettingsSaveButton = () => cy.getByTestId('project-settings-save-button');
export const getProjectSettingsCancelButton = () =>
	cy.getByTestId('project-settings-cancel-button');
export const getProjectSettingsDeleteButton = () =>
	cy.getByTestId('project-settings-delete-button');
export const getProjectMembersSelect = () => cy.getByTestId('project-members-select');
export const addProjectMember = (email: string, role?: string) => {
	getProjectMembersSelect().click();
	getProjectMembersSelect().get('.el-select-dropdown__item').contains(email.toLowerCase()).click();

	if (role) {
		cy.getByTestId(`user-list-item-${email}`)
			.find('[data-test-id="projects-settings-user-role-select"]')
			.click();
		getVisibleSelect().find('li').contains(role).click();
	}
};
export const getResourceMoveModal = () => cy.getByTestId('project-move-resource-modal');
export const getProjectMoveSelect = () => cy.getByTestId('project-move-resource-modal-select');
export const getProjectSharingSelect = () => cy.getByTestId('project-sharing-select');
export const getMoveToFolderSelect = () => cy.getByTestId('move-to-folder-dropdown');

export function createProject(name: string) {
	getAddProjectButton().click();

	getProjectSettingsNameInput().should('be.visible').clear().type(name);
	getProjectSettingsSaveButton().click();
}

export function createWorkflow(fixtureKey: string, name: string) {
	workflowPage.getters.workflowImportInput().selectFile(`fixtures/${fixtureKey}`, { force: true });
	workflowPage.actions.setWorkflowName(name);
	workflowPage.getters.saveButton().should('contain', 'Saved');
	workflowPage.actions.zoomToFit();
}

export function createCredential(name: string, closeModal = true) {
	credentialsModal.getters.newCredentialModal().should('be.visible');
	credentialsModal.getters.newCredentialTypeSelect().should('be.visible');
	credentialsModal.getters.newCredentialTypeOption('Notion API').click();
	credentialsModal.getters.newCredentialTypeButton().click();
	credentialsModal.getters.connectionParameter('Internal Integration Secret').type('1234567890');
	credentialsModal.actions.setName(name);
	credentialsModal.actions.save();

	if (closeModal) {
		credentialsModal.actions.close();
	}
}
