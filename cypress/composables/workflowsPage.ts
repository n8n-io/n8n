/**
 * Getters
 */

export function getWorkflowsPageUrl() {
	return '/home/workflows';
}

export const getCreateWorkflowButton = () => cy.getByTestId('add-resource-workflow');

/**
 * Actions
 */

export function visitWorkflowsPage() {
	cy.visit(getWorkflowsPageUrl());
}
