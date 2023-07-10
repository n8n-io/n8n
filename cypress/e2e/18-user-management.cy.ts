import { INSTANCE_MEMBERS, INSTANCE_OWNER } from '../constants';
import { SettingsUsersPage, WorkflowPage } from '../pages';
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

describe('User Management', { disableAutoLogin: true }, () => {
	before(() => cy.enableFeature('sharing'));

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
		usersSettingsPage.getters.userListItems().should('have.length', 3);
		// List item for current user should have the `Owner` badge
		usersSettingsPage.getters
			.userItem(INSTANCE_OWNER.email)
			.find('.n8n-badge:contains("Owner")')
			.should('exist');
		// Other users list items should contain action pop-up list
		usersSettingsPage.getters.userActionsToggle(INSTANCE_MEMBERS[0].email).should('exist');
		usersSettingsPage.getters.userActionsToggle(INSTANCE_MEMBERS[1].email).should('exist');
	});

	it('should delete user and their data', () => {
		usersSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password, true);
		usersSettingsPage.actions.opedDeleteDialog(INSTANCE_MEMBERS[0].email);
		usersSettingsPage.getters.deleteDataRadioButton().realClick();
		usersSettingsPage.getters.deleteDataInput().type('delete all data');
		usersSettingsPage.getters.deleteUserButton().realClick();
		workflowPage.getters.successToast().should('contain', 'User deleted');
	});

	it('should delete user and transfer their data', () => {
		usersSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password, true);
		usersSettingsPage.actions.opedDeleteDialog(INSTANCE_MEMBERS[1].email);
		usersSettingsPage.getters.transferDataRadioButton().realClick();
		usersSettingsPage.getters.userSelectDropDown().realClick();
		usersSettingsPage.getters.userSelectOptions().first().realClick();
		usersSettingsPage.getters.deleteUserButton().realClick();
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
		for (let weakPass of updatedPersonalData.invalidPasswords) {
			personalSettingsPage.actions.tryToSetWeakPassword(INSTANCE_OWNER.password, weakPass);
		}
	});

	it(`shouldn't allow user to change password if old password is wrong`, () => {
		personalSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password);
		personalSettingsPage.actions.updatePassword('iCannotRemember', updatedPersonalData.newPassword);
		workflowPage.getters
			.errorToast()
			.closest('div')
			.should('contain', 'Provided current password is incorrect.');
	});

	it(`should change current user password`, () => {
		personalSettingsPage.actions.loginAndVisit(INSTANCE_OWNER.email, INSTANCE_OWNER.password);
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
