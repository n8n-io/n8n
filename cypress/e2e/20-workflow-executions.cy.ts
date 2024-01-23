import { WorkflowPage } from '../pages';
import { WorkflowExecutionsTab } from '../pages/workflow-executions-tab';
import type { RouteHandler } from 'cypress/types/net-stubbing';

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
		cy.intercept('GET', '/rest/executions/active?filter=*').as('getActiveExecutions');

		executionsTab.actions.switchToExecutionsTab();

		cy.wait(['@getExecutions', '@getActiveExecutions']);

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
