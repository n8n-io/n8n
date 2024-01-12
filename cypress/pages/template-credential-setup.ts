import { CredentialsModal, MessageBox } from './modals';
import * as formStep from '../composables/setup-template-form-step';
import { overrideFeatureFlag } from '../composables/featureFlags';

export type TemplateTestData = {
	id: number;
	fixture: string;
};

export const testData = {
	simpleTemplate: {
		id: 1205,
		fixture: 'Test_Template_1.json',
	},
	templateWithoutCredentials: {
		id: 1344,
		fixture: 'Test_Template_2.json',
	},
};

const credentialsModal = new CredentialsModal();
const messageBox = new MessageBox();

export const getters = {
	continueButton: () => cy.getByTestId('continue-button'),
	skipLink: () => cy.get('a:contains("Skip")'),
	title: (title: string) => cy.get(`h1:contains(${title})`),
	infoCallout: () => cy.getByTestId('info-callout'),
};

export const enableTemplateCredentialSetupFeatureFlag = () => {
	overrideFeatureFlag('017_template_credential_setup_v2', true);
};

export const visitTemplateCredentialSetupPage = (templateId: number) => {
	cy.visit(`templates/${templateId}/setup`);
	enableTemplateCredentialSetupFeatureFlag();

	formStep.getFormStep().eq(0).should('be.visible');
};

/**
 * Fills in dummy credentials for the given app name.
 */
export const fillInDummyCredentialsForApp = (appName: string) => {
	formStep.getCreateAppCredentialsButton(appName).click();
	credentialsModal.getters.editCredentialModal().find('input:first()').type('test');
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
