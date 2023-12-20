import { BasePage } from './base';

export class PublicApiPage extends BasePage {
	url = '/settings/api';
	secret = '';

	getters = {
		upgradeCTA: () => cy.getByTestId('public-api-upgrade-cta'),
	};
	actions = {};
}
