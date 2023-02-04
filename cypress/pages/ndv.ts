import { BasePage } from './base';

export class NDV extends BasePage {
	getters = {
		container: () => cy.getByTestId('ndv'),
		backToCanvas: () => cy.getByTestId('back-to-canvas'),
		copyInput: () => cy.getByTestId('copy-input'),
		nodeExecuteButton: () => cy.getByTestId('node-execute-button'),
		inputSelect: () => cy.getByTestId('ndv-input-select'),
		inputOption: () => cy.getByTestId('ndv-input-option'),
		inputPanel: () => cy.getByTestId('ndv-input-panel'),
		outputPanel: () => cy.getByTestId('output-panel'),
		inputDataContainer: () => this.getters.inputPanel().findChildByTestId('ndv-data-container'),
		outputDataContainer: () => this.getters.outputPanel().findChildByTestId('ndv-data-container'),
		runDataDisplayMode: () => cy.getByTestId('ndv-run-data-display-mode'),
		digital: () => cy.getByTestId('ndv-run-data-display-mode'),
		pinDataButton: () => cy.getByTestId('ndv-pin-data'),
		editPinnedDataButton: () => cy.getByTestId('ndv-edit-pinned-data'),
		pinnedDataEditor: () => this.getters.outputPanel().find('.monaco-editor'),
		runDataPaneHeader: () => cy.getByTestId('run-data-pane-header'),
		savePinnedDataButton: () => this.getters.runDataPaneHeader().find('button').contains('Save'),
		outputTableRows: () => this.getters.outputDataContainer().find('table tr'),
		outputTableHeaders: () => this.getters.outputDataContainer().find('table thead th'),
		outputTableRow: (row: number) => this.getters.outputTableRows().eq(row),
		outputTbodyCell: (row: number, cell: number) =>
			this.getters.outputTableRow(row).find('td').eq(cell),
		parameterInput: (parameterName: string) => cy.getByTestId(`parameter-input-${parameterName}`),
		nodeNameContainer: () => cy.getByTestId('node-title-container'),
		nodeRenameInput: () => cy.getByTestId('node-rename-input'),
		httpRequestNotice: () => cy.getByTestId('node-parameters-http-notice'),
	};

	actions = {
		pinData: () => {
			this.getters.pinDataButton().click();
		},
		editPinnedData: () => {
			this.getters.editPinnedDataButton().click();
		},
		execute: () => {
			this.getters.nodeExecuteButton().first().click();
		},
		close: () => {
			this.getters.backToCanvas().click();
		},
		setPinnedData: (data: object) => {
			this.getters.editPinnedDataButton().click();

			const editor = this.getters.pinnedDataEditor();
			editor.click();
			editor.type(`{selectall}{backspace}`);
			editor.type(JSON.stringify(data).replace(new RegExp('{', 'g'), '{{}'));

			this.getters.savePinnedDataButton().click();
		},
		typeIntoParameterInput: (parameterName: string, content: string) => {
			this.getters.parameterInput(parameterName).type(content);
		},
		selectOptionInParameterDropdown: (parameterName: string, content: string) => {
			this.getters.parameterInput(parameterName).find('.option-headline').contains(content).click();
		},
		rename: (newName: string) => {
			this.getters.nodeNameContainer().click();
			this.getters.nodeRenameInput().should('be.visible').type('{selectall}').type(newName);
			cy.get('body').type('{enter}');
		},
	};
}
