import { CredentialsModal, MessageBox } from './modals';

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
	createAppCredentialsButton: (appName: string) =>
		cy.get(`button:contains("Create new ${appName} credential")`),
	appCredentialSteps: () => cy.getByTestId('setup-credentials-form-step'),
	stepHeading: ($el: JQuery<HTMLElement>) =>
		cy.wrap($el).findChildByTestId('credential-step-heading'),
	stepDescription: ($el: JQuery<HTMLElement>) =>
		cy.wrap($el).findChildByTestId('credential-step-description'),
};

export const visitTemplateCredentialSetupPage = (templateId: number) => {
	cy.visit(`/templates/${templateId}/setup`);
};

export const enableTemplateCredentialSetupFeatureFlag = () => {
	cy.window().then((win) => {
		win.featureFlags.override('016_template_credential_setup', true);
	});
};

/**
 * Fills in dummy credentials for the given app name.
 */
export const fillInDummyCredentialsForApp = (appName: string) => {
	getters.createAppCredentialsButton(appName).click();
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
