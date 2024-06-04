import { WorkflowPage } from '../pages';
import { WorkflowExecutionsTab } from '../pages/workflow-executions-tab';
import type { RouteHandler } from 'cypress/types/net-stubbing';
import executionOutOfMemoryServerResponse from '../fixtures/responses/execution-out-of-memory-server-response.json';

const workflowPage = new WorkflowPage();
const executionsTab = new WorkflowExecutionsTab();
const executionsRefreshInterval = 4000;

// Test suite for executions tab
describe('Current Workflow Executions', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
		cy.createFixtureWorkflow('Test_workflow_4_executions_view.json', `My test workflow`);
	});

	it('should render executions tab correctly', () => {
		createMockExecutions();
		cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');

		executionsTab.actions.switchToExecutionsTab();

		cy.wait(['@getExecutions']);

		executionsTab.getters.executionsList().scrollTo(0, 500).wait(0);

		executionsTab.getters.executionListItems().should('have.length', 11);
		executionsTab.getters.successfulExecutionListItems().should('have.length', 9);
		executionsTab.getters.failedExecutionListItems().should('have.length', 2);
		executionsTab.getters
			.executionListItems()
			.first()
			.invoke('attr', 'class')
			.should('match', /_active_/);
	});

	it('should not redirect back to execution tab when request is not done before leaving the page', () => {
		cy.intercept('GET', '/rest/executions?filter=*');
		cy.intercept('GET', '/rest/executions/active?filter=*');

		executionsTab.actions.switchToExecutionsTab();
		executionsTab.actions.switchToEditorTab();
		cy.wait(executionsRefreshInterval);
		cy.url().should('not.include', '/executions');
		executionsTab.actions.switchToExecutionsTab();
		executionsTab.actions.switchToEditorTab();
		executionsTab.actions.switchToExecutionsTab();
		executionsTab.actions.switchToEditorTab();
		executionsTab.actions.switchToExecutionsTab();
		executionsTab.actions.switchToEditorTab();
		cy.wait(executionsRefreshInterval);
		cy.url().should('not.include', '/executions');
		executionsTab.actions.switchToExecutionsTab();
		cy.wait(1000);
		executionsTab.actions.switchToEditorTab();
		cy.wait(executionsRefreshInterval);
		cy.url().should('not.include', '/executions');
	});

	it('should not redirect back to execution tab when slow request is not done before leaving the page', () => {
		const throttleResponse: RouteHandler = (req) => {
			return new Promise((resolve) => {
				setTimeout(() => resolve(req.continue()), 2000);
			});
		};

		cy.intercept('GET', '/rest/executions?filter=*', throttleResponse);
		cy.intercept('GET', '/rest/executions/active?filter=*', throttleResponse);

		executionsTab.actions.switchToExecutionsTab();
		executionsTab.actions.switchToEditorTab();
		cy.wait(executionsRefreshInterval);
		cy.url().should('not.include', '/executions');
	});

	it('should error toast when server error message returned without stack trace', () => {
		executionsTab.actions.createManualExecutions(1);
		const message = 'Workflow did not finish, possible out-of-memory issue';
		cy.intercept('GET', '/rest/executions/*', {
			statusCode: 200,
			body: executionOutOfMemoryServerResponse,
		}).as('getExecution');

		executionsTab.actions.switchToExecutionsTab();
		cy.wait(['@getExecution']);

		cy.getByTestId('workflow-preview-iframe')
			.should('be.visible')
			.its('0.contentDocument.body') // Access the body of the iframe document
			.should('not.be.empty') // Ensure the body is not empty
			.then(cy.wrap)
			.find('.el-notification:has(.el-notification--error)')
			.should('be.visible')
			.filter(`:contains("${message}")`)
			.should('be.visible');
	});

	it('should auto load more items if there is space and auto scroll', () => {
		cy.viewport(1280, 960);
		executionsTab.actions.createManualExecutions(24);

		cy.intercept('GET', '/rest/executions?filter=*').as('getExecutions');
		cy.intercept('GET', '/rest/executions/*').as('getExecution');
		executionsTab.actions.switchToExecutionsTab();

		cy.wait(['@getExecutions']);
		executionsTab.getters.executionListItems().its('length').should('be.gte', 10);

		cy.getByTestId('current-executions-list').scrollTo('bottom');
		cy.wait(['@getExecutions']);
		executionsTab.getters.executionListItems().should('have.length', 24);

		executionsTab.getters.executionListItems().eq(14).click();
		cy.wait(['@getExecution']);
		cy.reload();

		cy.wait(['@getExecutions']);
		executionsTab.getters.executionListItems().eq(14).should('not.be.visible');
		executionsTab.getters.executionListItems().should('have.length', 24);
		executionsTab.getters.executionListItems().first().should('not.be.visible');
		cy.getByTestId('current-executions-list').scrollTo(0, 0);
		executionsTab.getters.executionListItems().first().should('be.visible');
		executionsTab.getters.executionListItems().eq(14).should('not.be.visible');

		executionsTab.actions.switchToEditorTab();
		executionsTab.actions.switchToExecutionsTab();

		cy.wait(['@getExecutions']);
		executionsTab.getters.executionListItems().eq(14).should('not.be.visible');
		executionsTab.getters.executionListItems().should('have.length', 24);
		executionsTab.getters.executionListItems().first().should('not.be.visible');
		cy.getByTestId('current-executions-list').scrollTo(0, 0);
		executionsTab.getters.executionListItems().first().should('be.visible');
		executionsTab.getters.executionListItems().eq(14).should('not.be.visible');
	});

	it('should show workflow data in executions tab after hard reload', () => {
		executionsTab.actions.switchToExecutionsTab();
		checkMainHeaderELements();

		cy.reload();
		checkMainHeaderELements();

		executionsTab.actions.switchToEditorTab();
		checkMainHeaderELements();
	});
});

const createMockExecutions = () => {
	executionsTab.actions.createManualExecutions(5);
	// Make some failed executions by enabling Code node with syntax error
	executionsTab.actions.toggleNodeEnabled('Error');
	executionsTab.actions.createManualExecutions(2);
	// Then add some more successful ones
	executionsTab.actions.toggleNodeEnabled('Error');
	executionsTab.actions.createManualExecutions(4);
};

const checkMainHeaderELements = () => {
	workflowPage.getters.workflowNameInputContainer().should('be.visible');
	workflowPage.getters.workflowTagsContainer().should('be.visible');
	workflowPage.getters.workflowMenu().should('be.visible');
	workflowPage.getters.saveButton().should('be.visible');
};
