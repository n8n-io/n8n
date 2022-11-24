import { BasePage } from "../base";

export class SettingsSidebar extends BasePage {
	getters = {
		personal: () => cy.getByTestId('menuitem-settings-personal'),
		users: () => cy.getByTestId('menuitem-settings-users'),
		api: () => cy.getByTestId('menuitem-settings-api'),
		communityNodes: () => cy.getByTestId('menuitem-settings-community-nodes'),
		back: () => cy.getByTestId('settings-back'),
	};
	actions = {
		back: () => this.getters.back().click(),
	};
}
