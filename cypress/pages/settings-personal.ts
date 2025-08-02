import generateOTPToken from 'cypress-otp';

import { BasePage } from './base';
import { ChangePasswordModal } from './modals/change-password-modal';
import { MfaSetupModal } from './modals/mfa-setup-modal';

const changePasswordModal = new ChangePasswordModal();
const mfaSetupModal = new MfaSetupModal();

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class PersonalSettingsPage extends BasePage {
	url = '/settings/personal';

	secret = '';

	getters = {
		currentUserName: () => cy.getByTestId('current-user-name'),
		firstNameInput: () => cy.getByTestId('firstName').find('input').first(),
		lastNameInput: () => cy.getByTestId('lastName').find('input').first(),
		emailInputContainer: () => cy.getByTestId('email'),
		emailInput: () => cy.getByTestId('email').find('input').first(),
		changePasswordLink: () => cy.getByTestId('change-password-link').first(),
		saveSettingsButton: () => cy.getByTestId('save-settings-button'),
		enableMfaButton: () => cy.getByTestId('enable-mfa-button'),
		disableMfaButton: () => cy.getByTestId('disable-mfa-button'),
		mfaCodeOrMfaRecoveryCodeInput: () => cy.getByTestId('mfa-code-or-recovery-code-input'),
		mfaSaveButton: () => cy.getByTestId('mfa-save-button'),
		themeSelector: () => cy.getByTestId('theme-select'),
		selectOptionsVisible: () => cy.get('.el-select-dropdown:visible .el-select-dropdown__item'),
	};

	actions = {
		changeTheme: (theme: 'System default' | 'Dark' | 'Light') => {
			this.getters.themeSelector().click();
			this.getters.selectOptionsVisible().should('have.length', 3);
			this.getters.selectOptionsVisible().contains(theme).click();
			this.getters.saveSettingsButton().realClick();
		},
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
			changePasswordModal.getters.modalContainer().should('be.visible');
			changePasswordModal.getters.currentPasswordInput().type('{selectall}').type(oldPassword);
			changePasswordModal.getters.newPasswordInput().type('{selectall}').type(newPassword);
			changePasswordModal.getters.repeatPasswordInput().type('{selectall}').type(newPassword);
			changePasswordModal.getters.changePasswordButton().click();
		},
		tryToSetWeakPassword: (oldPassword: string, newPassword: string) => {
			this.actions.updatePassword(oldPassword, newPassword);
			changePasswordModal.getters
				.newPasswordInputContainer()
				.find('div[class^="_errorInput"]')
				.should('exist');
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
		enableMfa: () => {
			cy.visit(this.url);
			this.getters.enableMfaButton().click();
			cy.wait('@getMfaQrCode');
			mfaSetupModal.getters.copySecretToClipboardButton().should('be.visible');
			mfaSetupModal.getters.copySecretToClipboardButton().realClick();
			cy.readClipboard().then((secret) => {
				const token = generateOTPToken(secret);

				mfaSetupModal.getters.tokenInput().type(token);
				mfaSetupModal.getters.downloadRecoveryCodesButton().should('be.visible');
				mfaSetupModal.getters.downloadRecoveryCodesButton().click();
				mfaSetupModal.getters.saveButton().click();
			});
		},
		disableMfa: (mfaCodeOrRecoveryCode: string) => {
			cy.visit(this.url);
			this.getters.disableMfaButton().click();
			this.getters.mfaCodeOrMfaRecoveryCodeInput().type(mfaCodeOrRecoveryCode);
			this.getters.mfaSaveButton().click();
		},
	};
}
