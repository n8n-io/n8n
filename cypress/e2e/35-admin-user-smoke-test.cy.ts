const url = '/settings';

describe('Admin user', { disableAutoLogin: true }, () => {
	it('should see same Settings sub menu items as instance owner', () => {
		cy.signinAsOwner();
		cy.visit(url);

		let ownerMenuItems = 0;

		cy.getByTestId('menu-item').then(($el) => {
			ownerMenuItems = $el.length;
		});

		cy.signout();
		cy.signinAsAdmin();
		cy.visit(url);

		cy.getByTestId('menu-item').should('have.length', ownerMenuItems);
	});
});
