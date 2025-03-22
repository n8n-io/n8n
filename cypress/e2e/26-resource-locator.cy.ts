import { WorkflowPage, NDV, CredentialsModal } from '../pages';
import { getVisiblePopper } from '../utils';

const workflowPage = new WorkflowPage();
const ndv = new NDV();
const credentialsModal = new CredentialsModal();

const NO_CREDENTIALS_MESSAGE = 'Add your credential';
const INVALID_CREDENTIALS_MESSAGE = 'Check your credential';
const MODE_SELECTOR_LIST = 'From list';

describe('Resource Locator', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	it('should render both RLC components in google sheets', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true, 'Update row in sheet');
		ndv.getters.resourceLocator('documentId').should('be.visible');
		ndv.getters.resourceLocator('sheetName').should('be.visible');
		ndv.getters
			.resourceLocatorModeSelector('documentId')
			.find('input')
			.should('have.value', MODE_SELECTOR_LIST);
		ndv.getters
			.resourceLocatorModeSelector('sheetName')
			.find('input')
			.should('have.value', MODE_SELECTOR_LIST);
	});

	it('should show appropriate error when credentials are not set', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true, 'Update row in sheet');
		ndv.getters.resourceLocator('documentId').should('be.visible');
		ndv.getters.resourceLocatorInput('documentId').click();
		ndv.getters.resourceLocatorErrorMessage().should('contain', NO_CREDENTIALS_MESSAGE);
	});

	it('should show create credentials modal when clicking "add your credential"', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true, 'Update row in sheet');
		ndv.getters.resourceLocator('documentId').should('be.visible');
		ndv.getters.resourceLocatorInput('documentId').click();
		ndv.getters.resourceLocatorErrorMessage().should('contain', NO_CREDENTIALS_MESSAGE);
		ndv.getters.resourceLocatorAddCredentials().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
	});

	it('should show appropriate error when credentials are not valid', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true, 'Update row in sheet');

		// Add oAuth credentials
		workflowPage.getters.nodeCredentialsSelect().click();
		workflowPage.getters.nodeCredentialsCreateOption().click();
		credentialsModal.getters.credentialsEditModal().should('be.visible');
		credentialsModal.getters.credentialAuthTypeRadioButtons().should('have.length', 2);
		credentialsModal.getters.credentialAuthTypeRadioButtons().first().click();
		credentialsModal.actions.fillCredentialsForm();
		cy.get('.el-message-box').find('button').contains('Close').click();

		ndv.getters.resourceLocatorInput('documentId').click();
		ndv.getters.resourceLocatorErrorMessage().should('contain', INVALID_CREDENTIALS_MESSAGE);
	});

	it('should show appropriate errors when search filter is required', () => {
		workflowPage.actions.addNodeToCanvas('Github', true, true, 'On pull request');
		ndv.getters.resourceLocator('owner').should('be.visible');
		ndv.getters.resourceLocatorInput('owner').click();
		ndv.getters.resourceLocatorErrorMessage().should('contain', NO_CREDENTIALS_MESSAGE);
	});

	it('should reset resource locator when dependent field is changed', () => {
		workflowPage.actions.addInitialNodeToCanvas('Manual');
		workflowPage.actions.addNodeToCanvas('Google Sheets', true, true, 'Update row in sheet');
		ndv.actions.setRLCValue('documentId', '123');
		ndv.actions.setRLCValue('sheetName', '123');
		ndv.actions.setRLCValue('documentId', '321');
		ndv.getters.resourceLocatorInput('sheetName').should('have.value', '');
	});

	// unlike RMC and remote options, RLC does not support loadOptionDependsOn
	it('should retrieve list options when other params throw errors', () => {
		workflowPage.actions.addInitialNodeToCanvas('E2e Test', { action: 'Resource Locator' });

		ndv.getters.resourceLocatorInput('rlc').click();

		cy.getByTestId('rlc-item').should('exist');
		getVisiblePopper()
			.should('have.length', 1)
			.findChildByTestId('rlc-item')
			.should('have.length', 5);

		ndv.actions.setInvalidExpression({ fieldName: 'fieldId' });

		ndv.getters.inputPanel().click(); // remove focus from input, hide expression preview

		ndv.getters.resourceLocatorInput('rlc').click();

		cy.getByTestId('rlc-item').should('exist');
		getVisiblePopper()
			.should('have.length', 1)
			.findChildByTestId('rlc-item')
			.should('have.length', 5);
	});
});
