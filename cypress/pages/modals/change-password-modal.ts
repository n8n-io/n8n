import { BasePage } from './../base';

export class ChangePasswordModal extends BasePage {
	getters = {
		modalContainer: () => cy.getByTestId('changePassword-modal').last(),
		currentPasswordInput: () => cy.getByTestId('currentPassword').find('input').first(),
		newPasswordInputContainer: () => cy.getByTestId('password'),
		newPasswordInput: () => cy.getByTestId('password').find('input').first(),
		repeatPasswordInput: () => cy.getByTestId('password2').find('input').first(),
		changePasswordButton: () => cy.getByTestId('change-password-button'),
	};
}
