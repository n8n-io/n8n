import { META_KEY } from '../constants';
import { BasePage } from './base';
import { getVisibleSelect } from '../utils';
import { NodeCreator } from './features/node-creator';

const nodeCreator = new NodeCreator();
export class WorkflowPage extends BasePage {
	url = '/workflow/new';
	getters = {
		workflowNameInputContainer: () => cy.getByTestId('workflow-name-input', { timeout: 5000 }),
		workflowNameInput: () =>
			this.getters.workflowNameInputContainer().then(($el) => cy.wrap($el.find('input'))),
		workflowImportInput: () => cy.getByTestId('workflow-import-input'),
		workflowTags: () => cy.getByTestId('workflow-tags'),
		workflowTagsContainer: () => cy.getByTestId('workflow-tags-container'),
		workflowTagsInput: () =>
			this.getters.workflowTagsContainer().then(($el) => cy.wrap($el.find('input').first())),
		tagPills: () => cy.get('[data-test-id="workflow-tags-container"] span.el-tag'),
		nthTagPill: (n: number) =>
			cy.get(`[data-test-id="workflow-tags-container"] span.el-tag:nth-child(${n})`),
		tagsDropdown: () => cy.getByTestId('workflow-tags-dropdown'),
		tagsInDropdown: () => getVisibleSelect().find('li').filter('.tag'),
		createTagButton: () => cy.getByTestId('new-tag-link'),
		saveButton: () => cy.getByTestId('workflow-save-button'),
		nodeCreatorSearchBar: () => cy.getByTestId('node-creator-search-bar'),
		nodeCreatorPlusButton: () => cy.getByTestId('node-creator-plus-button'),
		canvasPlusButton: () => cy.getByTestId('canvas-plus-button'),
		canvasNodes: () => cy.getByTestId('canvas-node'),
		canvasNodeByName: (nodeName: string) =>
			this.getters.canvasNodes().filter(`:contains(${nodeName})`),
		nodeIssuesByName: (nodeName: string) =>
			this.getters
				.canvasNodes()
				.filter(`:contains(${nodeName})`)
				.should('have.length.greaterThan', 0)
				.findChildByTestId('node-issues'),
		getEndpointSelector: (type: 'input' | 'output' | 'plus', nodeName: string, index = 0) => {
			return `[data-endpoint-name='${nodeName}'][data-endpoint-type='${type}'][data-input-index='${index}']`;
		},
		canvasNodeInputEndpointByName: (nodeName: string, index = 0) => {
			return cy.get(this.getters.getEndpointSelector('input', nodeName, index));
		},
		canvasNodeOutputEndpointByName: (nodeName: string, index = 0) => {
			return cy.get(this.getters.getEndpointSelector('output', nodeName, index));
		},
		canvasNodePlusEndpointByName: (nodeName: string, index = 0) => {
			return cy.get(this.getters.getEndpointSelector('plus', nodeName, index));
		},
		successToast: () => cy.get('.el-notification .el-notification--success').parent(),
		errorToast: () => cy.get('.el-notification .el-notification--error'),
		activatorSwitch: () => cy.getByTestId('workflow-activate-switch'),
		workflowMenu: () => cy.getByTestId('workflow-menu'),
		firstStepButton: () => cy.getByTestId('canvas-add-button'),
		isWorkflowSaved: () => this.getters.saveButton().should('match', 'span'), // In Element UI, disabled button turn into spans 🤷‍♂️
		isWorkflowActivated: () => this.getters.activatorSwitch().should('have.class', 'is-checked'),
		expressionModalInput: () => cy.getByTestId('expression-modal-input').find('[role=textbox]'),
		expressionModalOutput: () => cy.getByTestId('expression-modal-output'),

		nodeViewRoot: () => cy.getByTestId('node-view-root'),
		copyPasteInput: () => cy.getByTestId('hidden-copy-paste'),
		nodeConnections: () => cy.get('.jtk-connector'),
		zoomToFitButton: () => cy.getByTestId('zoom-to-fit'),
		nodeEndpoints: () => cy.get('.jtk-endpoint-connected'),
		disabledNodes: () => cy.get('.node-box.disabled'),
		selectedNodes: () => this.getters.canvasNodes().filter('.jtk-drag-selected'),
		// Workflow menu items
		workflowMenuItemDuplicate: () => cy.getByTestId('workflow-menu-item-duplicate'),
		workflowMenuItemDownload: () => cy.getByTestId('workflow-menu-item-download'),
		workflowMenuItemImportFromURLItem: () => cy.getByTestId('workflow-menu-item-import-from-url'),
		workflowMenuItemImportFromFile: () => cy.getByTestId('workflow-menu-item-import-from-file'),
		workflowMenuItemSettings: () => cy.getByTestId('workflow-menu-item-settings'),
		workflowMenuItemDelete: () => cy.getByTestId('workflow-menu-item-delete'),
		// Workflow settings dialog elements
		workflowSettingsModal: () => cy.getByTestId('workflow-settings-dialog'),
		workflowSettingsErrorWorkflowSelect: () => cy.getByTestId('workflow-settings-error-workflow'),
		workflowSettingsTimezoneSelect: () => cy.getByTestId('workflow-settings-timezone'),
		workflowSettingsSaveFiledExecutionsSelect: () =>
			cy.getByTestId('workflow-settings-save-failed-executions'),
		workflowSettingsSaveSuccessExecutionsSelect: () =>
			cy.getByTestId('workflow-settings-save-success-executions'),
		workflowSettingsSaveManualExecutionsSelect: () =>
			cy.getByTestId('workflow-settings-save-manual-executions'),
		workflowSettingsSaveExecutionProgressSelect: () =>
			cy.getByTestId('workflow-settings-save-execution-progress'),
		workflowSettingsTimeoutWorkflowSwitch: () =>
			cy.getByTestId('workflow-settings-timeout-workflow'),
		workflowSettingsTimeoutForm: () => cy.getByTestId('workflow-settings-timeout-form'),
		workflowSettingsSaveButton: () =>
			cy.getByTestId('workflow-settings-save-button').find('button'),

		shareButton: () => cy.getByTestId('workflow-share-button'),

		duplicateWorkflowModal: () => cy.getByTestId('duplicate-modal'),
		nodeViewBackground: () => cy.getByTestId('node-view-background'),
		nodeView: () => cy.getByTestId('node-view'),
		inlineExpressionEditorInput: () =>
			cy.getByTestId('inline-expression-editor-input').find('[role=textbox]'),
		inlineExpressionEditorOutput: () => cy.getByTestId('inline-expression-editor-output'),
		zoomInButton: () => cy.getByTestId('zoom-in-button'),
		zoomOutButton: () => cy.getByTestId('zoom-out-button'),
		resetZoomButton: () => cy.getByTestId('reset-zoom-button'),
		executeWorkflowButton: () => cy.getByTestId('execute-workflow-button'),
		clearExecutionDataButton: () => cy.getByTestId('clear-execution-data-button'),
		stopExecutionButton: () => cy.getByTestId('stop-execution-button'),
		stopExecutionWaitingForWebhookButton: () =>
			cy.getByTestId('stop-execution-waiting-for-webhook-button'),
		nodeCredentialsSelect: () => cy.getByTestId('node-credentials-select'),
		nodeCredentialsCreateOption: () => cy.getByTestId('node-credentials-select-item-new'),
		nodeCredentialsEditButton: () => cy.getByTestId('credential-edit-button'),
		nodeCreatorItems: () => cy.getByTestId('item-iterator-item'),
		nodeCreatorNodeItems: () => cy.getByTestId('node-creator-node-item'),
		nodeCreatorActionItems: () => cy.getByTestId('node-creator-action-item'),
		nodeCreatorCategoryItems: () => cy.getByTestId('node-creator-category-item'),
		ndvParameters: () => cy.getByTestId('parameter-item'),
		nodeCredentialsLabel: () => cy.getByTestId('credentials-label'),
		getConnectionBetweenNodes: (sourceNodeName: string, targetNodeName: string) =>
			cy.get(
				`.jtk-connector[data-source-node="${sourceNodeName}"][data-target-node="${targetNodeName}"]`,
			),
		getConnectionActionsBetweenNodes: (sourceNodeName: string, targetNodeName: string) =>
			cy.get(
				`.connection-actions[data-source-node="${sourceNodeName}"][data-target-node="${targetNodeName}"]`,
			),
		addStickyButton: () => cy.getByTestId('add-sticky-button'),
		stickies: () => cy.getByTestId('sticky'),
		editorTabButton: () => cy.getByTestId('radio-button-workflow'),
	};
	actions = {
		visit: (preventNodeViewUnload = true) => {
			cy.visit(this.url);
			cy.waitForLoad();
			cy.window().then((win) => {
				// @ts-ignore
				win.preventNodeViewBeforeUnload = preventNodeViewUnload;
			});
		},
		addInitialNodeToCanvas: (
			nodeDisplayName: string,
			opts?: { keepNdvOpen?: boolean; action?: string },
		) => {
			this.getters.canvasPlusButton().click();
			this.getters.nodeCreatorSearchBar().type(nodeDisplayName);
			this.getters.nodeCreatorSearchBar().type('{enter}');
			if (opts?.action) {
				nodeCreator.getters.getCreatorItem(opts.action).click();
			} else if (!opts?.keepNdvOpen) {
				cy.get('body').type('{esc}');
			}
		},
		addNodeToCanvas: (
			nodeDisplayName: string,
			plusButtonClick = true,
			preventNdvClose?: boolean,
			action?: string,
		) => {
			if (plusButtonClick) {
				this.getters.nodeCreatorPlusButton().click();
			}

			this.getters.nodeCreatorSearchBar().type(nodeDisplayName);
			this.getters.nodeCreatorSearchBar().type('{enter}');
			cy.wait(500);
			cy.get('body').then((body) => {
				if (body.find('[data-test-id=node-creator]').length > 0) {
					if (action) {
						cy.contains(action).click();
					} else {
						// Select the first action
						cy.get('[data-keyboard-nav-type="action"]').eq(0).click();
					}
				}
			});

			if (!preventNdvClose) cy.get('body').type('{esc}');
		},
		openNode: (nodeTypeName: string) => {
			this.getters.canvasNodeByName(nodeTypeName).first().dblclick();
		},
		openExpressionEditorModal: () => {
			cy.contains('Expression').invoke('show').click();
			cy.getByTestId('expander').invoke('show').click();
		},
		openTagManagerModal: () => {
			this.getters.createTagButton().click();
			this.getters.tagsDropdown().click();
			getVisibleSelect().find('li.manage-tags').first().click();
		},
		openInlineExpressionEditor: () => {
			cy.contains('Expression').invoke('show').click();
			this.getters.inlineExpressionEditorInput().click();
		},
		openWorkflowMenu: () => {
			this.getters.workflowMenu().click();
		},
		openShareModal: () => {
			this.getters.shareButton().click();
		},
		saveWorkflowOnButtonClick: () => {
			cy.intercept('POST', '/rest/workflows').as('createWorkflow');
			this.getters.saveButton().should('contain', 'Save');
			this.getters.saveButton().click();
			this.getters.saveButton().should('contain', 'Saved');
		},
		saveWorkflowUsingKeyboardShortcut: () => {
			cy.intercept('POST', '/rest/workflows').as('createWorkflow');
			cy.get('body').type(META_KEY, { release: false }).type('s');
		},
		deleteNode: (name: string) => {
			this.getters.canvasNodeByName(name).first().click();
			cy.get('body').type('{del}');
		},
		setWorkflowName: (name: string) => {
			this.getters.workflowNameInput().should('be.disabled');
			this.getters.workflowNameInput().parent().click();
			this.getters.workflowNameInput().should('be.enabled');
			this.getters.workflowNameInput().clear().type(name).type('{enter}');
		},
		activateWorkflow: () => {
			cy.intercept('PATCH', '/rest/workflows/*').as('activateWorkflow');
			this.getters.activatorSwitch().find('input').first().should('be.enabled');
			this.getters.activatorSwitch().click();
			cy.wait('@activateWorkflow');
			cy.get('body').type('{esc}');
		},
		renameWorkflow: (newName: string) => {
			this.getters.workflowNameInputContainer().click();
			cy.get('body').type('{selectall}');
			cy.get('body').type(newName);
			cy.get('body').type('{enter}');
		},
		addTags: (tags: string | string[]) => {
			if (!Array.isArray(tags)) tags = [tags];

			tags.forEach((tag) => {
				this.getters.workflowTagsInput().type(tag);
				this.getters.workflowTagsInput().type('{enter}');
			});
			cy.realPress('Tab');
			// For a brief moment the Element UI tag component shows the tags as(+X) string
			// so we need to wait for it to disappear
			this.getters.workflowTagsContainer().should('not.contain', `+${tags.length}`);
		},
		zoomToFit: () => {
			cy.getByTestId('zoom-to-fit').click();
		},
		hitUndo: () => {
			cy.get('body').type(META_KEY, { delay: 500, release: false }).type('z');
		},
		hitRedo: () => {
			cy.get('body')
				.type(META_KEY, { delay: 500, release: false })
				.type('{shift}', { release: false })
				.type('z');
		},
		selectAll: () => {
			cy.get('body').type(META_KEY, { delay: 500, release: false }).type('a');
		},
		hitDisableNodeShortcut: () => {
			cy.get('body').type(META_KEY, { delay: 500, release: false }).type('d');
		},
		hitCopy: () => {
			cy.get('body').type(META_KEY, { delay: 500, release: false }).type('c');
		},
		hitPaste: () => {
			cy.get('body').type(META_KEY, { delay: 500, release: false }).type('P');
		},
		executeWorkflow: () => {
			this.getters.executeWorkflowButton().click();
		},
		addNodeBetweenNodes: (
			sourceNodeName: string,
			targetNodeName: string,
			newNodeName: string,
			action?: string,
		) => {
			this.getters.getConnectionBetweenNodes(sourceNodeName, targetNodeName).first().realHover();
			this.getters
				.getConnectionActionsBetweenNodes(sourceNodeName, targetNodeName)
				.find('.add')
				.first()
				.click({ force: true });

			this.actions.addNodeToCanvas(newNodeName, false, false, action);
		},
		deleteNodeBetweenNodes: (
			sourceNodeName: string,
			targetNodeName: string,
			newNodeName: string,
		) => {
			this.getters.getConnectionBetweenNodes(sourceNodeName, targetNodeName).first().realHover();
			this.getters
				.getConnectionActionsBetweenNodes(sourceNodeName, targetNodeName)
				.find('.delete')
				.first()
				.click({ force: true });
		},
		addSticky: () => {
			this.getters.nodeCreatorPlusButton().realHover();
			this.getters.addStickyButton().click();
		},
		deleteSticky: () => {
			this.getters.stickies().eq(0).realHover().find('[data-test-id="delete-sticky"]').click();
		},
		editSticky: (content: string) => {
			this.getters.stickies().dblclick().find('textarea').clear().type(content).type('{esc}');
		},
		shouldHaveWorkflowName: (name: string) => {
			this.getters
			.workflowNameInputContainer()
			.invoke('attr', 'title')
			.should('include', name);
		},
	};
}
