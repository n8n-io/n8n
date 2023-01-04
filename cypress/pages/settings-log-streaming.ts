import { BasePage } from './base';

export class SettingsLogStreamingPage extends BasePage {
	url = '/settings/log-streaming';
	getters = {
		getActionBoxUnlicensed: () => cy.getByTestId('action-box-unlicensed'),
		getActionBoxLicensed: () => cy.getByTestId('action-box-licensed'),
		getDestinationModal: () => cy.getByTestId('destination-modal'),
		getDestinationModalDialog: () => this.getters.getDestinationModal().find('.el-dialog'),
		getSelectDestinationType: () => cy.getByTestId('select-destination-type'),
		getDestinationNameInput: () => cy.getByTestId('subtitle-showing-type'),
		getSelectDestinationTypeItems: () =>
			this.getters.getSelectDestinationType().find('.el-select-dropdown__item'),
		getSelectDestinationButton: () => cy.getByTestId('select-destination-button'),
		getContactUsButton: () => this.getters.getActionBoxUnlicensed().find('button'),
		getAddFirstDestinationButton: () => this.getters.getActionBoxLicensed().find('button'),
		getDestinationSaveButton: () => cy.getByTestId('destination-save-button').find('button'),
		getDestinationDeleteButton: () => cy.getByTestId('destination-delete-button'),
		getDestinationCards: () => cy.getByTestId('destination-card'),
	};
	actions = {
		clickContactUs: () => this.getters.getContactUsButton().click(),
		clickAddFirstDestination: () => this.getters.getAddFirstDestinationButton().click(),
		clickSelectDestinationButton: () => this.getters.getSelectDestinationButton().click(),
	};
}
