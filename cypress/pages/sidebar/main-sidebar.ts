import { BasePage } from "../base";

export class MainSidebar extends BasePage {
	getters = {
		settings: () => cy.getByTestId('menu-item-settings'),
		templates: () => cy.getByTestId('menu-item-templates'),
		workflows: () => cy.getByTestId('menu-item-workflows'),
		credentials: () => cy.getByTestId('menu-item-credentials'),
		executions: () => cy.getByTestId('menu-item-executions'),
	};
	actions = {
		goToSettings: () => {
			// For some reason Cypress gets confused when clicking on the settings menu item
			// and it pickups element that will get detached with the sidebar animation
			// so we need to wait for it to happen first
			cy.wait(500)
			this.getters.settings().click();
		},
		goToCredentials: () => {
			cy.wait(500)
			this.getters.credentials().click()
		},
	};
}
