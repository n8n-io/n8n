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
		inviteMultipleUsers: (emails: string[]) => {
			this.getters.inviteButton().click();

			const inviteLinks: Record<string, string> = {};
			this.getters.inviteUsersModal().within((modal) => {
				this.getters.inviteUsersModalEmailsInput().type(emails.join(',')).type('{enter}');
				cy.getByTestId('copy-invite-link-button').each((button, index) => {
					cy.wrap(button).click();
					cy.window()
						.its('navigator.clipboard')
						.invoke('readText')
						.then((inviteLink) => {
							inviteLinks[emails[index]] = inviteLink;
						});
				});
			});

			return inviteLinks;
		},
	};
}
