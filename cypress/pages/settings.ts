import { BasePage } from './base';

export class SettingsPage extends BasePage {
	url = '/settings';
	getters = {
		menuItems: () => cy.getByTestId('menu-item'),
	};
	actions = {};
}
