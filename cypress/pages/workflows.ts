import { BasePage } from "./base";

export class WorkflowsPage extends BasePage {
	url = '/workflows';
	getters = {
		newWorkflowButtonCard: () => cy.getByTestId('new-workflow-card'),
		newWorkflowTemplateCard: () => cy.getByTestId('new-workflow-template-card'),
		searchBar: () => cy.getByTestId('resources-list-search'),
		createWorkflowButton: () => cy.getByTestId('resources-list-add'),
		workflowCards: () => cy.getByTestId('resources-list-item'),
		workflowCard: (workflowName: string) => this.getters.workflowCards()
			.contains(workflowName)
			.parents('[data-test-id="resources-list-item"]'),
		workflowTags: (workflowName: string) => this.getters.workflowCard(workflowName)
			.findChildByTestId('workflow-card-tags'),
		workflowActivator: (workflowName: string) => this.getters.workflowCard(workflowName)
			.findChildByTestId('workflow-card-activator'),
		workflowActivatorStatus: (workflowName: string) => this.getters.workflowActivator(workflowName)
			.findChildByTestId('workflow-activator-status'),
		workflowCardActions: (workflowName: string) => this.getters.workflowCard(workflowName)
			.findChildByTestId('workflow-card-actions'),
		workflowDeleteButton: () => cy.getByTestId('action-toggle-dropdown').filter(':visible').contains('Delete')
		// Not yet implemented
		// myWorkflows: () => cy.getByTestId('my-workflows'),
		// allWorkflows: () => cy.getByTestId('all-workflows'),
	};

	actions = {
		createWorkflowFromCard: () => {
			this.getters.newWorkflowButtonCard().click();
		},
	}
}
