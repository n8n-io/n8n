import { BasePage } from './base';

import Chainable = Cypress.Chainable;

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
export class VariablesPage extends BasePage {
	url = '/variables';

	getters = {
		unavailableResourcesList: () => cy.getByTestId('unavailable-resources-list'),
		emptyResourcesList: () => cy.getByTestId('empty-resources-list'),
		resourcesList: () => cy.getByTestId('resources-list'),
		goToUpgrade: () => cy.getByTestId('go-to-upgrade'),
		actionBox: () => cy.getByTestId('action-box'),
		emptyResourcesListNewVariableButton: () => this.getters.emptyResourcesList().find('button'),
		searchBar: () => cy.getByTestId('resources-list-search'),
		createVariableButton: () => cy.getByTestId('resources-list-add'),
		variablesRows: () => cy.getByTestId('variables-row'),
		variablesEditableRows: () =>
			cy.getByTestId('variables-row').filter((_, row) => !!row.querySelector('input')),
		variableRow: (key: string) =>
			this.getters.variablesRows().contains(key).parents('[data-test-id="variables-row"]'),
		editableRowCancelButton: (row: Chainable<JQuery<HTMLElement>>) =>
			row.getByTestId('variable-row-cancel-button'),
		editableRowSaveButton: (row: Chainable<JQuery<HTMLElement>>) =>
			row.getByTestId('variable-row-save-button'),
	};

	actions = {
		createVariable: (key: string, value: string) => {
			this.getters.createVariableButton().click();

			const editingRow = this.getters.variablesEditableRows().eq(0);
			this.actions.setRowValue(editingRow, 'key', key);
			this.actions.setRowValue(editingRow, 'value', value);
			this.actions.saveRowEditing(editingRow);
		},
		deleteVariable: (key: string) => {
			const row = this.getters.variableRow(key);
			row.within(() => {
				cy.getByTestId('variable-row-delete-button').should('not.be.disabled').click();
			});

			const modal = cy.get('[role="dialog"]');
			modal.should('be.visible');
			modal.get('.btn--confirm').click();
		},
		createVariableFromEmptyState: (key: string, value: string) => {
			this.getters.emptyResourcesListNewVariableButton().click();

			const editingRow = this.getters.variablesEditableRows().eq(0);
			this.actions.setRowValue(editingRow, 'key', key);
			this.actions.setRowValue(editingRow, 'value', value);
			this.actions.saveRowEditing(editingRow);
		},
		editRow: (key: string) => {
			const row = this.getters.variableRow(key);
			row.within(() => {
				cy.getByTestId('variable-row-edit-button').should('not.be.disabled').click();
			});
		},
		setRowValue: (row: Chainable<JQuery<HTMLElement>>, field: 'key' | 'value', value: string) => {
			row.within(() => {
				cy.getByTestId(`variable-row-${field}-input`)
					.find('input, textarea')
					.type('{selectAll}{del}')
					.type(value);
			});
		},
		cancelRowEditing: (row: Chainable<JQuery<HTMLElement>>) => {
			this.getters.editableRowCancelButton(row).click();
		},
		saveRowEditing: (row: Chainable<JQuery<HTMLElement>>) => {
			this.getters.editableRowSaveButton(row).click();
		},
	};
}
