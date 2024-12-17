/**
 * Getters
 */

export const getFormStep = () => cy.getByTestId('setup-credentials-form-step');

export const getStepHeading = ($el: JQuery<HTMLElement>) =>
	cy.wrap($el).findChildByTestId('credential-step-heading');

export const getStepDescription = ($el: JQuery<HTMLElement>) =>
	cy.wrap($el).findChildByTestId('credential-step-description');

export const getCreateAppCredentialsButton = (appName: string) =>
	cy.get(`button:contains("Create new ${appName} credential")`);
