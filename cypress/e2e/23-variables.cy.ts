import { VariablesPage } from '../pages/variables';
import { DEFAULT_USER_EMAIL, DEFAULT_USER_PASSWORD } from '../constants';
import { randFirstName, randLastName } from '@ngneat/falso';

const variablesPage = new VariablesPage();

const email = DEFAULT_USER_EMAIL;
const password = DEFAULT_USER_PASSWORD;
const firstName = randFirstName();
const lastName = randLastName();

describe('Variables', () => {
	before(() => {
		cy.setup({ email, firstName, lastName, password });
	});

	it('should show the unlicensed action box when the feature is disabled', () => {
		cy.disableFeature('feat:variables');
		cy.signin({ email, password });
		cy.visit(variablesPage.url);

		variablesPage.getters.unavailableResourcesList().should('be.visible');
		variablesPage.getters.resourcesList().should('not.exist');
	});

	describe('licensed', () => {
		before(() => {
			cy.enableFeature('feat:variables');
		});

		beforeEach(() => {
			cy.signin({ email, password });
			cy.intercept('GET', '/rest/variables').as('loadVariables');

			cy.visit(variablesPage.url);
			cy.wait(['@loadVariables', '@loadSettings']);
		});

		it('should show the licensed action box when the feature is enabled', () => {
			variablesPage.getters.emptyResourcesList().should('be.visible');
			variablesPage.getters.createVariableButton().should('be.visible');
		});

		it('should create a new variable using empty state row', () => {
			const key = 'ENV_VAR';
			const value = 'value';

			variablesPage.actions.createVariableFromEmptyState(key, value);
			variablesPage.getters.variableRow(key).should('contain', value).should('be.visible');
			variablesPage.getters.variablesRows().should('have.length', 1);
		});

		it('should create a new variable using pre-existing state', () => {
			const key = 'ENV_VAR_NEW';
			const value = 'value2';

			variablesPage.actions.createVariable(key, value);
			variablesPage.getters.variableRow(key).should('contain', value).should('be.visible');
			variablesPage.getters.variablesRows().should('have.length', 2);

			const otherKey = 'ENV_EXAMPLE';
			const otherValue = 'value3';

			variablesPage.actions.createVariable(otherKey, otherValue);
			variablesPage.getters
				.variableRow(otherKey)
				.should('contain', otherValue)
				.should('be.visible');
			variablesPage.getters.variablesRows().should('have.length', 3);
		});

		it('should get validation errors and cancel variable creation', () => {
			const key = 'ENV_VAR_NEW$';
			const value = 'value3';

			variablesPage.getters.createVariableButton().click();
			const editingRow = variablesPage.getters.variablesEditableRows().eq(0);
			variablesPage.actions.setRowValue(editingRow, 'key', key);
			variablesPage.actions.setRowValue(editingRow, 'value', value);
			editingRow.should('contain', 'This field may contain only letters');
			variablesPage.getters.editableRowSaveButton(editingRow).should('be.disabled');
			variablesPage.actions.cancelRowEditing(editingRow);

			variablesPage.getters.variablesRows().should('have.length', 3);
		});

		it('should edit a variable', () => {
			const key = 'ENV_VAR_NEW';
			const newValue = 'value4';

			variablesPage.actions.editRow(key);
			const editingRow = variablesPage.getters.variablesEditableRows().eq(0);
			variablesPage.actions.setRowValue(editingRow, 'value', newValue);
			variablesPage.actions.saveRowEditing(editingRow);

			variablesPage.getters.variableRow(key).should('contain', newValue).should('be.visible');
			variablesPage.getters.variablesRows().should('have.length', 3);
		});

		it('should delete a variable', () => {
			const key = 'TO_DELETE';
			const value = 'xxx';

			variablesPage.actions.createVariable(key, value);
			variablesPage.actions.deleteVariable(key);
		});

		it('should search for a variable', () => {
			// One Result
			variablesPage.getters.searchBar().type('NEW');
			variablesPage.getters.variablesRows().should('have.length', 1);
			variablesPage.getters.variableRow('NEW').should('contain.text', 'ENV_VAR_NEW');

			// Multiple Results
			variablesPage.getters.searchBar().clear().type('ENV_VAR');
			variablesPage.getters.variablesRows().should('have.length', 2);

			// All Results
			variablesPage.getters.searchBar().clear().type('ENV');
			variablesPage.getters.variablesRows().should('have.length', 3);

			// No Results
			variablesPage.getters.searchBar().clear().type('Some non-existent variable');
			variablesPage.getters.variablesRows().should('not.exist');

			cy.contains('No variables found').should('be.visible');
		});
	});
});
