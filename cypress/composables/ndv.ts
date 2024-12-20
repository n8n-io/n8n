/**
 * Getters
 */

import { getVisibleSelect } from '../utils';

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
	return cy.getByTestId('input-panel');
}

export function getMainPanel() {
	return cy.getByTestId('node-parameters');
}

export function getOutputPanel() {
	return cy.getByTestId('output-panel');
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

export function setParameterInputByName(name: string, value: string) {
	getParameterInputByName(name).clear().type(value);
}

export function toggleParameterCheckboxInputByName(name: string) {
	getParameterInputByName(name).find('input[type="checkbox"]').realClick();
}

export function setParameterSelectByContent(name: string, content: string) {
	getParameterInputByName(name).realClick();
	getVisibleSelect().find('.option-headline').contains(content).click();
}

export function changeOutputRunSelector(runName: string) {
	getOutputRunSelector().click();
	getVisibleSelect().find('.el-select-dropdown__item').contains(runName).click();
}
