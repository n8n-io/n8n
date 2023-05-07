import { WorkflowPage, NDV, CredentialsModal } from '../pages';

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const credentialsModal = new CredentialsModal();

const NO_CREDENTIALS_MESSAGE = 'Please add your credential';
const INVALID_CREDENTIALS_MESSAGE = 'Please check your credential';

describe('Resource Locator', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
	});

	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should render both RLC components in google sheets', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true);
		ndv.getters.resourceLocator('documentId').should('be.visible');
		ndv.getters.resourceLocator('sheetName').should('be.visible');
	});

	it('should show appropriate error when credentials are not set', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true);
		ndv.getters.resourceLocator('documentId').should('be.visible');
		ndv.getters.resourceLocatorInput('documentId').click();
		ndv.getters.resourceLocatorErrorMessage().should('contain', NO_CREDENTIALS_MESSAGE);
	});

	it('should show appropriate error when credentials are not valid', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true);
		workflowPage.getters.nodeCredentialsSelect().click();
		// Add oAuth credentials
		workflowPage.getters.nodeCredentialsSelect().find('li').last().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		credentialsModal.actions.fillCredentialsForm();
		cy.get('.el-message-box').find('button').contains('Close').click();
		ndv.getters.resourceLocatorInput('documentId').click();
		ndv.getters.resourceLocatorErrorMessage().should('contain', INVALID_CREDENTIALS_MESSAGE);
	});

	it('should reset resource locator when dependent field is changed', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true);
		ndv.actions.setRLCValue('documentId', '123');
		ndv.actions.setRLCValue('sheetName', '123');
		ndv.actions.setRLCValue('documentId', '321');
		ndv.getters.resourceLocatorInput('sheetName').should('have.value', '');
	});
});
