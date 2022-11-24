import { BasePage } from './base';

export class WorkflowPage extends BasePage {
	url = '/workflow/new';
	getters = {
		workflowNameInput: () =>
			cy.getByTestId('workflow-name-input').then(($el) => cy.wrap($el.find('input'))),
		workflowImportInput: () => cy.getByTestId('workflow-import-input'),
		workflowTags: () => cy.getByTestId('workflow-tags'),
		saveButton: () => cy.getByTestId('save-button'),

		nodeCreator: {
			addNodeButton: () => cy.getByTestId('node-creator-add-node-button'),
			searchBar: () => cy.getByTestId('node-creator-search-bar'),
		},

		canvas: {
			addButton: () => cy.getByTestId('canvas-add-button'),
			nodeBox: (nodeTypeName: string) => cy.getByTestId(`canvas-node-box-${nodeTypeName}`),
		},

		ndv: {
			parameterInput: (parameterName: string) => cy.getByTestId(`parameter-input-${parameterName}`),
			executeNodeButton: () => cy.contains('Execute node'),
			outputPanel: () => cy.getByTestId('output-panel'),
		},
	};
}
