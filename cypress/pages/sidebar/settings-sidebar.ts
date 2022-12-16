import { BasePage } from '../base';

export class SettingsSidebar extends BasePage {
	getters = {
		personal: () => cy.getByTestId('menu-item-settings-personal'),
		users: () => cy.getByTestId('menu-item-settings-users'),
		api: () => cy.getByTestId('menu-item-settings-api'),
		communityNodes: () => cy.getByTestId('menu-item-settings-community-nodes'),
		back: () => cy.getByTestId('settings-back'),
	};
	actions = {
		back: () => this.getters.back().click(),
	};
}
