export const getPublicApiUpgradeCTA = () => cy.getByTestId('public-api-upgrade-cta');

export const visitPublicApiPage = () => {
	cy.visit('/settings/api');
};
