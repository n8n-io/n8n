/**
 * Accessors
 */

export function getLogEntryAtRow(rowIndex: number) {
	return cy.getByTestId('logs-overview-body').find('[role=treeitem]').eq(rowIndex);
}

export function getInputTableRows() {
	return cy.getByTestId('log-details-input').find('table tr');
}

export function getInputTbodyCell(row: number, col: number) {
	return cy.getByTestId('log-details-input').find('table tr').eq(row).find('td').eq(col);
}

/**
 * Actions
 */

export function openLogsPanel() {
	cy.getByTestId('logs-overview-header').click();
}

export function clickLogEntryAtRow(rowIndex: number) {
	getLogEntryAtRow(rowIndex).click();
}

export function toggleInputPanel() {
	cy.getByTestId('log-details-header').contains('Input').click();
}

export function clickOpenNdvAtRow(rowIndex: number) {
	getLogEntryAtRow(rowIndex).realHover();
	getLogEntryAtRow(rowIndex).find('[aria-label="Open..."]').click();
}

export function setInputDisplayMode(mode: 'table') {
	cy.getByTestId('log-details-input').realHover();
	cy.getByTestId('log-details-input').findChildByTestId(`radio-button-${mode}`).click();
}
