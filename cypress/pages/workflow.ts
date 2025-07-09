import { BasePage } from './base';
import { NodeCreator } from './features/node-creator';
import { clickContextMenuAction, getCanvasPane, openContextMenu } from '../composables/workflow';
import { META_KEY } from '../constants';
import type { OpenContextMenuOptions } from '../types';
import { getVisibleSelect } from '../utils';
import { getUniqueWorkflowName } from '../utils/workflowUtils';

const nodeCreator = new NodeCreator();

/**
 * @deprecated Use functional composables from @composables instead.
 * If a composable doesn't exist for your use case, please create a new one in:
 * cypress/composables
 *
 * This class-based approach is being phased out in favor of more modular functional composables.
 * Each getter and action in this class should be moved to individual composable functions.
 */
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
		tagPills: () =>
			cy.get('[data-test-id="workflow-tags-container"] span.el-tag:not(.count-container)'),
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
			if (type === 'input') {
				return `[data-test-id="canvas-node-input-handle"][data-node-name="${nodeName}"][data-index="${index}"]`;
			}
			if (type === 'output') {
				return `[data-test-id="canvas-node-output-handle"][data-node-name="${nodeName}"][data-index="${index}"]`;
			}
			return `[data-test-id="canvas-node-output-handle"][data-node-name="${nodeName}"][data-index="${index}"] [data-test-id="canvas-handle-plus"]`;
		},
		canvasNodeInputEndpointByName: (nodeName: string, index = 0) => {
			return cy.get(this.getters.getEndpointSelector('input', nodeName, index));
		},
		canvasNodeOutputEndpointByName: (nodeName: string, index = 0) => {
			return cy.get(this.getters.getEndpointSelector('output', nodeName, index));
		},
		canvasNodePlusEndpointByName: (nodeName: string, index = 0) => {
			return cy
				.get(
					`[data-test-id="canvas-node-output-handle"][data-node-name="${nodeName}"] [data-test-id="canvas-handle-plus"]`,
				)
				.eq(index);
		},
		activatorSwitch: () => cy.getByTestId('workflow-activate-switch'),
		workflowMenu: () => cy.getByTestId('workflow-menu'),
		firstStepButton: () => cy.getByTestId('canvas-add-button'),
		isWorkflowSaved: () => this.getters.saveButton().should('match', 'span'), // In Element UI, disabled button turn into spans 🤷‍♂️
		isWorkflowActivated: () => this.getters.activatorSwitch().should('have.class', 'is-checked'),
		isWorkflowDeactivated: () =>
			this.getters.activatorSwitch().should('not.have.class', 'is-checked'),
		expressionModalInput: () => cy.getByTestId('expression-modal-input').find('[role=textbox]'),
		expressionModalOutput: () => cy.getByTestId('expression-modal-output'),

		nodeViewRoot: () => this.getters.nodeView(),
		copyPasteInput: () => cy.getByTestId('hidden-copy-paste'),
		nodeConnections: () => cy.getByTestId('edge'),
		zoomToFitButton: () => cy.getByTestId('zoom-to-fit'),
		nodeEndpoints: () => cy.get('.jtk-endpoint-connected'),
		disabledNodes: () => cy.get('[data-canvas-node-render-type][class*="disabled"]'),
		selectedNodes: () => this.getters.canvasNodes().parent().filter('.selected'),
		// Workflow menu items
		workflowMenuItemDuplicate: () => cy.getByTestId('workflow-menu-item-duplicate'),
		workflowMenuItemDownload: () => cy.getByTestId('workflow-menu-item-download'),
		workflowMenuItemImportFromURLItem: () => cy.getByTestId('workflow-menu-item-import-from-url'),
		workflowMenuItemImportFromFile: () => cy.getByTestId('workflow-menu-item-import-from-file'),
		workflowMenuItemSettings: () => cy.getByTestId('workflow-menu-item-settings'),
		workflowMenuItemDelete: () => cy.getByTestId('workflow-menu-item-delete'),
		workflowMenuItemArchive: () => cy.getByTestId('workflow-menu-item-archive'),
		workflowMenuItemUnarchive: () => cy.getByTestId('workflow-menu-item-unarchive'),
		workflowMenuItemGitPush: () => cy.getByTestId('workflow-menu-item-push'),
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

		archivedTag: () => cy.getByTestId('workflow-archived-tag'),
		shareButton: () => cy.getByTestId('workflow-share-button'),

		duplicateWorkflowModal: () => cy.getByTestId('duplicate-modal'),
		nodeViewBackground: () => cy.getByTestId('canvas'),
		nodeView: () => cy.get('[data-test-id="canvas-wrapper"]'),
		canvasViewport: () => cy.get('.vue-flow__transformationpane.vue-flow__container'),
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
				`[data-test-id="edge"][data-source-node-name="${sourceNodeName}"][data-target-node-name="${targetNodeName}"]`,
			),
		getConnectionActionsBetweenNodes: (sourceNodeName: string, targetNodeName: string) =>
			cy.get(
				`[data-test-id="edge-label"][data-source-node-name="${sourceNodeName}"][data-target-node-name="${targetNodeName}"] [data-test-id="canvas-edge-toolbar"]`,
			),
		addStickyButton: () => cy.getByTestId('add-sticky-button'),
		stickies: () => cy.getByTestId('sticky'),
		editorTabButton: () => cy.getByTestId('radio-button-workflow'),
		workflowHistoryButton: () => cy.getByTestId('workflow-history-button'),
		colors: () => cy.getByTestId('color'),
		contextMenuAction: (action: string) => cy.getByTestId(`context-menu-item-${action}`),
		getNodeLeftPosition: (element: JQuery<HTMLElement>) => {
			return parseFloat(element.parent().css('transform').split(',')[4]);
		},
		getNodeTopPosition: (element: JQuery<HTMLElement>) => {
			return parseFloat(element.parent().css('transform').split(',')[5]);
		},
		inputURLImportWorkflowFromURL: () => cy.getByTestId('workflow-url-import-input'),
		cancelActionImportWorkflowFromURL: () => cy.getByTestId('cancel-workflow-import-url-button'),
		confirmActionImportWorkflowFromURL: () => cy.getByTestId('confirm-workflow-import-url-button'),
		confirmModal: () => cy.get('div[role=dialog][aria-modal=true]'),
	};

	actions = {
		visit: (preventNodeViewUnload = true, appDate?: number) => {
			cy.visit(this.url);
			if (appDate) {
				cy.setAppDate(appDate);
			}
			cy.waitForLoad();
			cy.window().then((win) => {
				win.preventNodeViewBeforeUnload = preventNodeViewUnload;
			});
		},
		addInitialNodeToCanvas: (
			nodeDisplayName: string,
			opts?: { keepNdvOpen?: boolean; action?: string; isTrigger?: boolean },
		) => {
			this.getters.canvasPlusButton().click();
			this.getters.nodeCreatorSearchBar().type(nodeDisplayName);
			this.getters.nodeCreatorSearchBar().type('{enter}');
			if (opts?.action) {
				const itemId = opts.isTrigger ? 'Triggers' : 'Actions';
				// Expand actions category if it's collapsed
				nodeCreator.getters
					.getCategoryItem(itemId)
					.parent()
					.then(($el) => {
						if ($el.attr('data-category-collapsed') === 'true') {
							nodeCreator.getters.getCategoryItem(itemId).click();
						}
					});
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
			cy.get('body').then((body) => {
				if (body.find('[data-test-id=node-creator]').length > 0) {
					if (action) {
						cy.get('[data-keyboard-nav-type="action"]').contains(action).click();
					} else {
						// Select the first action
						if (body.find('[data-keyboard-nav-type="action"]').length > 0) {
							cy.get('[data-keyboard-nav-type="action"]').eq(0).click();
						}
					}
				}
			});

			if (!preventNdvClose) cy.get('body').type('{esc}');
		},
		openContextMenu: (
			nodeTypeName?: string,
			{ method = 'right-click', anchor = 'center' }: OpenContextMenuOptions = {},
		) => {
			openContextMenu(nodeTypeName, { method, anchor });
		},
		openNode: (nodeTypeName: string) => {
			this.getters.canvasNodeByName(nodeTypeName).first().dblclick();
		},
		duplicateNode: (nodeTypeName: string) => {
			this.actions.openContextMenu(nodeTypeName);
			clickContextMenuAction('duplicate');
		},
		deleteNodeFromContextMenu: (nodeTypeName: string, options?: OpenContextMenuOptions) => {
			this.actions.openContextMenu(nodeTypeName, options);
			clickContextMenuAction('delete');
		},
		executeNode: (nodeTypeName: string, options?: OpenContextMenuOptions) => {
			this.actions.openContextMenu(nodeTypeName, options);
			clickContextMenuAction('execute');
		},
		addStickyFromContextMenu: () => {
			this.actions.openContextMenu();
			clickContextMenuAction('add_sticky');
		},
		renameNode: (nodeTypeName: string) => {
			this.actions.openContextMenu(nodeTypeName);
			clickContextMenuAction('rename');
		},
		copyNode: (nodeTypeName: string) => {
			this.actions.openContextMenu(nodeTypeName);
			clickContextMenuAction('copy');
		},
		contextMenuAction: (action: string) => {
			this.getters.contextMenuAction(action).click();
		},
		disableNode: (nodeTypeName: string) => {
			this.actions.openContextMenu(nodeTypeName);
			clickContextMenuAction('toggle_activation');
		},
		pinNode: (nodeTypeName: string) => {
			this.actions.openContextMenu(nodeTypeName);
			clickContextMenuAction('toggle_pin');
		},
		openNodeFromContextMenu: (nodeTypeName: string) => {
			this.actions.openContextMenu(nodeTypeName, { method: 'overflow-button' });
			clickContextMenuAction('open');
		},
		selectAllFromContextMenu: () => {
			this.actions.openContextMenu();
			clickContextMenuAction('select_all');
		},
		deselectAll: () => {
			getCanvasPane().click('topLeft');
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
			cy.url().should('not.have.string', '/new');
		},
		saveWorkflowUsingKeyboardShortcut: () => {
			cy.intercept('POST', '/rest/workflows').as('createWorkflow');
			this.actions.hitSaveWorkflow();
		},
		deleteNode: (name: string) => {
			this.getters.canvasNodeByName(name).first().click();
			cy.get('body').type('{del}');
		},
		setWorkflowName: (name: string) => {
			this.getters.workflowNameInput().parent().click();
			this.getters.workflowNameInput().should('be.enabled');
			this.getters.workflowNameInput().clear().type(name).type('{enter}');
		},
		clickWorkflowActivator: () => {
			this.getters.activatorSwitch().find('input').first().should('be.enabled');
			this.getters.activatorSwitch().click();
		},
		activateWorkflow: () => {
			cy.intercept('PATCH', '/rest/workflows/*').as('activateWorkflow');
			this.actions.clickWorkflowActivator();
			cy.wait('@activateWorkflow');
			cy.get('body').type('{esc}');
		},
		renameWorkflow: (newName: string) => {
			this.getters.workflowNameInputContainer().click();
			cy.get('body').type('{selectall}');
			cy.get('body').type(newName);
			cy.get('body').type('{enter}');
		},
		renameWithUniqueName: () => {
			this.actions.renameWorkflow(getUniqueWorkflowName());
		},
		addTags: (tags: string | string[]) => {
			if (!Array.isArray(tags)) tags = [tags];

			tags.forEach((tag) => {
				this.getters.workflowTagsInput().type(tag);
				this.getters.workflowTagsInput().type('{enter}');
			});
			// For a brief moment the Element UI tag component shows the tags as(+X) string
			// so we need to wait for it to disappear
			this.getters.workflowTagsContainer().should('not.contain', `+${tags.length}`);
		},
		zoomToFit: () => {
			cy.getByTestId('zoom-to-fit').click();
		},
		pinchToZoom: (steps: number, mode: 'zoomIn' | 'zoomOut' = 'zoomIn') => {
			cy.window().then((win) => {
				// Pinch-to-zoom simulates a 'wheel' event with ctrlKey: true (same as zooming by scrolling)
				getCanvasPane().trigger('wheel', {
					force: true,
					bubbles: true,
					ctrlKey: true,
					pageX: win.innerWidth / 2,
					pageY: win.innerHeight / 2,
					deltaMode: 1,
					deltaY: mode === 'zoomOut' ? steps : -steps,
				});
			});
		},
		/** Certain keyboard shortcuts are not possible on Cypress via a simple `.type`, and some delays are needed to emulate these events */
		hitComboShortcut: (modifier: string, key: string) => {
			cy.get('body').wait(100).type(modifier, { delay: 100, release: false }).type(key);
		},
		hitUndo: () => {
			this.actions.hitComboShortcut(`{${META_KEY}}`, 'z');
		},
		hitRedo: () => {
			cy.get('body').type(`{${META_KEY}+shift+z}`);
		},
		hitSelectAll: () => {
			this.actions.hitComboShortcut(`{${META_KEY}}`, 'a');
		},
		hitDeleteAllNodes: () => {
			this.actions.hitSelectAll();
			cy.get('body').type('{backspace}');
		},
		hitDisableNodeShortcut: () => {
			cy.get('body').type('d');
		},
		hitCopy: () => {
			this.actions.hitComboShortcut(`{${META_KEY}}`, 'c');
		},
		hitPinNodeShortcut: () => {
			cy.get('body').type('p');
		},
		hitSaveWorkflow: () => {
			cy.get('body').type(`{${META_KEY}+s}`);
		},
		hitExecuteWorkflow: () => {
			cy.get('body').type(`{${META_KEY}+enter}`);
		},
		hitDuplicateNode: () => {
			cy.get('body').type(`{${META_KEY}+d}`);
		},
		hitAddSticky: () => {
			cy.get('body').type('{shift+S}');
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
			const connectionsBetweenNodes = () =>
				this.getters.getConnectionActionsBetweenNodes(sourceNodeName, targetNodeName);
			connectionsBetweenNodes()
				.get('[data-test-id="add-connection-button"]')
				.first()
				.click({ force: true });

			this.actions.addNodeToCanvas(newNodeName, false, false, action);
		},
		deleteNodeBetweenNodes: (sourceNodeName: string, targetNodeName: string) => {
			this.getters.getConnectionBetweenNodes(sourceNodeName, targetNodeName).first().realHover();
			const connectionsBetweenNodes = () =>
				this.getters.getConnectionActionsBetweenNodes(sourceNodeName, targetNodeName);
			connectionsBetweenNodes()
				.get('[data-test-id="delete-connection-button"]')
				.first()
				.click({ force: true });
		},
		addSticky: () => {
			this.getters.addStickyButton().click();
		},
		deleteSticky: () => {
			this.getters.stickies().eq(0).realHover().find('[data-test-id="delete-sticky"]').click();
		},
		toggleColorPalette: () => {
			this.getters
				.stickies()
				.eq(0)
				.realHover()
				.find('[data-test-id="change-sticky-color"]')
				.click({ force: true });
		},
		pickColor: () => {
			this.getters.colors().eq(1).click();
		},
		editSticky: (content: string) => {
			this.getters.stickies().dblclick().find('textarea').clear().type(content).type('{esc}');
		},
		clearSticky: () => {
			this.getters.stickies().dblclick().find('textarea').clear().type('{esc}');
		},
		shouldHaveWorkflowName: (name: string) => {
			this.getters.workflowNameInputContainer().invoke('attr', 'title').should('include', name);
		},
		testLassoSelection: (from: [number, number], to: [number, number]) => {
			cy.getByTestId('node-view-wrapper').trigger('mousedown', from[0], from[1], { force: true });
			cy.getByTestId('node-view-wrapper').trigger('mousemove', to[0], to[1], { force: true });
			cy.get('#select-box').should('be.visible');
			cy.getByTestId('node-view-wrapper').trigger('mouseup', to[0], to[1], { force: true });
			cy.get('#select-box').should('not.be.visible');
		},
		getNodePosition: (node: Cypress.Chainable<JQuery<HTMLElement>>) => {
			return node.then(($el) => ({
				left: +$el[0].style.left.replace('px', ''),
				top: +$el[0].style.top.replace('px', ''),
			}));
		},
		acceptConfirmModal: () => {
			this.getters.confirmModal().should('be.visible');
			cy.get('button.btn--confirm').should('be.visible').click();
		},
	};
}
