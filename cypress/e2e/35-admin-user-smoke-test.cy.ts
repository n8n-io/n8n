import { INSTANCE_ADMIN, INSTANCE_OWNER } from '../constants';
import { SettingsPage } from '../pages/settings';

const settingsPage = new SettingsPage();

describe('Admin user', { disableAutoLogin: true }, () => {
	it('should see same Settings sub menu items as instance owner', () => {
		cy.signin(INSTANCE_OWNER);
		cy.visit(settingsPage.url);

		let ownerMenuItems = 0;

		settingsPage.getters.menuItems().then(($el) => {
			ownerMenuItems = $el.length;
		});

		cy.signout();
		cy.signin(INSTANCE_ADMIN);
		cy.visit(settingsPage.url);

		settingsPage.getters.menuItems().should('have.length', ownerMenuItems);
	});
});
