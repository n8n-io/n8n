import { BasePage } from '../base';

export class SettingsSidebar extends BasePage {
	getters = {
		menuItem: (id: string) => cy.getByTestId('menu-item').get('#' + id),
		users: () => this.getters.menuItem('settings-users'),
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
