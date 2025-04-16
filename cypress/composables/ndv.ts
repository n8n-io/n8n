/**
 * Getters
 */

import { getVisiblePopper, getVisibleSelect } from '../utils/popper';

export function getNdvContainer() {
	return cy.getByTestId('ndv');
}

export function getCredentialSelect(eq = 0) {
	return cy.getByTestId('node-credentials-select').eq(eq);
}

export function getCreateNewCredentialOption() {
	return cy.getByTestId('node-credentials-select-item-new');
}

export function getBackToCanvasButton() {
	return cy.getByTestId('back-to-canvas');
}

export function getExecuteNodeButton() {
	return cy.getByTestId('node-execute-button');
}

export function getParameterInputByName(name: string) {
	return cy.getByTestId(`parameter-input-${name}`);
}

export function getInputPanel() {
	return cy.getByTestId('ndv-input-panel');
}

export function getMainPanel() {
	return cy.getByTestId('node-parameters');
}

export function getOutputPanel() {
	return cy.getByTestId('output-panel');
}

export function getFixedCollection(collectionName: string) {
	return cy.getByTestId(`fixed-collection-${collectionName}`);
}

export function getResourceLocator(paramName: string) {
	return cy.getByTestId(`resource-locator-${paramName}`);
}

export function getResourceLocatorInput(paramName: string) {
	return getResourceLocator(paramName).find('[data-test-id="rlc-input-container"]');
}

export function getInputPanelDataContainer() {
	return getInputPanel().getByTestId('ndv-data-container');
}

export function getOutputPanelDataContainer() {
	return getOutputPanel().getByTestId('ndv-data-container');
}

export function getOutputTableRows() {
	return getOutputPanelDataContainer().find('table tr');
}

export function getOutputTableRow(row: number) {
	return getOutputTableRows().eq(row);
}

export function getOutputTableHeaders() {
	return getOutputPanelDataContainer().find('table thead th');
}

export function getOutputTableHeaderByText(text: string) {
	return getOutputTableHeaders().contains(text);
}

export function getOutputTbodyCell(row: number, col: number) {
	return getOutputTableRows().eq(row).find('td').eq(col);
}

export function getOutputRunSelector() {
	return getOutputPanel().findChildByTestId('run-selector');
}

export function getOutputRunSelectorInput() {
	return getOutputRunSelector().find('input');
}

export function getOutputPanelTable() {
	return getOutputPanelDataContainer().get('table');
}

export function getRunDataInfoCallout() {
	return cy.getByTestId('run-data-callout');
}

export function getOutputPanelItemsCount() {
	return getOutputPanel().getByTestId('ndv-items-count');
}

export function getOutputPanelRelatedExecutionLink() {
	return getOutputPanel().getByTestId('related-execution-link');
}

export function getNodeOutputHint() {
	return cy.getByTestId('ndv-output-run-node-hint');
}

export function getWorkflowCards() {
	return cy.getByTestId('resources-list-item-workflow');
}

export function getWorkflowCard(workflowName: string) {
	return getWorkflowCards()
		.contains(workflowName)
		.parents('[data-test-id="resources-list-item-workflow"]');
}

export function getWorkflowCardContent(workflowName: string) {
	return getWorkflowCard(workflowName).findChildByTestId('card-content');
}

export function getNodeRunInfoStale() {
	return cy.getByTestId('node-run-info-stale');
}

export function getNodeOutputErrorMessage() {
	return getOutputPanel().findChildByTestId('node-error-message');
}

export function getParameterExpressionPreviewValue() {
	return cy.getByTestId('parameter-expression-preview-value');
}

/**
 * Actions
 */

export function openCredentialSelect(eq = 0) {
	getCredentialSelect(eq).click();
}

export function setCredentialByName(name: string) {
	openCredentialSelect();
	getCredentialSelect().contains(name).click();
}

export function clickCreateNewCredential() {
	openCredentialSelect();
	getCreateNewCredentialOption().click({ force: true });
}

export function clickGetBackToCanvas() {
	getBackToCanvasButton().click();
}

export function clickExecuteNode() {
	getExecuteNodeButton().click();
}

export function clickResourceLocatorInput(paramName: string) {
	getResourceLocatorInput(paramName).click();
}

export function setParameterInputByName(name: string, value: string) {
	getParameterInputByName(name).clear().type(value);
}

