import { BasePage } from './base';
import { getVisiblePopper, getVisibleSelect } from '../utils';

export class NDV extends BasePage {
	getters = {
		container: () => cy.getByTestId('ndv'),
		backToCanvas: () => cy.getByTestId('back-to-canvas'),
		copyInput: () => cy.getByTestId('copy-input'),
		credentialInput: (eq = 0) => cy.getByTestId('node-credentials-select').eq(eq),
		nodeExecuteButton: () => cy.getByTestId('node-execute-button'),
		triggerPanelExecuteButton: () => cy.getByTestId('trigger-execute-button'),
		inputSelect: () => cy.getByTestId('ndv-input-select'),
		inputOption: () => cy.getByTestId('ndv-input-option'),
		inputPanel: () => cy.getByTestId('ndv-input-panel'),
		outputPanel: () => cy.getByTestId('output-panel'),
		executingLoader: () => cy.getByTestId('ndv-executing'),
		inputDataContainer: () => this.getters.inputPanel().findChildByTestId('ndv-data-container'),
		inputDisplayMode: () =>
			this.getters.inputPanel().findChildByTestId('ndv-run-data-display-mode').first(),
		outputDataContainer: () => this.getters.outputPanel().findChildByTestId('ndv-data-container'),
		outputDisplayMode: () =>
			this.getters.outputPanel().findChildByTestId('ndv-run-data-display-mode').first(),
		pinDataButton: () => cy.getByTestId('ndv-pin-data'),
		editPinnedDataButton: () => cy.getByTestId('ndv-edit-pinned-data'),
		pinnedDataEditor: () => this.getters.outputPanel().find('.cm-editor .cm-scroller .cm-content'),
		runDataPaneHeader: () => cy.getByTestId('run-data-pane-header'),
		nodeOutputHint: () => cy.getByTestId('ndv-output-run-node-hint'),
		savePinnedDataButton: () =>
			this.getters.runDataPaneHeader().find('button').filter(':visible').contains('Save'),
		outputTableRows: () => this.getters.outputDataContainer().find('table tr'),
		outputTableHeaders: () => this.getters.outputDataContainer().find('table thead th'),
		outputTableHeaderByText: (text: string) => this.getters.outputTableHeaders().contains(text),
		outputTableRow: (row: number) => this.getters.outputTableRows().eq(row),
		outputTbodyCell: (row: number, col: number) =>
			this.getters.outputTableRow(row).find('td').eq(col),
		inputTableRows: () => this.getters.inputDataContainer().find('table tr'),
		inputTableHeaders: () => this.getters.inputDataContainer().find('table thead th'),
		inputTableRow: (row: number) => this.getters.inputTableRows().eq(row),
		inputTbodyCell: (row: number, col: number) =>
			this.getters.inputTableRow(row).find('td').eq(col),
		inlineExpressionEditorInput: () => cy.getByTestId('inline-expression-editor-input'),
		inlineExpressionEditorOutput: () => cy.getByTestId('inline-expression-editor-output'),
		inlineExpressionEditorItemInput: () =>
			cy.getByTestId('inline-expression-editor-item-input').find('input'),
		inlineExpressionEditorItemPrevButton: () =>
			cy.getByTestId('inline-expression-editor-item-prev'),
		inlineExpressionEditorItemNextButton: () =>
			cy.getByTestId('inline-expression-editor-item-next'),
		nodeParameters: () => cy.getByTestId('node-parameters'),
		parameterInput: (parameterName: string) => cy.getByTestId(`parameter-input-${parameterName}`),
		parameterInputIssues: (parameterName: string) =>
			cy
				.getByTestId(`parameter-input-${parameterName}`)
				.should('have.length', 1)
				.findChildByTestId('parameter-issues'),
		parameterExpressionPreview: (parameterName: string) =>
			this.getters
				.nodeParameters()
				.find(`[data-test-id="parameter-expression-preview-${parameterName}"]`),
		nodeNameContainer: () => cy.getByTestId('node-title-container'),
		nodeRenameInput: () => cy.getByTestId('node-rename-input'),
		executePrevious: () => cy.getByTestId('execute-previous-node'),
		httpRequestNotice: () => cy.getByTestId('node-parameters-http-notice'),
		nthParam: (n: number) => cy.getByTestId('node-parameters').find('.parameter-item').eq(n),
		inputRunSelector: () => this.getters.inputPanel().findChildByTestId('run-selector'),
		inputLinkRun: () => this.getters.inputPanel().findChildByTestId('link-run'),
		outputRunSelector: () => this.getters.outputPanel().findChildByTestId('run-selector'),
		outputLinkRun: () => this.getters.outputPanel().findChildByTestId('link-run'),
		outputHoveringItem: () => this.getters.outputPanel().findChildByTestId('hovering-item'),
		inputHoveringItem: () => this.getters.inputPanel().findChildByTestId('hovering-item'),
		outputBranches: () => this.getters.outputPanel().findChildByTestId('branches'),
		inputBranches: () => this.getters.inputPanel().findChildByTestId('branches'),
		resourceLocator: (paramName: string) => cy.getByTestId(`resource-locator-${paramName}`),
		resourceLocatorInput: (paramName: string) =>
			this.getters.resourceLocator(paramName).find('[data-test-id="rlc-input-container"]'),
		resourceLocatorDropdown: (paramName: string) =>
			this.getters.resourceLocator(paramName).find('[data-test-id="resource-locator-dropdown"]'),
		resourceLocatorErrorMessage: () => cy.getByTestId('rlc-error-container'),
		resourceLocatorModeSelector: (paramName: string) =>
			this.getters.resourceLocator(paramName).find('[data-test-id="rlc-mode-selector"]'),
		resourceMapperFieldsContainer: () => cy.getByTestId('mapping-fields-container'),
		resourceMapperSelectColumn: () => cy.getByTestId('matching-column-select'),
		resourceMapperRemoveFieldButton: (fieldName: string) =>
			cy.getByTestId(`remove-field-button-${fieldName}`),
		resourceMapperColumnsOptionsButton: () =>
			cy.getByTestId('columns-parameter-input-options-container'),
		resourceMapperRemoveAllFieldsOption: () => cy.getByTestId('action-removeAllFields'),
		sqlEditorContainer: () => cy.getByTestId('sql-editor-container'),
		htmlEditorContainer: () => cy.getByTestId('html-editor-container'),
		filterComponent: (paramName: string) => cy.getByTestId(`filter-${paramName}`),
		filterCombinator: (paramName: string, index = 0) =>
			this.getters.filterComponent(paramName).getByTestId('filter-combinator-select').eq(index),
		filterConditions: (paramName: string) =>
			this.getters.filterComponent(paramName).getByTestId('filter-condition'),
		filterCondition: (paramName: string, index = 0) =>
			this.getters.filterComponent(paramName).getByTestId('filter-condition').eq(index),
		filterConditionLeft: (paramName: string, index = 0) =>
			this.getters.filterComponent(paramName).getByTestId('filter-condition-left').eq(index),
		filterConditionRight: (paramName: string, index = 0) =>
			this.getters.filterComponent(paramName).getByTestId('filter-condition-right').eq(index),
		filterConditionOperator: (paramName: string, index = 0) =>
			this.getters.filterComponent(paramName).getByTestId('filter-operator-select').eq(index),
		filterConditionRemove: (paramName: string, index = 0) =>
			this.getters.filterComponent(paramName).getByTestId('filter-remove-condition').eq(index),
		filterConditionAdd: (paramName: string) =>
			this.getters.filterComponent(paramName).getByTestId('filter-add-condition'),
		assignmentCollection: (paramName: string) =>
			cy.getByTestId(`assignment-collection-${paramName}`),
		assignmentCollectionAdd: (paramName: string) =>
			this.getters.assignmentCollection(paramName).getByTestId('assignment-collection-drop-area'),
		assignment: (paramName: string, index = 0) =>
			this.getters.assignmentCollection(paramName).getByTestId('assignment').eq(index),
		assignmentRemove: (paramName: string, index = 0) =>
			this.getters.assignment(paramName, index).getByTestId('assignment-remove'),
		assignmentName: (paramName: string, index = 0) =>
			this.getters.assignment(paramName, index).getByTestId('assignment-name'),
		assignmentValue: (paramName: string, index = 0) =>
			this.getters.assignment(paramName, index).getByTestId('assignment-value'),
		assignmentType: (paramName: string, index = 0) =>
			this.getters.assignment(paramName, index).getByTestId('assignment-type-select'),
		searchInput: () => cy.getByTestId('ndv-search'),
		pagination: () => cy.getByTestId('ndv-data-pagination'),
		nodeVersion: () => cy.getByTestId('node-version'),
		nodeSettingsTab: () => cy.getByTestId('tab-settings'),
		codeEditorFullscreenButton: () => cy.getByTestId('code-editor-fullscreen-button'),
		codeEditorDialog: () => cy.getByTestId('code-editor-fullscreen'),
		codeEditorFullscreen: () => this.getters.codeEditorDialog().find('.cm-content'),
		nodeRunSuccessIndicator: () => cy.getByTestId('node-run-info-success'),
		nodeRunErrorIndicator: () => cy.getByTestId('node-run-info-danger'),
		nodeRunErrorMessage: () => cy.getByTestId('node-error-message'),
		nodeRunErrorDescription: () => cy.getByTestId('node-error-description'),
	};

