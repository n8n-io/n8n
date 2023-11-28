import { BasePage } from './base';

export type TemplateTestData = {
	id: number;
	fixture: string;
};

export class TemplateCredentialSetupPage extends BasePage {
	testData = {
		simpleTemplate: {
			id: 1205,
			fixture: 'Test_Template_1.json',
		},
	};

	getters = {
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

	actions = {
		visit: (templateId: number) => {
			cy.visit(`/templates/${templateId}/setup`);
		},
		enableFeatureFlag: () => {
			cy.window().then((window) => {
				window.localStorage.setItem('template-credentials-setup', 'true');
			});
		},
	};
}
