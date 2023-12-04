import { CredentialsModal, MessageBox } from '../pages/modals';
import {
	clickUseWorkflowButtonByTitle,
	visitTemplateCollectionPage,
	testData,
} from '../pages/template-collection';
import { TemplateCredentialSetupPage } from '../pages/template-credential-setup';
import { TemplateWorkflowPage } from '../pages/template-workflow';
import { WorkflowPage } from '../pages/workflow';

const templateWorkflowPage = new TemplateWorkflowPage();
const templateCredentialsSetupPage = new TemplateCredentialSetupPage();
const credentialsModal = new CredentialsModal();
const messageBox = new MessageBox();
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
		templateCredentialsSetupPage.actions.enableFeatureFlag();
		templateWorkflowPage.actions.clickUseThisWorkflowButton();

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('can be opened from template collection page', () => {
		visitTemplateCollectionPage(testData.ecommerceStarterPack);
		templateCredentialsSetupPage.actions.enableFeatureFlag();
		clickUseWorkflowButtonByTitle('Promote new Shopify products on Twitter and Telegram');

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('can be opened with a direct url', () => {
		templateCredentialsSetupPage.actions.visit(testTemplate.id);

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('has all the elements on page', () => {
		templateCredentialsSetupPage.actions.visit(testTemplate.id);

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
		templateCredentialsSetupPage.actions.visit(testTemplate.id);

		templateCredentialsSetupPage.getters.skipLink().click();
		workflowPage.getters.canvasNodes().should('have.length', 3);
	});

	it('can create credentials and workflow from the template', () => {
		templateCredentialsSetupPage.actions.visit(testTemplate.id);

		templateCredentialsSetupPage.getters.continueButton().should('be.enabled');

		templateCredentialsSetupPage.getters.createAppCredentialsButton('Shopify').click();
		credentialsModal.getters.editCredentialModal().find('input:first()').type('test');
		credentialsModal.actions.save(false);
		credentialsModal.actions.close();

		templateCredentialsSetupPage.getters.createAppCredentialsButton('X (Formerly Twitter)').click();
		credentialsModal.getters.editCredentialModal().find('input:first()').type('test');
		credentialsModal.actions.save(false);
		credentialsModal.actions.close();
		messageBox.actions.cancel();

		templateCredentialsSetupPage.getters.createAppCredentialsButton('Telegram').click();
		credentialsModal.getters.editCredentialModal().find('input:first()').type('test');
		credentialsModal.actions.save(false);
		credentialsModal.actions.close();

		cy.intercept('POST', '/rest/workflows').as('createWorkflow');
		templateCredentialsSetupPage.getters.continueButton().should('be.enabled');
		templateCredentialsSetupPage.getters.continueButton().click();
		cy.wait('@createWorkflow');

		workflowPage.getters.canvasNodes().should('have.length', 3);
	});
});
