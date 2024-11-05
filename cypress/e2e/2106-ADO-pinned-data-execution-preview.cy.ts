import { WorkflowExecutionsTab, WorkflowPage as WorkflowPageClass } from '../pages';

const workflowPage = new WorkflowPageClass();
const executionsTab = new WorkflowExecutionsTab();

describe('ADO-2106 connections should be colored correctly for pinned data in executions preview', () => {
	beforeEach(() => {
		workflowPage.actions.visit();
	});

	beforeEach(() => {
		cy.createFixtureWorkflow('Webhook_set_pinned.json');
		workflowPage.actions.deselectAll();
		workflowPage.getters.zoomToFitButton().click();

		workflowPage.getters.getConnectionBetweenNodes('Webhook', 'Set').should('have.class', 'pinned');
	});

	it('should color connections for pinned data nodes for manual executions', () => {
		workflowPage.actions.executeWorkflow();

		executionsTab.actions.switchToExecutionsTab();

		executionsTab.getters.successfulExecutionListItems().should('have.length', 1);

		executionsTab.getters
			.workflowExecutionPreviewIframe()
			.should('be.visible')
			.its('0.contentDocument.body')
			.should('not.be.empty')

			.then(cy.wrap)
			.find('.jtk-connector[data-source-node="Webhook"][data-target-node="Set"]')
			.should('have.class', 'success')
			.should('have.class', 'has-run')
			.should('have.class', 'pinned');
	});
});
