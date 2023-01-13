import { BasePage } from '../base';

export class SettingsSidebar extends BasePage {
	getters = {
		menuItem: (menuLabel: string) =>
			cy.getByTestId('menu-item').filter(`:contains("${menuLabel}")`),
		users: () => this.getters.menuItem('Users'),
		back: () => cy.getByTestId('settings-back'),
	};
	actions = {
		goToUsers: () => {
			this.getters.users().should('be.visible');
			// We must wait before ElementUI menu is done with its animations
			cy.get('[data-old-overflow]').should('not.exist');
			this.getters.users().click();
		},
		back: () => this.getters.back().click(),
	};
}
