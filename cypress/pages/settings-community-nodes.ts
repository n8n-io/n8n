import { BasePage } from './base';

export class SettingsCommunityNodes extends BasePage {
	settingsUrl = '/settings';
	url = '/settings/community-nodes';
	getters = {
		installCommunityNodeButton: () =>
			cy.getByTestId('settings-community-nodes-install-button').find('button').first(),
		communityInstallModalInput: () =>
			cy.getByTestId('community-package-install-modal-input').find('input').first(),
		communityInstallModalCheckbox: () => cy.getByTestId('community-package-install-modal-checkbox'),
		communityInstallModalButton: () => cy.getByTestId('community-package-install-modal-button'),
		communityInstallModal: () => cy.getByTestId('communityPackageInstall-modal'),
		communityInstallSidebarEntry: () => cy.getByTestId('settings-community-nodes'),
	};
	actions = {
		clickInstallCommunityNodeButton: () => this.getters.installCommunityNodeButton().click(),
		enterInstallCommunityNodeName: (name: string) =>
			this.getters.communityInstallModalInput().type(name),
		clickCommunityInstallModalCheckbox: () => this.getters.communityInstallModalCheckbox().click(),
		clickCommunityInstallModalButton: () => this.getters.communityInstallModalButton().click(),
	};
}
