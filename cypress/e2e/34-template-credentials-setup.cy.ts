import {
	clickUseWorkflowButtonByTitle,
	visitTemplateCollectionPage,
	testData,
} from '../pages/template-collection';
import * as templateCredentialsSetupPage from '../pages/template-credential-setup';
import { TemplateWorkflowPage } from '../pages/template-workflow';
import { WorkflowPage } from '../pages/workflow';

const templateWorkflowPage = new TemplateWorkflowPage();
const workflowPage = new WorkflowPage();

const testTemplate = templateCredentialsSetupPage.testData.simpleTemplate;

describe('Template credentials setup', () => {
	beforeEach(() => {
		cy.intercept('GET', `https://api.n8n.io/api/templates/workflows/${testTemplate.id}`, {
			fixture: testTemplate.fixture,
		});
	});

	it('can be opened from template workflow page', () => {
		templateWorkflowPage.actions.visit(testTemplate.id);
		templateWorkflowPage.getters.useTemplateButton().should('be.visible');
		templateCredentialsSetupPage.enableTemplateCredentialSetupFeatureFlag();
		templateWorkflowPage.actions.clickUseThisWorkflowButton();

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('can be opened from template collection page', () => {
		visitTemplateCollectionPage(testData.ecommerceStarterPack);
		templateCredentialsSetupPage.enableTemplateCredentialSetupFeatureFlag();
		clickUseWorkflowButtonByTitle('Promote new Shopify products on Twitter and Telegram');

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('can be opened with a direct url', () => {
		templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('has all the elements on page', () => {
		templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');

		templateCredentialsSetupPage.getters
			.infoCallout()
			.should(
				'contain.text',
				'You need 1x Shopify, 1x X (Formerly Twitter) and 1x Telegram account to setup this template',
			);

		const expectedAppNames = ['1. Shopify', '2. X (Formerly Twitter)', '3. Telegram'];
		const expectedAppDescriptions = [
			'The credential you select will be used in the product created node of the workflow template.',
			'The credential you select will be used in the Twitter node of the workflow template.',
			'The credential you select will be used in the Telegram node of the workflow template.',
		];

		templateCredentialsSetupPage.getters.appCredentialSteps().each(($el, index) => {
			templateCredentialsSetupPage.getters
				.stepHeading($el)
				.should('have.text', expectedAppNames[index]);
			templateCredentialsSetupPage.getters
				.stepDescription($el)
				.should('have.text', expectedAppDescriptions[index]);
		});
	});

	it('can skip template creation', () => {
		templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);

		templateCredentialsSetupPage.getters.skipLink().click();
		workflowPage.getters.canvasNodes().should('have.length', 3);
	});

	it('can create credentials and workflow from the template', () => {
		templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);

		// Continue button should be disabled if no credentials are created
		templateCredentialsSetupPage.getters.continueButton().should('be.disabled');

		templateCredentialsSetupPage.fillInDummyCredentialsForApp('Shopify');

		// Continue button should be enabled if at least one has been created
		templateCredentialsSetupPage.getters.continueButton().should('be.enabled');

		templateCredentialsSetupPage.fillInDummyCredentialsForAppWithConfirm('X (Formerly Twitter)');
		templateCredentialsSetupPage.fillInDummyCredentialsForApp('Telegram');

		cy.intercept('POST', '/rest/workflows').as('createWorkflow');
		templateCredentialsSetupPage.getters.continueButton().should('be.enabled');
		templateCredentialsSetupPage.getters.continueButton().click();
		cy.wait('@createWorkflow');

		workflowPage.getters.canvasNodes().should('have.length', 3);
	});

	it('should work with a template that has no credentials (ADO-1603)', () => {
		const templateWithoutCreds = templateCredentialsSetupPage.testData.templateWithoutCredentials;
		cy.intercept('GET', `https://api.n8n.io/api/templates/workflows/${templateWithoutCreds.id}`, {
			fixture: templateWithoutCreds.fixture,
		});
		templateCredentialsSetupPage.visitTemplateCredentialSetupPage(templateWithoutCreds.id);

		const expectedAppNames = ['1. Email (IMAP)', '2. Nextcloud'];
		const expectedAppDescriptions = [
			'The credential you select will be used in the IMAP Email node of the workflow template.',
			'The credential you select will be used in the Nextcloud node of the workflow template.',
		];

		templateCredentialsSetupPage.getters.appCredentialSteps().each(($el, index) => {
			templateCredentialsSetupPage.getters
				.stepHeading($el)
				.should('have.text', expectedAppNames[index]);
			templateCredentialsSetupPage.getters
				.stepDescription($el)
				.should('have.text', expectedAppDescriptions[index]);
		});

		templateCredentialsSetupPage.getters.continueButton().should('be.disabled');

		templateCredentialsSetupPage.fillInDummyCredentialsForApp('Email (IMAP)');
		templateCredentialsSetupPage.fillInDummyCredentialsForApp('Nextcloud');

		cy.intercept('POST', '/rest/workflows').as('createWorkflow');
		templateCredentialsSetupPage.getters.continueButton().should('be.enabled');
		templateCredentialsSetupPage.getters.continueButton().click();
		cy.wait('@createWorkflow');

		workflowPage.getters.canvasNodes().should('have.length', 3);
	});
});
