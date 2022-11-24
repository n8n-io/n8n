import { BasePage } from "../base";

export class NDV extends BasePage {
	getters = {
		modal: () => cy.getByTestId('ndv'),
		triggerPanel: () => cy.getByTestId('trigger-panel'),
	};
}
