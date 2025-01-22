import { BasePage } from './base';
import { getVisibleSelect } from '../utils';

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class SettingsLogStreamingPage extends BasePage {
	url = '/settings/log-streaming';

	getters = {
		getActionBoxUnlicensed: () => cy.getByTestId('action-box-unlicensed'),
		getActionBoxLicensed: () => cy.getByTestId('action-box-licensed'),
		getDestinationModal: () => cy.getByTestId('destination-modal'),
		getSelectDestinationType: () => cy.getByTestId('select-destination-type'),
		getDestinationNameInput: () => cy.getByTestId('subtitle-showing-type'),
		getSelectDestinationTypeItems: () => getVisibleSelect().find('.el-select-dropdown__item'),
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
