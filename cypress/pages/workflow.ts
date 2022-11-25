import { BasePage } from './base';

export class WorkflowPage extends BasePage {
	url = '/workflow/new';
	getters = {
		workflowNameInput: () =>
			cy
				.getByTestId('workflow-name-input', { timeout: 5000 })
				.then(($el) => cy.wrap($el.find('input'))),
		workflowImportInput: () => cy.getByTestId('workflow-import-input'),
		workflowTags: () => cy.getByTestId('workflow-tags'),
		saveButton: () => cy.getByTestId('save-button'),

		nodeCreatorSearchBar: () => cy.getByTestId('node-creator-search-bar'),
		nodeCreatorPlusButton: () => cy.getByTestId('node-creator-plus-button'),
		canvasPlusButton: () => cy.getByTestId('canvas-plus-button'),
		canvasNodeBox: (nodeDisplayName: string) => {
			return cy
				.getByTestId('canvas-node-box-title')
				.contains(nodeDisplayName)
				.parents('[data-test-id="canvas-node-box"]');
		},

		ndvParameterInput: (parameterName: string) =>
			cy.getByTestId(`parameter-input-${parameterName}`),
		ndvOutputPanel: () => cy.getByTestId('output-panel'),
		ndvRunDataPaneHeader: () => cy.getByTestId('run-data-pane-header'),

		successToast: () => cy.get('.el-notification__title'),
	};

	actions = {
		addInitialNodeToCanvas: (nodeDisplayName: string) => {
			this.getters.canvasPlusButton().click();
			this.getters.nodeCreatorSearchBar().type(nodeDisplayName);
			this.getters.nodeCreatorSearchBar().type('{enter}{esc}');
		},
		addNodeToCanvas: (nodeDisplayName: string) => {
			this.getters.nodeCreatorPlusButton().click();
			this.getters.nodeCreatorSearchBar().type(nodeDisplayName);
			this.getters.nodeCreatorSearchBar().type('{enter}{esc}');
		},
		openNodeNdv: (nodeTypeName: string) => {
			this.getters.canvasNodeBox(nodeTypeName).dblclick();
		},
		typeIntoParameterInput: (parameterName: string, content: string) => {
			this.getters.ndvParameterInput(parameterName).type(content);
		},
		selectOptionInParameterDropdown: (parameterName: string, content: string) => {
			this.getters
				.ndvParameterInput(parameterName)
				.find('.option-headline')
				.contains(content)
				.click();
		},
		executeNodeFromNdv: () => {
			cy.contains('Execute node').click();
		},
		visit: () => {
			cy.visit(this.url);
			cy.getByTestId('node-view-loader').should('not.exist');
			cy.get('.el-loading-mask').should('not.exist');
		},
	};
}
