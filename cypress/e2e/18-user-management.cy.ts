import { MainSidebar } from './../pages/sidebar/main-sidebar';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { SettingsSidebar, SettingsUsersPage, WorkflowPage, WorkflowsPage } from '../pages';
import { PersonalSettingsPage } from '../pages/settings-personal';

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

const instanceOwner = {
	email: `${DEFAULT_USER_EMAIL}A`,
	password: DEFAULT_USER_PASSWORD,
	firstName: 'User',
	lastName: 'A',
};

const users = [
	{
		email: `${DEFAULT_USER_EMAIL}B`,
		password: DEFAULT_USER_PASSWORD,
		firstName: 'User',
		lastName: 'B',
	},
	{
		email: `${DEFAULT_USER_EMAIL}C`,
		password: DEFAULT_USER_PASSWORD,
		firstName: 'User',
		lastName: 'C',
	},
];

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

describe('User Management', () => {
	before(() => {
		cy.setupOwner(instanceOwner);
	});

	beforeEach(() => {
		cy.on('uncaught:exception', (err, runnable) => {
			expect(err.message).to.include('Not logged in');
			return false;
		});
	});

	it(`should invite User B and User C to instance`, () => {
		cy.inviteUsers({ instanceOwner, users });
	});

	it('should prevent non-owners to access UM settings', () => {
		usersSettingsPage.actions.loginAndVisit(users[0].email, users[0].password, false);
	});

	it('should allow instance owner to access UM settings', () => {
		usersSettingsPage.actions.loginAndVisit(instanceOwner.email, instanceOwner.password, true);
	});

	it('should properly render UM settings page for instance owners', () => {
		usersSettingsPage.actions.loginAndVisit(instanceOwner.email, instanceOwner.password, true);
		// All items in user list should be there
		usersSettingsPage.getters.userListItems().should('have.length', 3);
		// List item for current user should have the `Owner` badge
		usersSettingsPage.getters
			.userItem(instanceOwner.email)
			.find('.n8n-badge:contains("Owner")')
			.should('exist');
		// Other users list items should contain action pop-up list
		usersSettingsPage.getters.userActionsToggle(users[0].email).should('exist');
		usersSettingsPage.getters.userActionsToggle(users[1].email).should('exist');
	});

	it('should delete user and their data', () => {
		usersSettingsPage.actions.loginAndVisit(instanceOwner.email, instanceOwner.password, true);
		usersSettingsPage.actions.opedDeleteDialog(users[0].email);
		usersSettingsPage.getters.deleteDataRadioButton().realClick();
		usersSettingsPage.getters.deleteDataInput().type('delete all data');
		usersSettingsPage.getters.deleteUserButton().realClick();
		workflowPage.getters.successToast().should('contain', 'User deleted');
	});

	it('should delete user and transfer their data', () => {
		usersSettingsPage.actions.loginAndVisit(instanceOwner.email, instanceOwner.password, true);
		usersSettingsPage.actions.opedDeleteDialog(users[1].email);
		usersSettingsPage.getters.transferDataRadioButton().realClick();
		usersSettingsPage.getters.userSelectDropDown().realClick();
		usersSettingsPage.getters.userSelectOptions().first().realClick();
		usersSettingsPage.getters.deleteUserButton().realClick();
		workflowPage.getters.successToast().should('contain', 'User deleted');
	});

	it(`should allow user to change their personal data`, () => {
		personalSettingsPage.actions.loginAndVisit(instanceOwner.email, instanceOwner.password);
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
		personalSettingsPage.actions.loginAndVisit(instanceOwner.email, instanceOwner.password);
		for (let weakPass of updatedPersonalData.invalidPasswords) {
			personalSettingsPage.actions.tryToSetWeakPassword(instanceOwner.password, weakPass);
		}
	});

	it(`shouldn't allow user to change password if old password is wrong`, () => {
		personalSettingsPage.actions.loginAndVisit(instanceOwner.email, instanceOwner.password);
		personalSettingsPage.actions.updatePassword('iCannotRemember', updatedPersonalData.newPassword);
		workflowPage.getters
			.errorToast()
			.closest('div')
			.should('contain', 'Provided current password is incorrect.');
	});

	it(`should change current user password`, () => {
		personalSettingsPage.actions.loginAndVisit(instanceOwner.email, instanceOwner.password);
		personalSettingsPage.actions.updatePassword(
			instanceOwner.password,
			updatedPersonalData.newPassword,
		);
		workflowPage.getters.successToast().should('contain', 'Password updated');
		personalSettingsPage.actions.loginWithNewData(
			instanceOwner.email,
			updatedPersonalData.newPassword,
		);
	});

	it(`shouldn't allow users to set invalid email`, () => {
		personalSettingsPage.actions.loginAndVisit(
			instanceOwner.email,
			updatedPersonalData.newPassword,
		);
		// try without @ part
		personalSettingsPage.actions.tryToSetInvalidEmail(updatedPersonalData.newEmail.split('@')[0]);
		// try without domain
		personalSettingsPage.actions.tryToSetInvalidEmail(updatedPersonalData.newEmail.split('.')[0]);
	});

	it(`should change user email`, () => {
		personalSettingsPage.actions.loginAndVisit(
			instanceOwner.email,
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
