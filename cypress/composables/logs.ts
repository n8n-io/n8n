/**
 * Accessors
 */

export function getOverviewStatus() {
	return cy.getByTestId('logs-overview-status');
}

export function getLogEntries() {
	return cy.getByTestId('logs-overview-body').find('[role=treeitem]');
}

export function getSelectedLogEntry() {
	return cy.getByTestId('logs-overview-body').find('[role=treeitem][aria-selected=true]');
}

export function getInputTableRows() {
	return cy.getByTestId('log-details-input').find('table tr');
}

export function getInputTbodyCell(row: number, col: number) {
	return cy.getByTestId('log-details-input').find('table tr').eq(row).find('td').eq(col);
}

export function getNodeErrorMessageHeader() {
	return cy.getByTestId('log-details-output').findChildByTestId('node-error-message');
}

/**
 * Actions
 */

export function openLogsPanel() {
	cy.getByTestId('logs-overview-header').click();
}

export function pressClearExecutionButton() {
	cy.getByTestId('logs-overview-header').find('button').contains('Clear execution').click();
}

export function clickLogEntryAtRow(rowIndex: number) {
	getLogEntries().eq(rowIndex).click();
}

export function toggleInputPanel() {
	cy.getByTestId('log-details-header').contains('Input').click();
}

export function clickOpenNdvAtRow(rowIndex: number) {
	getLogEntries().eq(rowIndex).realHover();
	getLogEntries().eq(rowIndex).find('[aria-label="Open..."]').click();
}

export function clickTriggerPartialExecutionAtRow(rowIndex: number) {
	getLogEntries().eq(rowIndex).realHover();
	getLogEntries().eq(rowIndex).find('[aria-label="Test step"]').click();
}

export function setInputDisplayMode(mode: 'table') {
	cy.getByTestId('log-details-input').realHover();
	cy.getByTestId('log-details-input').findChildByTestId(`radio-button-${mode}`).click();
}
