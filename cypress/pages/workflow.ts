import { BasePage } from './base';

export class WorkflowPage extends BasePage {
	url = '/workflow/new';
	getters = {
		workflowNameInputContainer: () => cy.getByTestId('workflow-name-input', { timeout: 5000 }),
		workflowNameInput: () => this.getters.workflowNameInputContainer().then(($el) => cy.wrap($el.find('input'))),
		workflowImportInput: () => cy.getByTestId('workflow-import-input'),
		workflowTags: () => cy.getByTestId('workflow-tags'),
		workflowTagsContainer: () => cy.getByTestId('workflow-tags-container'),
		workflowTagsInput: () => this.getters.workflowTagsContainer().then(($el) => cy.wrap($el.find('input').first())),
		workflowTagElements: () => cy.get('[data-test-id="workflow-tags-container"] span.tags > span'),
		firstWorkflowTagElement: () => cy.get('[data-test-id="workflow-tags-container"] span.tags > span:nth-child(1)'),
		workflowTagsDropdown: () => cy.getByTestId('workflow-tags-dropdown'),
		newTagLink: () => cy.getByTestId('new-tag-link'),
		saveButton: () => cy.getByTestId('workflow-save-button'),
		nodeCreatorSearchBar: () => cy.getByTestId('node-creator-search-bar'),
		nodeCreatorPlusButton: () => cy.getByTestId('node-creator-plus-button'),
		canvasPlusButton: () => cy.getByTestId('canvas-plus-button'),
		canvasNodes: () => cy.getByTestId('canvas-node'),
		canvasNodeByName: (nodeName: string) => this.getters.canvasNodes().filter(`:contains("${nodeName}")`),
		ndvParameterInput: (parameterName: string) =>
			cy.getByTestId(`parameter-input-${parameterName}`),
		ndvOutputPanel: () => cy.getByTestId('output-panel'),
		ndvRunDataPaneHeader: () => cy.getByTestId('run-data-pane-header'),
		successToast: () => cy.get('.el-notification__title'),
		activatorSwitch: () => cy.getByTestId('workflow-activate-switch'),
		workflowMenu: () => cy.getByTestId('workflow-menu'),
		firstStepButton: () => cy.getByTestId('canvas-add-button'),
		isWorkflowSaved: () => this.getters.saveButton().should('match', 'span'), // In Element UI, disabled button turn into spans 🤷‍♂️
		isWorkflowActivated: () => this.getters.activatorSwitch().should('have.class', 'is-checked'),
		expressionModalInput: () => cy.getByTestId('expression-modal-input'),
		expressionModalOutput: () => cy.getByTestId('expression-modal-output'),

		nodeViewRoot: () => cy.getByTestId('node-view-root'),
		copyPasteInput: () => cy.getByTestId('hidden-copy-paste'),
		nodeConnections: () => cy.get('.jtk-connector'),
		zoomToFitButton: () => cy.getByTestId('zoom-to-fit'),
		nodeEndpoints: () => cy.get('.jtk-endpoint-connected'),
		disabledNodes: () => cy.get('.node-box.disabled'),
		nodeNameContainerNDV: () => cy.getByTestId('node-title-container'),
		nodeRenameInput: () => cy.getByTestId('node-rename-input'),
	};
	actions = {
		visit: () => {
			cy.visit(this.url);
			cy.waitForLoad();
		},
		addInitialNodeToCanvas: (nodeDisplayName: string) => {
			this.getters.canvasPlusButton().click();
			this.getters.nodeCreatorSearchBar().type(nodeDisplayName);
			this.getters.nodeCreatorSearchBar().type('{enter}');
			cy.get('body').type('{esc}');
		},
		addNodeToCanvas: (nodeDisplayName: string) => {
			this.getters.nodeCreatorPlusButton().click();
			this.getters.nodeCreatorSearchBar().type(nodeDisplayName);
			this.getters.nodeCreatorSearchBar().type('{enter}');
			cy.get('body').type('{esc}');
		},
		openNodeNdv: (nodeTypeName: string) => {
			this.getters.canvasNodeByName(nodeTypeName).dblclick();
		},
		openExpressionEditor: () => {
			cy.get('input[value="expression"]').parent('label').click();
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
			this.getters.workflowNameInputContainer().click();
			cy.get('body').type('{selectall}');
			cy.get('body').type(newName);
			cy.get('body').type('{enter}');
		},
		addTags: (tags: string[]) => {
			tags.forEach(tag => {
				this.getters.workflowTagsInput().type(tag);
				this.getters.workflowTagsInput().type('{enter}');
			});
			cy.get('body').type('{enter}');
			// For a brief moment the Element UI tag component shows the tags as(+X) string
			// so we need to wait for it to disappear
			this.getters.workflowTagsContainer().should('not.contain', `+${tags.length}`);
		},
		zoomToFit: () => {
			cy.getByTestId('zoom-to-fit').click();
		},
		hitUndo: () => {
			const metaKey = Cypress.platform === 'darwin' ? '{meta}' : '{ctrl}';
			cy.get('body').type(metaKey, { delay: 500, release: false }).type('z');
		},
		hitRedo: () => {
			const metaKey = Cypress.platform === 'darwin' ? '{meta}' : '{ctrl}';
			cy.get('body').
			type(metaKey, { delay: 500, release: false }).
			type('{shift}', { release: false }).
			type('z');
		},
		selectAll: () => {
			const metaKey = Cypress.platform === 'darwin' ? '{meta}' : '{ctrl}';
			cy.get('body').type(metaKey, { delay: 500, release: false }).type('a');
		},
		hitDisableNodeShortcut: () => {
			const metaKey = Cypress.platform === 'darwin' ? '{meta}' : '{ctrl}';
			cy.get('body').type(metaKey, { delay: 500, release: false }).type('d');
		},
	};
}
