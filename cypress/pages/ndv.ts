import { BasePage } from "./base";

export class NDV extends BasePage {
	getters = {
		container: () => cy.getByTestId('ndv'),
		backToCanvas: () => cy.getByTestId('back-to-canvas'),
		copyInput: () => cy.getByTestId('copy-input'),
		nodeExecuteButton: () => cy.getByTestId('node-execute-button'),
		inputSelect: () => cy.getByTestId('ndv-input-select'),
		inputOption: () => cy.getByTestId('ndv-input-option'),
		inputPanel: () => cy.getByTestId('ndv-input-panel'),
		dataContainer: () => cy.getByTestId('ndv-data-container'),
		runDataDisplayMode: () => cy.getByTestId('ndv-run-data-display-mode'),
		digital: () => cy.getByTestId('ndv-run-data-display-mode'),
	}
}
