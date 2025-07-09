import { SettingsLogStreamingPage } from '../pages';
import { getVisibleDropdown } from '../utils';
import { getVisibleModalOverlay } from '../utils/modal';

const settingsLogStreamingPage = new SettingsLogStreamingPage();

describe('Log Streaming Settings', () => {
	it('should show the unlicensed view when the feature is disabled', () => {
		cy.visit('/settings/log-streaming');
		settingsLogStreamingPage.getters.getActionBoxUnlicensed().should('be.visible');
		settingsLogStreamingPage.getters.getContactUsButton().should('be.visible');
		settingsLogStreamingPage.getters.getActionBoxLicensed().should('not.exist');
	});

	it('should show the licensed view when the feature is enabled', () => {
		cy.enableFeature('logStreaming');
		cy.visit('/settings/log-streaming');
		settingsLogStreamingPage.getters.getActionBoxLicensed().should('be.visible');
		settingsLogStreamingPage.getters.getAddFirstDestinationButton().should('be.visible');
		settingsLogStreamingPage.getters.getActionBoxUnlicensed().should('not.exist');
	});

	it('should show the add destination modal', () => {
		cy.enableFeature('logStreaming');
		cy.visit('/settings/log-streaming');
		settingsLogStreamingPage.actions.clickAddFirstDestination();
		cy.wait(100);
		settingsLogStreamingPage.getters.getDestinationModal().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationType().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationButton().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationButton().should('have.attr', 'disabled');
		settingsLogStreamingPage.getters
			.getDestinationModal()
			.invoke('css', 'width')
			.then((widthStr) => parseInt((widthStr as unknown as string).replace('px', '')))
			.should('be.lessThan', 500);
		settingsLogStreamingPage.getters.getSelectDestinationType().click();
		settingsLogStreamingPage.getters.getSelectDestinationTypeItems().eq(0).click();
		settingsLogStreamingPage.getters
			.getSelectDestinationButton()
			.should('not.have.attr', 'disabled');
		getVisibleModalOverlay().click(1, 1);
		settingsLogStreamingPage.getters.getDestinationModal().should('not.exist');
	});

	it('should create a destination and delete it', () => {
		cy.enableFeature('logStreaming');
		cy.visit('/settings/log-streaming');
		cy.wait(1000); // Race condition with getDestinationDataFromBackend()
		settingsLogStreamingPage.actions.clickAddFirstDestination();
		cy.wait(100);
		settingsLogStreamingPage.getters.getDestinationModal().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationType().click();
		settingsLogStreamingPage.getters.getSelectDestinationTypeItems().eq(0).click();
		settingsLogStreamingPage.getters.getSelectDestinationButton().click();
		settingsLogStreamingPage.getters.getDestinationNameInput().click();

		settingsLogStreamingPage.getters
			.getDestinationNameInput()
			.find('span[data-test-id=inline-edit-preview]')
			.click();
		cy.getByTestId('inline-edit-input').type('Destination 0');
		settingsLogStreamingPage.getters.getDestinationSaveButton().click();
		cy.wait(100);
		getVisibleModalOverlay().click(1, 1);
		cy.reload();
		settingsLogStreamingPage.getters.getDestinationCards().eq(0).click();
		settingsLogStreamingPage.getters.getDestinationDeleteButton().should('be.visible').click();
		cy.get('.el-message-box').should('be.visible').find('.btn--cancel').click();
		settingsLogStreamingPage.getters.getDestinationDeleteButton().click();
		cy.get('.el-message-box').should('be.visible').find('.btn--confirm').click();
	});

	it('should create a destination and delete it via card actions', () => {
		cy.enableFeature('logStreaming');
		cy.visit('/settings/log-streaming');
		cy.wait(1000); // Race condition with getDestinationDataFromBackend()
		settingsLogStreamingPage.actions.clickAddFirstDestination();
		cy.wait(100);
		settingsLogStreamingPage.getters.getDestinationModal().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationType().click();
		settingsLogStreamingPage.getters.getSelectDestinationTypeItems().eq(0).click();
		settingsLogStreamingPage.getters.getSelectDestinationButton().click();
		settingsLogStreamingPage.getters.getDestinationNameInput().click();
		settingsLogStreamingPage.getters
			.getDestinationNameInput()
			.find('span[data-test-id=inline-edit-preview]')
			.click();
		cy.getByTestId('inline-edit-input').type('Destination 1');
		settingsLogStreamingPage.getters.getDestinationSaveButton().should('not.have.attr', 'disabled');
		settingsLogStreamingPage.getters.getDestinationSaveButton().click();
		cy.wait(100);
		getVisibleModalOverlay().click(1, 1);
		cy.reload();

		settingsLogStreamingPage.getters.getDestinationCards().eq(0).find('.el-dropdown').click();
		getVisibleDropdown().find('.el-dropdown-menu__item').eq(0).click();
		settingsLogStreamingPage.getters.getDestinationSaveButton().should('not.exist');
		getVisibleModalOverlay().click(1, 1);

		settingsLogStreamingPage.getters.getDestinationCards().eq(0).find('.el-dropdown').click();
		getVisibleDropdown().find('.el-dropdown-menu__item').eq(1).click();
		cy.get('.el-message-box').should('be.visible').find('.btn--confirm').click();
	});
});
