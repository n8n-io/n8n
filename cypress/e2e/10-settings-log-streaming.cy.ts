import { randFirstName, randLastName } from '@ngneat/falso';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { SettingsLogStreamingPage } from '../pages';

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();
const settingsLogStreamingPage = new SettingsLogStreamingPage();

describe('Log Streaming Settings', () => {
	before(() => {
		cy.setup({ email, firstName, lastName, password });
	});

	beforeEach(() => {
		cy.signin({ email, password });
	});

	it('should show the unlicensed view when the feature is disabled', () => {
		cy.visit('/settings/log-streaming');
		settingsLogStreamingPage.getters.getActionBoxUnlicensed().should('be.visible');
		settingsLogStreamingPage.getters.getContactUsButton().should('be.visible');
		settingsLogStreamingPage.getters.getActionBoxLicensed().should('not.exist');
	});

	it('should show the licensed view when the feature is enabled', () => {
		cy.enableFeature('feat:logStreaming');
		cy.visit('/settings/log-streaming');
		settingsLogStreamingPage.getters.getActionBoxLicensed().should('be.visible');
		settingsLogStreamingPage.getters.getAddFirstDestinationButton().should('be.visible');
		settingsLogStreamingPage.getters.getActionBoxUnlicensed().should('not.exist');
	});

	it('should show the add destination modal', () => {
		cy.visit('/settings/log-streaming');
		settingsLogStreamingPage.actions.clickAddFirstDestination();
		cy.wait(100);
		settingsLogStreamingPage.getters.getDestinationModal().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationType().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationButton().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationButton().should('have.attr', 'disabled');
		settingsLogStreamingPage.getters
			.getDestinationModalDialog()
			.invoke('css', 'width')
			.then((widthStr) => parseInt((widthStr as unknown as string).replace('px', '')))
			.should('be.lessThan', 500);
		settingsLogStreamingPage.getters.getSelectDestinationType().click();
		settingsLogStreamingPage.getters.getSelectDestinationTypeItems().eq(0).click();
		settingsLogStreamingPage.getters
			.getSelectDestinationButton()
			.should('not.have.attr', 'disabled');
		settingsLogStreamingPage.getters.getDestinationModal().click(1, 1);
		settingsLogStreamingPage.getters.getDestinationModal().should('not.exist');
	});

	it('should create a destination and delete it', () => {
		cy.visit('/settings/log-streaming');
		settingsLogStreamingPage.actions.clickAddFirstDestination();
		cy.wait(100);
		settingsLogStreamingPage.getters.getDestinationModal().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationType().click();
		settingsLogStreamingPage.getters.getSelectDestinationTypeItems().eq(0).click();
		settingsLogStreamingPage.getters.getSelectDestinationButton().click();
		settingsLogStreamingPage.getters.getDestinationNameInput().click()

		settingsLogStreamingPage.getters.getDestinationNameInput().find('input').clear().type('Destination 0');
		settingsLogStreamingPage.getters.getDestinationSaveButton().click();
		cy.wait(100);
		settingsLogStreamingPage.getters.getDestinationModal().click(1, 1);
		cy.reload();
		settingsLogStreamingPage.getters.getDestinationCards().eq(0).click();
		settingsLogStreamingPage.getters.getDestinationDeleteButton().should('be.visible').click();
		cy.get('.el-message-box').should('be.visible').find('.btn--cancel').click();
		settingsLogStreamingPage.getters.getDestinationDeleteButton().click();
		cy.get('.el-message-box').should('be.visible').find('.btn--confirm').click();
		cy.reload();
	});

	it('should create a destination and delete it via card actions', () => {
		cy.visit('/settings/log-streaming');
		settingsLogStreamingPage.actions.clickAddFirstDestination();
		cy.wait(100);
		settingsLogStreamingPage.getters.getDestinationModal().should('be.visible');
		settingsLogStreamingPage.getters.getSelectDestinationType().click();
		settingsLogStreamingPage.getters.getSelectDestinationTypeItems().eq(0).click();
		settingsLogStreamingPage.getters.getSelectDestinationButton().click();
		settingsLogStreamingPage.getters.getDestinationNameInput().click()
		settingsLogStreamingPage.getters.getDestinationNameInput().find('input').clear().type('Destination 1');
		settingsLogStreamingPage.getters.getDestinationSaveButton().should('not.have.attr', 'disabled');
		settingsLogStreamingPage.getters.getDestinationSaveButton().click();
		cy.wait(100);
		settingsLogStreamingPage.getters.getDestinationModal().click(1, 1);
		cy.reload();

		settingsLogStreamingPage.getters
			.getDestinationCards()
			.eq(0)
			.find('.el-dropdown-selfdefine')
			.click();
		cy.get('.el-dropdown-menu').find('.el-dropdown-menu__item').eq(0).click();
		settingsLogStreamingPage.getters.getDestinationSaveButton().should('not.exist');
		settingsLogStreamingPage.getters.getDestinationModal().click(1, 1);

		settingsLogStreamingPage.getters
			.getDestinationCards()
			.eq(0)
			.find('.el-dropdown-selfdefine')
			.click();
		cy.get('.el-dropdown-menu').find('.el-dropdown-menu__item').eq(1).click();
		cy.get('.el-message-box').should('be.visible').find('.btn--confirm').click();
		cy.reload();
	});
});