	actions = {
		pinData: () => {
			this.getters.pinDataButton().click({ force: true });
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
		setPinnedData: (data: object | string) => {
			const pinnedData = typeof data === 'string' ? data : JSON.stringify(data);
			this.getters.editPinnedDataButton().click();

			this.getters.pinnedDataEditor().click();
			this.getters
				.pinnedDataEditor()
				.type(
					`{selectall}{backspace}${pinnedData.replace(new RegExp('{', 'g'), '{{}')}`,
					{
						delay: 0,
					},
				);

			this.actions.savePinnedData();
		},
		pastePinnedData: (data: object) => {
			this.getters.editPinnedDataButton().click();

			this.getters.pinnedDataEditor().click();
			this.getters
				.pinnedDataEditor()
				.type('{selectall}{backspace}', { delay: 0 })
				.paste(JSON.stringify(data));

			this.actions.savePinnedData();
		},
		clearParameterInput: (parameterName: string) => {
			this.getters.parameterInput(parameterName).type(`{selectall}{backspace}`);
		},
		typeIntoParameterInput: (
			parameterName: string,
			content: string,
			opts?: { parseSpecialCharSequences: boolean; delay?: number },
		) => {
			this.getters.parameterInput(parameterName).type(content, opts);
		},
		selectOptionInParameterDropdown: (parameterName: string, content: string) => {
			getVisibleSelect().find('.option-headline').contains(content).click();
		},
		rename: (newName: string) => {
			this.getters.nodeNameContainer().click();
			this.getters.nodeRenameInput().should('be.visible').type('{selectall}').type(newName);
			cy.get('body').type('{enter}');
		},
		executePrevious: () => {
			this.getters.executePrevious().click({ force: true });
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
			getVisibleSelect().find('.el-select-dropdown__item').contains(runName).click();
		},
		changeOutputRunSelector: (runName: string) => {
			this.getters.outputRunSelector().click();
			getVisibleSelect().find('.el-select-dropdown__item').contains(runName).click();
		},
		toggleOutputRunLinking: () => {
			this.getters.outputLinkRun().click();
		},
		toggleInputRunLinking: () => {
			this.getters.inputLinkRun().click();
		},
		switchOutputBranch: (name: string) => {
			this.getters.outputBranches().get('span').contains(name).click();
		},
		switchInputBranch: (name: string) => {
			this.getters.inputBranches().get('span').contains(name).click();
		},
		setRLCValue: (paramName: string, value: string) => {
			this.getters.resourceLocatorModeSelector(paramName).click();
			getVisibleSelect().find('li').last().click();
			this.getters.resourceLocatorInput(paramName).type(value);
		},
		validateExpressionPreview: (paramName: string, value: string) => {
			this.getters
				.parameterExpressionPreview(paramName)
				.find('span')
				.should('include.html', asEncodedHTML(value));
		},
		refreshResourceMapperColumns: () => {
			this.getters.resourceMapperSelectColumn().realHover();
			this.getters
				.resourceMapperSelectColumn()
				.findChildByTestId('action-toggle')
				.should('have.length', 1)
				.click();

			getVisiblePopper().find('li').last().click();
		},
		addFilterCondition: (paramName: string) => {
			this.getters.filterConditionAdd(paramName).click({ force: true });
		},
		removeFilterCondition: (paramName: string, index: number) => {
			this.getters.filterConditionRemove(paramName, index).click();
		},
		removeAssignment: (paramName: string, index: number) => {
			this.getters.assignmentRemove(paramName, index).click();
		},
		setInvalidExpression: ({
			fieldName,
			invalidExpression,
			delay,
		}: {
			fieldName: string;
			invalidExpression?: string;
			delay?: number;
		}) => {
			this.actions.typeIntoParameterInput(fieldName, '=');
			this.actions.typeIntoParameterInput(fieldName, invalidExpression ?? "{{ $('unknown')", {
				parseSpecialCharSequences: false,
				delay,
			});
			this.actions.validateExpressionPreview(fieldName, `node doesn't exist`);
		},
		openSettings: () => {
			this.getters.nodeSettingsTab().click();
		},

		openCodeEditorFullscreen: () => {
			this.getters.codeEditorFullscreenButton().click({ force: true });
		},
		changeNodeOperation: (operation: string) => {
			this.getters.parameterInput('operation').click();
			cy.get('.el-select-dropdown__item')
				.contains(new RegExp(`^${operation}$`))
				.click({ force: true });
			this.getters.parameterInput('operation').find('input').should('have.value', operation);
		},
		expressionSelectItem: (index: number) => {
			this.getters.inlineExpressionEditorItemInput().type(`{selectall}${index}`);
		},
		expressionSelectNextItem: () => {
			this.getters.inlineExpressionEditorItemNextButton().click();
		},
		expressionSelectPrevItem: () => {
			this.getters.inlineExpressionEditorItemPrevButton().click();
		},
	};
}

function asEncodedHTML(str: string): string {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/ /g, '&nbsp;');
}
