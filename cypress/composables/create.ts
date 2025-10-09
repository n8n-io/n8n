export const universalAddButton = () => cy.getByTestId('universal-add');

export const createResource = (
	resourceType: 'project' | 'workflow' | 'credential',
	projectName: string,
) => {
	universalAddButton().click();
	cy.getByTestId('navigation-submenu')
		.contains(new RegExp(resourceType, 'i'))
		.should('be.visible')
		.click();

	if (resourceType !== 'project') {
		cy.getByTestId('navigation-submenu-item')
			.contains(new RegExp(projectName))
			.should('be.visible')
			.click();
	}
};
