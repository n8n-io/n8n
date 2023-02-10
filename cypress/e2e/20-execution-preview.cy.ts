import { WorkflowPage } from "../pages";
import { WorkflowExecutionsTab } from "../pages/workflow-executions-tab";

const workflowPage = new WorkflowPage();
const executionsTab = new WorkflowExecutionsTab();

// Test suite for executions tab
describe('Current Workflow Executions', () => {
	before(() => {
		cy.resetAll();
		cy.skipSetup();
		workflowPage.actions.visit();
		cy.waitForLoad();
		cy.createFixtureWorkflow('Test_workflow_4_executions_view.json', `My test workflow`);
		executionsTab.actions.prepareExecutions();
	});

	it('should render executions tab correctly', () => {
		cy.waitForLoad();
		executionsTab.getters.executionListItems().should('have.length', 11);
		executionsTab.getters.successfulExecutionListItems().should('have.length', 9);
		executionsTab.getters.failedExecutionListItems().should('have.length', 2);
		executionsTab.getters.executionListItems().first().invoke('attr','class').should('match', /_active_/);
	});

});
