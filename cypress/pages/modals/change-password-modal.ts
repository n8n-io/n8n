import { BasePage } from './../base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
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