export function checkParameterCheckboxInputByName(name: string) {
	getParameterInputByName(name).find('input[type="checkbox"]').check({ force: true });
}

export function uncheckParameterCheckboxInputByName(name: string) {
	getParameterInputByName(name).find('input[type="checkbox"]').uncheck({ force: true });
}

export function setParameterSelectByContent(name: string, content: string) {
	getParameterInputByName(name).realClick();
	getVisibleSelect().find('.option-headline').contains(content).click();
}

export function changeOutputRunSelector(runName: string) {
	getOutputRunSelector().click();
	getVisibleSelect().find('.el-select-dropdown__item').contains(runName).click();
}

export function addItemToFixedCollection(collectionName: string) {
	getFixedCollection(collectionName).getByTestId('fixed-collection-add').click();
}

export function typeIntoFixedCollectionItem(collectionName: string, index: number, value: string) {
	getFixedCollection(collectionName).within(() =>
		cy.getByTestId('parameter-input').eq(index).type(value),
	);
}

export function selectResourceLocatorItem(
	resourceLocator: string,
	index: number,
	expectedText: string,
) {
	clickResourceLocatorInput(resourceLocator);

	getVisiblePopper().findChildByTestId('rlc-item').eq(0).should('exist');
	getVisiblePopper()
		.findChildByTestId('rlc-item')
		.eq(index)
		.find('span')
		.should('contain.text', expectedText)
		.click();
}

export function clickWorkflowCardContent(workflowName: string) {
	getWorkflowCardContent(workflowName).click();
}

export function clickAssignmentCollectionAdd() {
	cy.getByTestId('assignment-collection-drop-area').click();
}

export function assertNodeOutputHintExists() {
	getNodeOutputHint().should('exist');
}

export function assertNodeOutputErrorMessageExists() {
	return getNodeOutputErrorMessage().should('exist');
}

// Note that this only validates the expectedContent is *included* in the output table
export function assertOutputTableContent(expectedContent: unknown[][]) {
	for (const [i, row] of expectedContent.entries()) {
		for (const [j, value] of row.entries()) {
			// + 1 to skip header
			getOutputTbodyCell(1 + i, j).should('have.text', value);
		}
	}
}

export function populateMapperFields(fields: ReadonlyArray<[string, string]>) {
	for (const [name, value] of fields) {
		getParameterInputByName(name).type(value);

		// Click on a parent to dismiss the pop up which hides the field below.
		getParameterInputByName(name).parent().parent().parent().parent().click('topLeft');
	}
}

/**
 * Populate multiValue fixedCollections. Only supports fixedCollections for which all fields can be defined via keyboard typing
 *
 * @param items - 2D array of items to populate, i.e. [["myField1", "String"], ["myField2", "Number"]]
 * @param collectionName - name of the fixedCollection to populate
 * @param offset - amount of 'parameter-input's before start, e.g. from a controlling dropdown that makes the fields appear
 * @returns
 */
export function populateFixedCollection<T extends readonly string[]>(
	items: readonly T[],
	collectionName: string,
	offset: number = 0,
) {
	if (items.length === 0) return;
	const n = items[0].length;
	for (const [i, params] of items.entries()) {
		addItemToFixedCollection(collectionName);
		for (const [j, param] of params.entries()) {
			getFixedCollection(collectionName)
				.getByTestId('parameter-input')
				.eq(offset + i * n + j)
				.type(`${param}{downArrow}{enter}`);
		}
	}
}

export function assertInlineExpressionValid() {
	cy.getByTestId('inline-expression-editor-input').find('.cm-valid-resolvable').should('exist');
}

export function hoverInputItemByText(text: string) {
	return getInputPanelDataContainer().contains(text).trigger('mouseover', { force: true });
}

export function verifyInputHoverState(expectedText: string) {
	getInputPanelDataContainer()
		.find('[data-test-id="hovering-item"]')
		.should('be.visible')
		.should('have.text', expectedText);
}

export function verifyOutputHoverState(expectedText: string) {
	getOutputPanelDataContainer()
		.find('[data-test-id="hovering-item"]')
		.should('be.visible')
		.should('have.text', expectedText);
}

export function resetHoverState() {
	getBackToCanvasButton().trigger('mouseover');
}
