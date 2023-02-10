import { ChangePasswordModal } from './modals/change-password-modal';
import { BasePage } from './base';

const changePasswordModal = new ChangePasswordModal();

export class PersonalSettingsPage extends BasePage {
	url = '/settings/personal';
	getters = {
		currentUserName: () => cy.getByTestId('current-user-name'),
		firstNameInput: () => cy.getByTestId('firstName').find('input').first(),
		lastNameInput: () => cy.getByTestId('lastName').find('input').first(),
		emailInputContainer: () => cy.getByTestId('email'),
		emailInput: () => cy.getByTestId('email').find('input').first(),
		changePasswordLink: () => cy.getByTestId('change-password-link').find('a').first(),
		saveSettingsButton: () => cy.getByTestId('save-settings-button'),
	};
	actions = {
		loginAndVisit: (email: string, password: string) => {
			cy.signin({ email, password });
			cy.visit(this.url);
		},
		updateFirstAndLastName: (newFirstName: string, newLastName: string) => {
			this.getters.firstNameInput().type('{selectall}').type(newFirstName);
			this.getters.lastNameInput().type('{selectall}').type(newLastName);
			this.getters.saveSettingsButton().realClick();
		},
		updatePassword: (oldPassword: string, newPassword: string) => {
			this.getters.changePasswordLink().realClick();
			changePasswordModal.getters.modalContainer().should('be.visible');
			changePasswordModal.getters.currentPasswordInput().type('{selectall}').type(oldPassword);
			changePasswordModal.getters.newPasswordInput().type('{selectall}').type(newPassword);
			changePasswordModal.getters.repeatPasswordInput().type('{selectall}').type(newPassword);
			changePasswordModal.getters.changePasswordButton().click();
		},
		tryToSetWeakPassword: (oldPassword: string, newPassword: string) => {
			this.actions.updatePassword(oldPassword, newPassword);
			changePasswordModal.getters.newPasswordInputContainer().find('div[class^="_errorInput"]').should('exist');
		},
		updateEmail: (newEmail: string) => {
			this.getters.emailInput().type('{selectall}').type(newEmail).type('{enter}');
		},
		tryToSetInvalidEmail: (newEmail: string) => {
			this.actions.updateEmail(newEmail);
			this.getters.emailInputContainer().find('div[class^="_errorInput"]').should('exist');
		},
		loginWithNewData: (email: string, password: string) => {
			cy.signout();
			this.actions.loginAndVisit(email, password);
			cy.url().should('match', new RegExp(this.url));
		},
	};
}
