/**
 * Getters
 */

export function getWorkflowsPageUrl() {
	return '/home/workflows';
}

export const getCreateWorkflowButton = () => cy.getByTestId('add-resource-workflow');

export const getNewWorkflowCardButton = () => cy.getByTestId('new-workflow-card');

/**
 * Actions
 */

export function visitWorkflowsPage() {
	cy.visit(getWorkflowsPageUrl());
}
