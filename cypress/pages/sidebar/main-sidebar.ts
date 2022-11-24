import { BasePage } from "../base";

export class MainSidebar extends BasePage {
	getters = {
		settings: () => cy.getByTestId('menu-item-settings', { timeout: 5000 }),
		templates: () => cy.getByTestId('menu-item-templates'),
		workflows: () => cy.getByTestId('menu-item-workflows'),
		credentials: () => cy.getByTestId('menu-item-credentials'),
		executions: () => cy.getByTestId('menu-item-executions'),
	};
	actions = {
		goToSettings: () => this.getters.settings().click(),
		goToCredentials: () => this.getters.credentials().click(),
	};
}
