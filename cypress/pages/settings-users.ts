import { BasePage } from './base';

export class SettingsUsersPage extends BasePage {
	url = '/settings/users';
	getters = {
		setUpOwnerButton: () => cy.getByTestId('action-box').find('button').first(),
		inviteButton: () => cy.getByTestId('settings-users-invite-button').last(),
		inviteUsersModal: () => cy.getByTestId('inviteUser-modal').last(),
		inviteUsersModalEmailsInput: () => cy.getByTestId('emails').find('input').first(),
	};
	actions = {
		goToOwnerSetup: () => this.getters.setUpOwnerButton().click(),
	};
}
