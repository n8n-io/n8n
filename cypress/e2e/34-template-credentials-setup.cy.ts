import {
	clickUseWorkflowButtonByTitle,
	visitTemplateCollectionPage,
	testData,
} from '../pages/template-collection';
import * as templateCredentialsSetupPage from '../pages/template-credential-setup';
import { TemplateWorkflowPage } from '../pages/template-workflow';
import { WorkflowPage } from '../pages/workflow';
import * as formStep from '../composables/setup-template-form-step';
import { getSetupWorkflowCredentialsButton } from '../composables/setup-workflow-credentials-button';
import * as setupCredsModal from '../composables/modals/workflow-credential-setup-modal';

const templateWorkflowPage = new TemplateWorkflowPage();
const workflowPage = new WorkflowPage();

const testTemplate = templateCredentialsSetupPage.testData.simpleTemplate;

// NodeView uses beforeunload listener that will show a browser
// native popup, which will block cypress from continuing / exiting.
// This prevent the registration of the listener.
Cypress.on('window:before:load', (win) => {
	const origAddEventListener = win.addEventListener;
	win.addEventListener = (eventName: string, listener: any, opts: any) => {
		if (eventName === 'beforeunload') {
			return;
		}

		return origAddEventListener.call(win, eventName, listener, opts);
	};
});

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
			.title(`Set up 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('can be opened from template collection page', () => {
		visitTemplateCollectionPage(testData.ecommerceStarterPack);
		templateCredentialsSetupPage.enableTemplateCredentialSetupFeatureFlag();
		clickUseWorkflowButtonByTitle('Promote new Shopify products on Twitter and Telegram');

		templateCredentialsSetupPage.getters
			.title(`Set up 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('can be opened with a direct url', () => {
		templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);

		templateCredentialsSetupPage.getters
			.title(`Set up 'Promote new Shopify products on Twitter and Telegram' template`)
			.should('be.visible');
	});

	it('has all the elements on page', () => {
		templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);

		templateCredentialsSetupPage.getters
			.title(`Set up 'Promote new Shopify products on Twitter and Telegram' template`)
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

		formStep.getFormStep().each(($el, index) => {
			formStep.getStepHeading($el).should('have.text', expectedAppNames[index]);
			formStep.getStepDescription($el).should('have.text', expectedAppDescriptions[index]);
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

		templateCredentialsSetupPage.finishCredentialSetup();

		workflowPage.getters.canvasNodes().should('have.length', 3);

		// Focus the canvas so the copy to clipboard works
		workflowPage.getters.canvasNodes().eq(0).realClick();
		workflowPage.actions.selectAll();
		workflowPage.actions.hitCopy();

		cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');
		// Check workflow JSON by copying it to clipboard
		cy.readClipboard().then((workflowJSON) => {
			const workflow = JSON.parse(workflowJSON);

			expect(workflow.meta).to.haveOwnProperty('templateId', testTemplate.id.toString());
			workflow.nodes.forEach((node: any) => {
				expect(Object.keys(node.credentials ?? {})).to.have.lengthOf(1);
			});
		});
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

		formStep.getFormStep().each(($el, index) => {
			formStep.getStepHeading($el).should('have.text', expectedAppNames[index]);
			formStep.getStepDescription($el).should('have.text', expectedAppDescriptions[index]);
		});

		templateCredentialsSetupPage.getters.continueButton().should('be.disabled');

		templateCredentialsSetupPage.fillInDummyCredentialsForApp('Email (IMAP)');
		templateCredentialsSetupPage.fillInDummyCredentialsForApp('Nextcloud');

		templateCredentialsSetupPage.finishCredentialSetup();

		workflowPage.getters.canvasNodes().should('have.length', 3);
	});

	describe('Credential setup from workflow editor', () => {
		beforeEach(() => {
			cy.resetDatabase();
			cy.signinAsOwner();
		});

		it('should allow credential setup from workflow editor if user skips it during template setup', () => {
			templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);
			templateCredentialsSetupPage.getters.skipLink().click();

			getSetupWorkflowCredentialsButton().should('be.visible');
		});

		it('should allow credential setup from workflow editor if user fills in credentials partially during template setup', () => {
			templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);
			templateCredentialsSetupPage.fillInDummyCredentialsForApp('Shopify');

			templateCredentialsSetupPage.finishCredentialSetup();

			getSetupWorkflowCredentialsButton().should('be.visible');
		});

		it('should fill credentials from workflow editor', () => {
			templateCredentialsSetupPage.visitTemplateCredentialSetupPage(testTemplate.id);
			templateCredentialsSetupPage.getters.skipLink().click();

			getSetupWorkflowCredentialsButton().click();
			setupCredsModal.getWorkflowCredentialsModal().should('be.visible');

			templateCredentialsSetupPage.fillInDummyCredentialsForApp('Shopify');
			templateCredentialsSetupPage.fillInDummyCredentialsForAppWithConfirm('X (Formerly Twitter)');
			templateCredentialsSetupPage.fillInDummyCredentialsForApp('Telegram');

			setupCredsModal.closeModalFromContinueButton();
			setupCredsModal.getWorkflowCredentialsModal().should('not.exist');

			// Focus the canvas so the copy to clipboard works
			workflowPage.getters.canvasNodes().eq(0).realClick();
			workflowPage.actions.selectAll();
			workflowPage.actions.hitCopy();

			cy.grantBrowserPermissions('clipboardReadWrite', 'clipboardSanitizedWrite');
			// Check workflow JSON by copying it to clipboard
			cy.readClipboard().then((workflowJSON) => {
				const workflow = JSON.parse(workflowJSON);

				workflow.nodes.forEach((node: any) => {
					expect(Object.keys(node.credentials ?? {})).to.have.lengthOf(1);
				});
			});

			getSetupWorkflowCredentialsButton().should('not.exist');
		});
	});
});
