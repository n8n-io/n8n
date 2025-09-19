import { BasePage } from './base';
import { MainSidebar } from './sidebar/main-sidebar';
import { SettingsSidebar } from './sidebar/settings-sidebar';
import { WorkflowPage } from './workflow';
import { WorkflowsPage } from './workflows';
import { expandSidebar } from '../composables/sidebar';

const workflowPage = new WorkflowPage();
const workflowsPage = new WorkflowsPage();
const mainSidebar = new MainSidebar();
const settingsSidebar = new SettingsSidebar();

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class SettingsUsersPage extends BasePage {
	url = '/settings/users';

	getters = {
		setUpOwnerButton: () => cy.getByTestId('action-box').find('button').first(),
		inviteButton: () => cy.getByTestId('settings-users-invite-button').last(),
		inviteUsersModal: () => cy.getByTestId('inviteUser-modal').last(),
		inviteUsersModalEmailsInput: () => cy.getByTestId('emails').find('input').first(),
		userListItems: () => cy.get('[data-test-id="settings-users-table"] tbody tr'),
		userItem: (email: string) => this.getters.userListItems().contains(email).closest('tr'),
		userActionsToggle: (email: string) =>
			this.getters.userItem(email).find('[data-test-id="action-toggle"]'),
		userRoleSelect: (email: string) =>
			this.getters.userItem(email).find('[data-test-id="user-role-dropdown"]'),
		deleteUserAction: () =>
			cy.getByTestId('action-toggle-dropdown').find('li:contains("Delete"):visible'),
		confirmDeleteModal: () => cy.getByTestId('deleteUser-modal').last(),
		transferDataRadioButton: () =>
			this.getters.confirmDeleteModal().find('.el-radio .el-radio__input').first(),
		deleteDataRadioButton: () =>
			this.getters.confirmDeleteModal().find('.el-radio .el-radio__input').last(),
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
			expandSidebar();
			mainSidebar.actions.goToSettings();
			if (isOwner) {
				settingsSidebar.getters.users().click();
				cy.url().should('match', new RegExp(this.url));
			} else {
				settingsSidebar.getters.users().should('not.exist');
				// Should be redirected to workflows page if trying to access UM url
				cy.visit('/settings/users');
				cy.url().should('match', new RegExp(workflowsPage.url));
			}
		},
		opedDeleteDialog: (email: string) => {
			this.getters.userActionsToggle(email).should('be.visible').click();
			this.getters.deleteUserAction().click();
			this.getters.confirmDeleteModal().should('be.visible');
		},
	};
}
