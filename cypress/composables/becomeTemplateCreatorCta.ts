//#region Getters

export const getBecomeTemplateCreatorCta = () => cy.getByTestId('become-template-creator-cta');

export const getCloseBecomeTemplateCreatorCtaButton = () =>
	cy.getByTestId('close-become-template-creator-cta');

//#endregion

//#region Actions

export const interceptCtaRequestWithResponse = (becomeCreator: boolean) => {
	return cy.intercept('GET', '/rest/cta/become-creator', {
		body: becomeCreator,
	});
};

//#endregion
