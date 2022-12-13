import { BasePage } from "../base";

export class MainSidebar extends BasePage {
	getters = {
		menuItem: (menuLabel: string) => cy.getByTestId('menu-item').filter(`:contains("${menuLabel}")`),
		settings: () => this.getters.menuItem('Settings'),
		templates: () => this.getters.menuItem('Templates'),
		workflows: () => this.getters.menuItem('Workflows'),
		credentials: () => this.getters.menuItem('Credentials'),
		executions: () => this.getters.menuItem('Executions'),
	};
	actions = {
		goToSettings: () => {
			this.getters.settings().should('be.visible');
			// We must wait before ElementUI menu is done with its animations
			cy.get('[data-old-overflow]').should('not.exist');
			this.getters.settings().click();
		},
		goToCredentials: () => {
			this.getters.credentials().should('be.visible');
			cy.get('[data-old-overflow]').should('not.exist');
			this.getters.credentials().click()
		},
	};
}
