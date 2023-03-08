import { SettingsSidebar } from './sidebar/settings-sidebar';
import { MainSidebar } from './sidebar/main-sidebar';
import { WorkflowPage } from './workflow';
import { BasePage } from './base';

const workflowPage =  new WorkflowPage();
const mainSidebar = new MainSidebar();
const settingsSidebar = new SettingsSidebar();

export class SettingsUsersPage extends BasePage {
	url = '/settings/users';
	getters = {
		setUpOwnerButton: () => cy.getByTestId('action-box').find('button').first(),
		inviteButton: () => cy.getByTestId('settings-users-invite-button').last(),
		inviteUsersModal: () => cy.getByTestId('inviteUser-modal').last(),
		inviteUsersModalEmailsInput: () => cy.getByTestId('emails').find('input').first(),
		userListItems: () => cy.get('[data-test-id^="user-list-item"]'),
		userItem: (email: string) => cy.getByTestId(`user-list-item-${email.toLowerCase()}`),
		userActionsToggle: (email: string) => this.getters.userItem(email).find('[data-test-id="action-toggle"]'),
		deleteUserAction: () => cy.getByTestId('action-toggle-dropdown').find('li:contains("Delete"):visible'),
		confirmDeleteModal: () => cy.getByTestId('deleteUser-modal').last(),
		transferDataRadioButton: () => this.getters.confirmDeleteModal().find('[role="radio"]').first(),
		deleteDataRadioButton: () => this.getters.confirmDeleteModal().find('[role="radio"]').last(),
		userSelectDropDown: () => this.getters.confirmDeleteModal().find('.n8n-select'),
		userSelectOptions: () => cy.get('.el-select-dropdown:visible .el-select-dropdown__item'),
		deleteUserButton: () => this.getters.confirmDeleteModal().find('button:contains("Delete")'),
		deleteDataInput: () => cy.getByTestId('delete-data-input').find('input').first(),
	};
	actions = {
		goToOwnerSetup: () => this.getters.setUpOwnerButton().click(),
		loginAndVisit: (email: string, password: string, isOwner: boolean) => {
			cy.signin({ email, password });
			workflowPage.actions.visit();
			mainSidebar.actions.goToSettings();
			if (isOwner) {
				settingsSidebar.getters.menuItem('Users').click();
				cy.url().should('match', new RegExp(this.url));
			} else {
				settingsSidebar.getters.menuItem('Users').should('not.exist');
				// Should be redirected to workflows page if trying to access UM url
				cy.visit('/settings/users');
				cy.url().should('match', new RegExp(workflowPage.url));
			}
		},
		opedDeleteDialog: (email: string) => {
			this.getters.userActionsToggle(email).click();
			this.getters.deleteUserAction().realClick();
			this.getters.confirmDeleteModal().should('be.visible');
		},
	};
}
