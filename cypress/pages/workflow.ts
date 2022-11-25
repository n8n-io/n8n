import { BasePage } from './base';

export class WorkflowPage extends BasePage {
	url = '/workflow/new';
	getters = {
		workflowNameInput: () => cy.getByTestId('workflow-name-input'),
		workflowImportInput: () => cy.getByTestId('workflow-import-input'),
		workflowTags: () => cy.getByTestId('workflow-tags'),
		saveButton: () => cy.getByTestId('workflow-save-button'),

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
		activatorSwitch: () => cy.getByTestId('workflow-activate-switch'),
		workflowMenu: () => cy.getByTestId('workflow-menu'),
		firstStepButton: () => cy.getByTestId('canvas-add-button'),
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
		executeNodeFromNdv: () => {
			cy.contains('Execute node').click();
		},
		visit: () => {
			cy.visit(this.url);
			cy.getByTestId('node-view-loader', { timeout: 5000 }).should('not.exist');
			cy.get('.el-loading-mask', { timeout: 5000 }).should('not.exist');
		},
		openWorkflowMenu: () => {
			this.getters.workflowMenu().click();
		},
		saveWorkflowOnButtonClick: () => {
			this.getters.saveButton().click();
		},
		saveWorkflowUsingKeyboardShortcut: () => {
			cy.get('body').type('{meta}', { release: false }).type('s');
		},
		activateWorkflow: () => {
			this.getters.activatorSwitch().find('input').first().should('be.enabled');
			this.getters.activatorSwitch().click();
			cy.get('body').type('{esc}');
		},
		renameWorkflow: (newName: string) => {
			this.getters.workflowNameInput().click();
			cy.get('body').type('{selectall}');
			cy.get('body').type(newName);
			cy.get('body').type('{enter}');
		},
	};
}
