import { BasePage } from "./base";

export class SettingsUsersPage extends BasePage {
	url = '/settings/users';
	getters = {
		setUpOwnerButton: () => cy.getByTestId('action-box').find('button'),
	}
	actions = {
		goToOwnerSetup: () => this.getters.setUpOwnerButton().click(),
	}
}
