import { BasePage } from '../base';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
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
