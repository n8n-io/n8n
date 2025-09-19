import { BasePage } from './../base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class MfaSetupModal extends BasePage {
	getters = {
		modalContainer: () => cy.getByTestId('changePassword-modal').last(),
		tokenInput: () => cy.getByTestId('mfa-token-input'),
		copySecretToClipboardButton: () => cy.getByTestId('mfa-secret-button'),
		downloadRecoveryCodesButton: () => cy.getByTestId('mfa-recovery-codes-button'),
		saveButton: () => cy.getByTestId('mfa-save-button'),
	};
}
