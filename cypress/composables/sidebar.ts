export function expandSidebar() {
	cy.get('#collapse-change-button').then(($button) => {
		if ($button.find('svg[data-icon="chevron-right"]').length > 0) {
			cy.get('#collapse-change-button').click();
		}
	});
}
