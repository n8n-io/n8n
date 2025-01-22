/**
 * Getters
 */

export function getWorkflowsPageUrl() {
	return '/home/workflows';
}

/**
 * Actions
 */

export function visitWorkflowsPage() {
	cy.visit(getWorkflowsPageUrl());
}
