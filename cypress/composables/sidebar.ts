export function expandSidebar() {
	cy.get('#collapse-change-button svg[data-icon="chevron-right"]').should('be.visible');
	cy.get('#collapse-change-button').click();
}
