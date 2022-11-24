import { BasePage } from "../base";

export class MainSidebar extends BasePage {
	getters = {
		settings: () => cy.getByTestId('menuitem-settings'),
		templates: () => cy.getByTestId('menuitem-templates'),
		workflows: () => cy.getByTestId('menuitem-workflows'),
		credentials: () => cy.getByTestId('menuitem-credentials'),
		executions: () => cy.getByTestId('menuitem-executions'),
	};
	actions = {
		goToSettings: () => {
			this.getters.settings().click();
		},
	};
}
