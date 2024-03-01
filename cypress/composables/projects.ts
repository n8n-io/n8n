export const getHomeButton = () => cy.getByTestId('project-home-menu-item');
export const getMenuItems = () => cy.getByTestId('project-menu-item');
export const getAddProjectButton = () => cy.getByTestId('add-project-menu-item');
export const getProjectTabs = () => cy.getByTestId('project-tabs').find('a');
export const getProjectTabWorkflows = () => getProjectTabs().filter('a[href$="/workflows"]');
export const getProjectTabCredentials = () => getProjectTabs().filter('a[href$="/credentials"]');
export const getProjectTabSettings = () => getProjectTabs().filter('a[href$="/settings"]');
export const getProjectSettingsSaveButton = () => cy.getByTestId('project-settings-save-button');
export const getProjectSettingsCancelButton = () =>
	cy.getByTestId('project-settings-cancel-button');
export const getProjectSettingsDeleteButton = () =>
	cy.getByTestId('project-settings-delete-button');
export const getProjectMembersSelect = () => cy.getByTestId('project-members-select');

export const addProjectMember = (email: string) => {
	getProjectMembersSelect().click();
	getProjectMembersSelect().get('.el-select-dropdown__item').contains(email.toLowerCase()).click();
};
