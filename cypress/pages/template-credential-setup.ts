import { CredentialsModal, MessageBox } from './modals';
import * as formStep from '../composables/setup-template-form-step';

const credentialsModal = new CredentialsModal();
const messageBox = new MessageBox();

export const getters = {
	continueButton: () => cy.getByTestId('continue-button'),
	skipLink: () => cy.get('a:contains("Skip")'),
	title: (title: string) => cy.get(`h1:contains(${title})`),
	infoCallout: () => cy.getByTestId('info-callout'),

	namePreview: () =>
		cy.getByTestId('credential-name').find('span[data-test-id=inline-edit-preview]'),
	nameInput: () => cy.getByTestId('credential-name').find('input'),
};

export const visitTemplateCredentialSetupPage = (templateId: number) => {
	cy.visit(`templates/${templateId}/setup`);

	formStep.getFormStep().eq(0).should('be.visible');
};

/**
 * Fills in dummy credentials for the given app name.
 */
export const fillInDummyCredentialsForApp = (appName: string) => {
	formStep.getCreateAppCredentialsButton(appName).click();
	credentialsModal.getters.namePreview().click();
	credentialsModal.getters.nameInput().type('test');
	credentialsModal.actions.save(false);
	credentialsModal.actions.close();
};

/**
 * Fills in dummy credentials for the given app name. Assumes
 * that a confirmation message box will be shown, which will be
 * handled.
 */
export const fillInDummyCredentialsForAppWithConfirm = (appName: string) => {
	fillInDummyCredentialsForApp(appName);
	messageBox.actions.cancel();
};

/**
 * Finishes the credential setup by clicking the continue button.
 */
export const finishCredentialSetup = () => {
	cy.intercept('POST', '/rest/workflows').as('createWorkflow');
	getters.continueButton().should('be.enabled');
	getters.continueButton().click();
	cy.wait('@createWorkflow');
};
