import { CredentialsModal, MessageBox } from '../pages/modals';
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
	it('can be opened from template workflow page', () => {
		cy.intercept('GET', `https://api.n8n.io/api/templates/workflows/${testTemplate.id}`, {
			fixture: testTemplate.fixture,
		});

		templateWorkflowPage.actions.visit(testTemplate.id);
		templateCredentialsSetupPage.actions.enableFeatureFlag();
		templateWorkflowPage.actions.clickUseThisWorkflowButton();

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('can be opened with a direct url', () => {
		cy.intercept('GET', `https://api.n8n.io/api/templates/workflows/${testTemplate.id}`, {
			fixture: testTemplate.fixture,
		});
		templateCredentialsSetupPage.actions.visit(testTemplate.id);

		templateCredentialsSetupPage.getters
			.title(`Setup 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('can be skip template creation', () => {
		cy.intercept('GET', `https://api.n8n.io/api/templates/workflows/${testTemplate.id}`, {
			fixture: testTemplate.fixture,
		});
		templateCredentialsSetupPage.actions.visit(testTemplate.id);

		templateCredentialsSetupPage.getters.skipLink().click();
		workflowPage.getters.canvasNodes().should('have.length', 3);
	});

	it('can create credentials and workflow from the template', () => {
		cy.intercept('GET', `https://api.n8n.io/api/templates/workflows/${testTemplate.id}`, {
			fixture: testTemplate.fixture,
		});
		templateCredentialsSetupPage.actions.visit(testTemplate.id);

		templateCredentialsSetupPage.getters.continueButton().should('be.disabled');

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
