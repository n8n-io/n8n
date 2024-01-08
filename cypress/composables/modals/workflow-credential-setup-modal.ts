/**
 * Getters
 */

export const getWorkflowCredentialsModal = () => cy.getByTestId('setup-workflow-credentials-modal');

/**
 * Actions
 */

export const closeModal = () =>
	getWorkflowCredentialsModal().find("button[aria-label='Close this dialog']").click();
