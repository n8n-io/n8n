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
		inputDisplayMode: () => this.getters.inputPanel().getByTestId('ndv-run-data-display-mode'),
		outputDataContainer: () => this.getters.outputPanel().findChildByTestId('ndv-data-container'),
		outputDisplayMode: () => this.getters.outputPanel().getByTestId('ndv-run-data-display-mode'),
		digital: () => cy.getByTestId('ndv-run-data-display-mode'),
		pinDataButton: () => cy.getByTestId('ndv-pin-data'),
		editPinnedDataButton: () => cy.getByTestId('ndv-edit-pinned-data'),
		pinnedDataEditor: () => this.getters.outputPanel().find('.monaco-editor'),
		runDataPaneHeader: () => cy.getByTestId('run-data-pane-header'),
		savePinnedDataButton: () => this.getters.runDataPaneHeader().find('button').contains('Save'),
		outputTableRows: () => this.getters.outputDataContainer().find('table tr'),
		outputTableHeaders: () => this.getters.outputDataContainer().find('table thead th'),
		outputTableRow: (row: number) => this.getters.outputTableRows().eq(row),
		outputTbodyCell: (row: number, col: number) => this.getters.outputTableRow(row).find('td').eq(col),
		inputTableRows: () => this.getters.outputDataContainer().find('table tr'),
		inputTableHeaders: () => this.getters.outputDataContainer().find('table thead th'),
		inputTableRow: (row: number) => this.getters.outputTableRows().eq(row),
		inputTbodyCell: (row: number, col: number) => this.getters.outputTableRow(row).find('td').eq(col),
		inlineExpressionEditorInput: () => cy.getByTestId('inline-expression-editor-input'),
		nodeParameters: () => cy.getByTestId('node-parameters'),
		parameterInput: (parameterName: string) => cy.getByTestId(`parameter-input-${parameterName}`),
		nodeNameContainer: () => cy.getByTestId('node-title-container'),
		nodeRenameInput: () => cy.getByTestId('node-rename-input'),
		executePrevious: () => cy.getByTestId('execute-previous-node'),
		httpRequestNotice: () => cy.getByTestId('node-parameters-http-notice'),
		inlineExpressionEditorInput: () => cy.getByTestId('inline-expression-editor-input'),
		nthParam: (n: number) => cy.getByTestId('node-parameters').find('.parameter-item').eq(n),
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
		openInlineExpressionEditor: () => {
			cy.contains('Expression').invoke('show').click();
			this.getters.inlineExpressionEditorInput().click();
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
			this.getters
				.parameterInput(parameterName)
				.find('.option-headline')
				.contains(content)
				.click();
		},
		rename: (newName: string) => {
			this.getters.nodeNameContainer().click();
			this.getters.nodeRenameInput()
				.should('be.visible')
				.type('{selectall}')
				.type(newName);
			cy.get('body').type('{enter}');
		},
		executePrevious: () => {
			this.getters.executePrevious().click();
		},
		mapDataFromHeader: (col: number, parameterName: string) => {
			const draggable = `[data-test-id="ndv-input-panel"] [data-test-id="ndv-data-container"] table th:nth-child(${col})`;
			const droppable = `[data-test-id="parameter-input-${parameterName}"]`;
			cy.draganddrop(draggable, droppable);
		},
		switchInputMode: (type: 'Schema' | 'Table' | 'JSON' | 'Binary') => {
			this.getters.inputDisplayMode().find('label').contains(type).click();
		},
		switchOutputMode: (type: 'Schema' | 'Table' | 'JSON' | 'Binary') => {
			this.getters.outputDisplayMode().find('label').contains(type).click();
		},
	};
}
