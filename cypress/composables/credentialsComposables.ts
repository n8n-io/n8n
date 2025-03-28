export const verifyCredentialsListPageIsLoaded = () => {
	cy.get('[data-test-id="resources-list-wrapper"], [data-test-id="empty-resources-list"]').should(
		'be.visible',
	);
};

export const navigateToCredentialsPageAndWaitForLoad = (credentialsPageUrl: string) => {
	cy.visit(credentialsPageUrl);
	verifyCredentialsListPageIsLoaded();
};
