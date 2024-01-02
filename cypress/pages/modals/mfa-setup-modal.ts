import { BasePage } from './../base';

export class MfaSetupModal extends BasePage {
	getters = {
		modalContainer: () => cy.getByTestId('changePassword-modal').last(),
		tokenInput: () => cy.getByTestId('mfa-token-input'),
		copySecretToClipboardButton: () => cy.getByTestId('mfa-secret-button'),
		downloadRecoveryCodesButton: () => cy.getByTestId('mfa-recovery-codes-button'),
		saveButton: () => cy.getByTestId('mfa-save-button'),
	};
}
