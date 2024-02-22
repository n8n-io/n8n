import { BasePage } from './base';

export class BannerStack extends BasePage {
	getters = {
		banner: () => cy.getByTestId('banner-stack'),
	};
	actions = {};
}
