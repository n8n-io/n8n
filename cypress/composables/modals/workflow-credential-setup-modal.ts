/**
 * Getters
 */

export const getWorkflowCredentialsModal = () => cy.getByTestId('setup-workflow-credentials-modal');

export const getContinueButton = () => cy.getByTestId('continue-button');

/**
 * Actions
 */

export const closeModalFromContinueButton = () => getContinueButton().click();
