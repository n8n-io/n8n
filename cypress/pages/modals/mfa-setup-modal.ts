import { BasePage } from './../base';

export class MfaSetupModal extends BasePage {
	getters = {
		modalContainer: () => cy.getByTestId('changePassword-modal').last(),
		tokenInput: () => cy.getByTestId('mfa-token-input').find('input').first(),
		copySecretToClipboardButton: () => cy.getByTestId('mfa-secret-button'),
		secretInput: () => cy.getByTestId('mfa-secret-input'),
		downloadRecoveryCodesButton: () => cy.getByTestId('mfa-recovery-codes-button'),
		saveButton: () => cy.getByTestId('mfa-save-button'),
	};
}
