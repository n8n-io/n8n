import { INSTANCE_MEMBERS, INSTANCE_OWNER, INSTANCE_ADMIN } from '../constants';
import { MainSidebar, SettingsSidebar, SettingsUsersPage, WorkflowPage } from '../pages';
import { PersonalSettingsPage } from '../pages/settings-personal';
import { getVisibleSelect } from '../utils';

/**
 * User A - Instance owner
 * User B - User, owns C1, W1, W2
 * User C - User, owns C2
 *
 * W1 - Workflow owned by User B, shared with User C
 * W2 - Workflow owned by User B
 *
 * C1 - Credential owned by User B
 * C2 - Credential owned by User C, shared with User A and User B
 */

const updatedPersonalData = {
	newFirstName: 'Something',
	newLastName: 'Else',
	newEmail: 'something_else@acme.corp',
	newPassword: 'Keybo4rd',
	invalidPasswords: ['abc', 'longEnough', 'longenough123'],
};

const usersSettingsPage = new SettingsUsersPage();
const workflowPage = new WorkflowPage();
const personalSettingsPage = new PersonalSettingsPage();
const settingsSidebar = new SettingsSidebar();
const mainSidebar = new MainSidebar();

describe('User Management', { disableAutoLogin: true }, () => {
	before(() => {
		cy.enableFeature('sharing');
	});

	it.only('should login and logout', () => {
		cy.visit('/');
		cy.get('input[name="email"]').type(INSTANCE_OWNER.email);
		cy.get('input[name="password"]').type(INSTANCE_OWNER.password);
		cy.getByTestId('form-submit-button').click();
		mainSidebar.getters.logo().should('be.visible');
		mainSidebar.actions.goToSettings();
		settingsSidebar.getters.users().should('be.visible');

		mainSidebar.actions.closeSettings();
		mainSidebar.actions.openUserMenu();
		cy.getByTestId('user-menu-item-logout').click();

		cy.get('input[name="email"]').type(INSTANCE_MEMBERS[0].email);
		cy.get('input[name="password"]').type(INSTANCE_MEMBERS[0].password);
		cy.getByTestId('form-submit-button').click();
		mainSidebar.getters.logo().should('be.visible');
		mainSidebar.actions.goToSettings();
		cy.getByTestId('menu-item').filter('#settings-users').should('not.exist');
	});

	it('should prevent non-owners to access UM settings', () => {
		usersSettingsPage.actions.loginAndVisit(
			INSTANCE_MEMBERS[0].email,
			INSTANCE_MEMBERS[0].password,
			false,
		);
	});

	it('should allow instance owner to access UM settings', () => {
		usersSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password, true);
	});

	it('should properly render UM settings page for instance owners', () => {
		usersSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password, true);
		// All items in user list should be there
		usersSettingsPage.getters.userListItems().should('have.length', 4);
		// List item for current user should have the `Owner` badge
		usersSettingsPage.getters
			.userItem(INSTANCE_OWNER.email)
			.find('.n8n-badge:contains("Owner")')
			.should('exist');
		// Other users list items should contain action pop-up list
		usersSettingsPage.getters.userActionsToggle(INSTANCE_MEMBERS[0].email).should('exist');
		usersSettingsPage.getters.userActionsToggle(INSTANCE_MEMBERS[1].email).should('exist');
		usersSettingsPage.getters.userActionsToggle(INSTANCE_ADMIN.email).should('exist');
	});

	it('should be able to change user role to Admin and back', () => {
		cy.enableFeature('advancedPermissions');

		usersSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password, true);

		// Change role from Member to Admin
		usersSettingsPage.getters
			.userRoleSelect(INSTANCE_MEMBERS[0].email)
			.find('input')
			.should('contain.value', 'Member');
		usersSettingsPage.getters.userRoleSelect(INSTANCE_MEMBERS[0].email).click();
		getVisibleSelect().find('li').contains('Admin').click();
		usersSettingsPage.getters
			.userRoleSelect(INSTANCE_MEMBERS[0].email)
			.find('input')
			.should('contain.value', 'Admin');

		usersSettingsPage.actions.loginAndVisit(
			INSTANCE_MEMBERS[0].email,
			INSTANCE_MEMBERS[0].password,
			true,
		);

		// Change role from Admin to Member, then back to Admin
		usersSettingsPage.getters
			.userRoleSelect(INSTANCE_ADMIN.email)
			.find('input')
			.should('contain.value', 'Admin');

		usersSettingsPage.getters.userRoleSelect(INSTANCE_ADMIN.email).click();
		getVisibleSelect().find('li').contains('Member').click();
		usersSettingsPage.getters
			.userRoleSelect(INSTANCE_ADMIN.email)
			.find('input')
			.should('contain.value', 'Member');

		usersSettingsPage.actions.loginAndVisit(INSTANCE_ADMIN.email, INSTANCE_ADMIN.password, false);
		usersSettingsPage.actions.loginAndVisit(
			INSTANCE_MEMBERS[0].email,
			INSTANCE_MEMBERS[0].password,
			true,
		);

		usersSettingsPage.getters.userRoleSelect(INSTANCE_ADMIN.email).click();
		getVisibleSelect().find('li').contains('Admin').click();
		usersSettingsPage.getters
			.userRoleSelect(INSTANCE_ADMIN.email)
			.find('input')
			.should('contain.value', 'Admin');

		usersSettingsPage.actions.loginAndVisit(INSTANCE_ADMIN.email, INSTANCE_ADMIN.password, true);
		usersSettingsPage.getters.userRoleSelect(INSTANCE_MEMBERS[0].email).click();
		getVisibleSelect().find('li').contains('Member').click();
		usersSettingsPage.getters
			.userRoleSelect(INSTANCE_MEMBERS[0].email)
			.find('input')
			.should('contain.value', 'Member');

		cy.disableFeature('advancedPermissions');
	});

	it('should be able to change theme', () => {
		personalSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password);

		personalSettingsPage.actions.changeTheme('Dark');
		cy.get('body').should('have.attr', 'data-theme', 'dark');
		settingsSidebar.actions.back();
		mainSidebar.getters
			.logo()
			.should('have.attr', 'src')
			.then((src) => {
				expect(src).to.include('/static/logo/channel/dev-dark.svg');
			});

		cy.visit(personalSettingsPage.url);
		personalSettingsPage.actions.changeTheme('Light');
		cy.get('body').should('have.attr', 'data-theme', 'light');
		settingsSidebar.actions.back();
		mainSidebar.getters
			.logo()
			.should('have.attr', 'src')
			.then((src) => {
				expect(src).to.include('/static/logo/channel/dev.svg');
			});
	});

	it('should delete user and their data', () => {
		usersSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password, true);
		usersSettingsPage.actions.opedDeleteDialog(INSTANCE_MEMBERS[0].email);
		usersSettingsPage.getters.deleteDataRadioButton().click();
		usersSettingsPage.getters.deleteDataInput().type('delete all data');
		usersSettingsPage.getters.deleteUserButton().click();
		workflowPage.getters.successToast().should('contain', 'User deleted');
	});

	it('should delete user and transfer their data', () => {
		usersSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password, true);
		usersSettingsPage.actions.opedDeleteDialog(INSTANCE_MEMBERS[1].email);
		usersSettingsPage.getters.transferDataRadioButton().click();
		usersSettingsPage.getters.userSelectDropDown().click();
		usersSettingsPage.getters.userSelectOptions().first().click();
		usersSettingsPage.getters.deleteUserButton().click();
		workflowPage.getters.successToast().should('contain', 'User deleted');
	});

	it(`should allow user to change their personal data`, () => {
		personalSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password);
		personalSettingsPage.actions.updateFirstAndLastName(
			updatedPersonalData.newFirstName,
			updatedPersonalData.newLastName,
		);
		personalSettingsPage.getters
			.currentUserName()
			.should('contain', `${updatedPersonalData.newFirstName} ${updatedPersonalData.newLastName}`);
		workflowPage.getters.successToast().should('contain', 'Personal details updated');
	});

	it(`shouldn't allow user to set weak password`, () => {
		personalSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password);
		personalSettingsPage.getters.changePasswordLink().click();
		for (let weakPass of updatedPersonalData.invalidPasswords) {
			personalSettingsPage.actions.tryToSetWeakPassword(INSTANCE_OWNER.password, weakPass);
		}
	});

	it(`shouldn't allow user to change password if old password is wrong`, () => {
		personalSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password);
		personalSettingsPage.getters.changePasswordLink().click();
		personalSettingsPage.actions.updatePassword('iCannotRemember', updatedPersonalData.newPassword);
		workflowPage.getters
			.errorToast()
			.closest('div')
			.should('contain', 'Provided current password is incorrect.');
	});

	it(`should change current user password`, () => {
		personalSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password);
		personalSettingsPage.getters.changePasswordLink().click();
		personalSettingsPage.actions.updatePassword(
			INSTANCE_OWNER.password,
			updatedPersonalData.newPassword,
		);
		workflowPage.getters.successToast().should('contain', 'Password updated');
		personalSettingsPage.actions.loginWithNewData(
			INSTANCE_OWNER.email,
			updatedPersonalData.newPassword,
		);
	});

	it(`shouldn't allow users to set invalid email`, () => {
		personalSettingsPage.actions.loginAndVisit(
			INSTANCE_OWNER.email,
			updatedPersonalData.newPassword,
		);
		// try without @ part
		personalSettingsPage.actions.tryToSetInvalidEmail(updatedPersonalData.newEmail.split('@')[0]);
		// try without domain
		personalSettingsPage.actions.tryToSetInvalidEmail(updatedPersonalData.newEmail.split('.')[0]);
	});

	it(`should change user email`, () => {
		personalSettingsPage.actions.loginAndVisit(
			INSTANCE_OWNER.email,
			updatedPersonalData.newPassword,
		);
		personalSettingsPage.actions.updateEmail(updatedPersonalData.newEmail);
		workflowPage.getters.successToast().should('contain', 'Personal details updated');
		personalSettingsPage.actions.loginWithNewData(
			updatedPersonalData.newEmail,
			updatedPersonalData.newPassword,
		);
	});
});
