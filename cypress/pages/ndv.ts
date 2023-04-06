import { BasePage } from './base';

export class NDV extends BasePage {
	getters = {
		container: () => cy.getByTestId('ndv'),
		backToCanvas: () => cy.getByTestId('back-to-canvas'),
		copyInput: () => cy.getByTestId('copy-input'),
		credentialInput: (eq = 0) => cy.getByTestId('node-credentials-select').eq(eq),
		nodeExecuteButton: () => cy.getByTestId('node-execute-button'),
		inputSelect: () => cy.getByTestId('ndv-input-select'),
		inputOption: () => cy.getByTestId('ndv-input-option'),
		inputPanel: () => cy.getByTestId('ndv-input-panel'),
		outputPanel: () => cy.getByTestId('output-panel'),
		executingLoader: () => cy.getByTestId('ndv-executing'),
		inputDataContainer: () => this.getters.inputPanel().findChildByTestId('ndv-data-container'),
		inputDisplayMode: () => this.getters.inputPanel().findChildByTestId('ndv-run-data-display-mode').first(),
		outputDataContainer: () => this.getters.outputPanel().findChildByTestId('ndv-data-container'),
		outputDisplayMode: () => this.getters.outputPanel().findChildByTestId('ndv-run-data-display-mode').first(),
		pinDataButton: () => cy.getByTestId('ndv-pin-data'),
		editPinnedDataButton: () => cy.getByTestId('ndv-edit-pinned-data'),
		pinnedDataEditor: () => this.getters.outputPanel().find('.monaco-editor[role=code]'),
		runDataPaneHeader: () => cy.getByTestId('run-data-pane-header'),
		savePinnedDataButton: () => this.getters.runDataPaneHeader().find('button').filter(':visible').contains('Save'),
		outputTableRows: () => this.getters.outputDataContainer().find('table tr'),
		outputTableHeaders: () => this.getters.outputDataContainer().find('table thead th'),
		outputTableRow: (row: number) => this.getters.outputTableRows().eq(row),
		outputTbodyCell: (row: number, col: number) =>
			this.getters.outputTableRow(row).find('td').eq(col),
		inputTableRows: () => this.getters.inputDataContainer().find('table tr'),
		inputTableHeaders: () => this.getters.inputDataContainer().find('table thead th'),
		inputTableRow: (row: number) => this.getters.inputTableRows().eq(row),
		inputTbodyCell: (row: number, col: number) =>
			this.getters.inputTableRow(row).find('td').eq(col),
		inlineExpressionEditorInput: () => cy.getByTestId('inline-expression-editor-input'),
		nodeParameters: () => cy.getByTestId('node-parameters'),
		parameterInput: (parameterName: string) => cy.getByTestId(`parameter-input-${parameterName}`),
		parameterExpressionPreview: (parameterName: string) =>
			this.getters
				.nodeParameters()
				.find(
					`[data-test-id="parameter-input-${parameterName}"] + [data-test-id="parameter-expression-preview"]`,
				),
		nodeNameContainer: () => cy.getByTestId('node-title-container'),
		nodeRenameInput: () => cy.getByTestId('node-rename-input'),
		executePrevious: () => cy.getByTestId('execute-previous-node'),
		httpRequestNotice: () => cy.getByTestId('node-parameters-http-notice'),
		nthParam: (n: number) => cy.getByTestId('node-parameters').find('.parameter-item').eq(n),
		inputRunSelector: () => this.getters.inputPanel().findChildByTestId('run-selector'),
		outputRunSelector: () => this.getters.outputPanel().findChildByTestId('run-selector'),
		outputHoveringItem: () => this.getters.outputPanel().findChildByTestId('hovering-item'),
		inputHoveringItem: () => this.getters.inputPanel().findChildByTestId('hovering-item'),
		outputBranches: () => this.getters.outputPanel().findChildByTestId('branches'),
		inputBranches: () => this.getters.inputPanel().findChildByTestId('branches'),
	};

	actions = {
		pinData: () => {
			this.getters.pinDataButton().click();
		},
		editPinnedData: () => {
			this.getters.editPinnedDataButton().click();
		},
		savePinnedData: () => {
			this.getters.savePinnedDataButton().click();
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

			this.getters.pinnedDataEditor().click();
			this.getters.pinnedDataEditor().type(`{selectall}{backspace}`);
			this.getters.pinnedDataEditor().type(JSON.stringify(data).replace(new RegExp('{', 'g'), '{{}'));

			this.actions.savePinnedData();
		},
		clearParameterInput: (parameterName: string) => {
			this.getters.parameterInput(parameterName).type(`{selectall}{backspace}`);
		},
		typeIntoParameterInput: (parameterName: string, content: string) => {
			this.getters.parameterInput(parameterName).type(content);
		},
		selectOptionInParameterDropdown: (parameterName: string, content: string) => {
			this.getters.parameterInput(parameterName).find('.option-headline').contains(content).click();
		},
		dismissMappingTooltip: () => {
			cy.getByTestId('dismiss-mapping-tooltip').click();
		},
		rename: (newName: string) => {
			this.getters.nodeNameContainer().click();
			this.getters.nodeRenameInput().should('be.visible').type('{selectall}').type(newName);
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
		mapToParameter: (parameterName: string) => {
			const droppable = `[data-test-id="parameter-input-${parameterName}"]`;
			cy.draganddrop('', droppable);
		},
		switchInputMode: (type: 'Schema' | 'Table' | 'JSON' | 'Binary') => {
			this.getters.inputDisplayMode().find('label').contains(type).click({ force: true });
		},
		switchOutputMode: (type: 'Schema' | 'Table' | 'JSON' | 'Binary') => {
			this.getters.outputDisplayMode().find('label').contains(type).click({ force: true });
		},
		selectInputNode: (nodeName: string) => {
			this.getters.inputSelect().find('.el-select').click();
			this.getters.inputOption().contains(nodeName).click();
		},
		addDefaultPinnedData: () => {
			this.actions.editPinnedData();
			this.actions.savePinnedData();
		},
		changeInputRunSelector: (runName: string) => {
			this.getters.inputRunSelector().click();
			cy.get('.el-select-dropdown:visible .el-select-dropdown__item')
				.contains(runName)
				.click();
		},
		changeOutputRunSelector: (runName: string) => {
			this.getters.outputRunSelector().click();
			cy.get('.el-select-dropdown:visible .el-select-dropdown__item')
				.contains(runName)
				.click();
		},
		toggleOutputRunLinking: () => {
			this.getters.outputRunSelector().find('button').click();
		},
		toggleInputRunLinking: () => {
			this.getters.inputRunSelector().find('button').click();
		},
		switchOutputBranch: (name: string) => {
			this.getters.outputBranches().get('span').contains(name).click();
		},
		switchIntputBranch: (name: string) => {
			this.getters.inputBranches().get('span').contains(name).click();
		},
	};
}
