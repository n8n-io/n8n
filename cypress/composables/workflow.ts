import { getManualChatModal } from './modals/chat-modal';
import { clickGetBackToCanvas, getParameterInputByName } from './ndv';
import { ROUTES } from '../constants';
import type { OpenContextMenuOptions } from '../types';

/**
 * Types
 */

export type EndpointType =
	| 'main'
	| 'ai_chain'
	| 'ai_document'
	| 'ai_embedding'
	| 'ai_languageModel'
	| 'ai_memory'
	| 'ai_outputParser'
	| 'ai_tool'
	| 'ai_retriever'
	| 'ai_textSplitter'
	| 'ai_vectorRetriever'
	| 'ai_vectorStore';

/**
 * Getters
 */

export function executeWorkflowAndWait() {
	cy.get('[data-test-id="execute-workflow-button"]').click();
	cy.contains('Workflow executed successfully', { timeout: 4000 }).should('be.visible');
	cy.contains('Workflow executed successfully', { timeout: 10000 }).should('not.exist');
}

export function getCanvas() {
	return cy.getByTestId('canvas');
}

export function getCanvasPane() {
	return cy.ifCanvasVersion(
		() => cy.getByTestId('node-view-background'),
		() => getCanvas().find('.vue-flow__pane'),
	);
}

export function getContextMenu() {
	return cy.getByTestId('context-menu').find('.el-dropdown-menu');
}

export function getContextMenuAction(action: string) {
	return cy.getByTestId(`context-menu-item-${action}`);
}

export function getInputPlusHandle(nodeName: string) {
	return cy.ifCanvasVersion(
		() => cy.get(`.add-input-endpoint[data-endpoint-name="${nodeName}"]`),
		() =>
			cy.get(
				`[data-test-id="canvas-node-input-handle"][data-node-name="${nodeName}"] [data-test-id="canvas-handle-plus"]`,
			),
	);
}

export function getInputPlusHandleByType(nodeName: string, endpointType: EndpointType) {
	return cy.ifCanvasVersion(
		() =>
			cy.get(
				`.add-input-endpoint[data-jtk-scope-${endpointType}][data-endpoint-name="${nodeName}"]`,
			),
		() =>
			cy.get(
				`[data-test-id="canvas-node-input-handle"][data-connection-type="${endpointType}"][data-node-name="${nodeName}"] [data-test-id="canvas-handle-plus"]`,
			),
	);
}

export function getOutputHandle(nodeName: string) {
	return cy.ifCanvasVersion(
		() => cy.get(`.add-output-endpoint[data-endpoint-name="${nodeName}"]`),
		() => cy.get(`[data-test-id="canvas-node-output-handle"][data-node-name="${nodeName}"]`),
	);
}

export function getOutputPlusHandle(nodeName: string) {
	return cy.ifCanvasVersion(
		() => cy.get(`.add-output-endpoint[data-endpoint-name="${nodeName}"]`),
		() =>
			cy.get(
				`[data-test-id="canvas-node-output-handle"][data-node-name="${nodeName}"] [data-test-id="canvas-handle-plus"]`,
			),
	);
}

export function getOutputPlusHandleByType(nodeName: string, endpointType: EndpointType) {
	return cy.ifCanvasVersion(
		() =>
			cy.get(
				`.add-output-endpoint[data-jtk-scope-${endpointType}][data-endpoint-name="${nodeName}"]`,
			),
		() =>
			cy.get(
				`[data-test-id="canvas-node-output-handle"][data-connection-type="${endpointType}"][data-node-name="${nodeName}"] [data-test-id="canvas-handle-plus"]`,
			),
	);
}

export function getNodeCreatorItems() {
	return cy.getByTestId('item-iterator-item');
}

export function getExecuteWorkflowButton(triggerNodeName?: string) {
	return cy.getByTestId(`execute-workflow-button${triggerNodeName ? `-${triggerNodeName}` : ''}`);
}

export function getManualChatButton() {
	return cy.getByTestId('workflow-chat-button');
}

export function getNodes() {
	return cy.getByTestId('canvas-node');
}

export function getNodeByName(name: string) {
	return cy.ifCanvasVersion(
		() => cy.getByTestId('canvas-node').filter(`[data-name="${name}"]`).eq(0),
		() => cy.getByTestId('canvas-node').filter(`[data-node-name="${name}"]`).eq(0),
	);
}

export function getNodeRenderedTypeByName(name: string) {
	return cy.ifCanvasVersion(
		() => getNodeByName(name),
		() => getNodeByName(name).find('[data-canvas-node-render-type]'),
	);
}

export function getWorkflowHistoryCloseButton() {
	return cy.getByTestId('workflow-history-close-button');
}

export function disableNode(name: string) {
	const target = getNodeByName(name);
	target.rightclick(name ? 'center' : 'topLeft', { force: true });
	cy.getByTestId('context-menu-item-toggle_activation').click();
}

export function getConnectionBySourceAndTarget(source: string, target: string) {
	return cy.ifCanvasVersion(
		() =>
			cy
				.get('.jtk-connector')
				.filter(`[data-source-node="${source}"][data-target-node="${target}"]`)
				.eq(0),
		() =>
			cy
				.getByTestId('edge')
				.filter(`[data-source-node-name="${source}"][data-target-node-name="${target}"]`)
				.eq(0),
	);
}

export function getConnectionLabelBySourceAndTarget(source: string, target: string) {
	return cy
		.getByTestId('edge-label')
		.filter(`[data-source-node-name="${source}"][data-target-node-name="${target}"]`);
}

export function getNodeCreatorSearchBar() {
	return cy.getByTestId('node-creator-search-bar');
}

export function getNodeCreatorPlusButton() {
	return cy.getByTestId('node-creator-plus-button');
}

export function getCanvasNodes() {
	return cy.getByTestId('canvas-node');
}

export function getCanvasNodeByName(nodeName: string) {
	return getCanvasNodes().filter(`:contains(${nodeName})`);
}

export function getSaveButton() {
	return cy.getByTestId('workflow-save-button');
}

export function getZoomToFitButton() {
	return cy.getByTestId('zoom-to-fit');
}

export function getNodeIssuesByName(nodeName: string) {
	return getCanvasNodes()
		.filter(`:contains(${nodeName})`)
		.should('have.length.greaterThan', 0)
		.findChildByTestId('node-issues');
}

/**
 * Actions
 */

export function addNodeToCanvas(
	nodeDisplayName: string,
	plusButtonClick = true,
	preventNdvClose?: boolean,
	action?: string,
) {
	if (plusButtonClick) {
		getNodeCreatorPlusButton().click();
	}

	getNodeCreatorSearchBar().type(nodeDisplayName);
	getNodeCreatorSearchBar().type('{enter}');
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
}

export function navigateToNewWorkflowPage(preventNodeViewUnload = true) {
	cy.visit(ROUTES.NEW_WORKFLOW_PAGE);
	cy.waitForLoad();
	cy.window().then((win) => {
		win.preventNodeViewBeforeUnload = preventNodeViewUnload;
	});
}

function connectNodeToParent(
	nodeName: string,
	endpointType: EndpointType,
	parentNodeName: string,
	exactMatch = false,
) {
	getInputPlusHandleByType(parentNodeName, endpointType).click({ force: true });
	if (exactMatch) {
		getNodeCreatorItems()
			.contains(new RegExp('^' + nodeName + '$', 'g'))
			.click();
	} else {
		getNodeCreatorItems().contains(nodeName).click();
	}
}

export function addSupplementalNodeToParent(
	nodeName: string,
	endpointType: EndpointType,
	parentNodeName: string,
	exactMatch = false,
) {
	connectNodeToParent(nodeName, endpointType, parentNodeName, exactMatch);

	cy.ifCanvasVersion(
		() => {
			getConnectionBySourceAndTarget(parentNodeName, nodeName).should('exist');
		},
		() => {
			if (endpointType === 'main') {
				getConnectionBySourceAndTarget(parentNodeName, nodeName).should('exist');
			} else {
				getConnectionBySourceAndTarget(nodeName, parentNodeName).should('exist');
			}
		},
	);
}

export function addLanguageModelNodeToParent(
	nodeName: string,
	parentNodeName: string,
	exactMatch = false,
) {
	addSupplementalNodeToParent(nodeName, 'ai_languageModel', parentNodeName, exactMatch);
}

export function addMemoryNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_memory', parentNodeName);
}

export function addToolNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_tool', parentNodeName);
}

export function addVectorStoreToolToParent(nodeName: string, parentNodeName: string) {
	connectNodeToParent(nodeName, 'ai_tool', parentNodeName, false);
	getParameterInputByName('mode')
		.find('input')
		.should('have.value', 'Retrieve Documents (As Tool for AI Agent)');
	clickGetBackToCanvas();
	getConnectionBySourceAndTarget(nodeName, parentNodeName).should('exist');
}

export function addOutputParserNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_outputParser', parentNodeName);
}
export function addVectorStoreNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_vectorStore', parentNodeName);
}
export function addRetrieverNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_retriever', parentNodeName);
}

export function clickExecuteWorkflowButton(triggerNodeName?: string) {
	getExecuteWorkflowButton(triggerNodeName).click();
}

export function clickManualChatButton() {
	getManualChatButton().click();
	getManualChatModal().should('be.visible');
}

export function openNode(nodeName: string) {
	getNodeByName(nodeName).dblclick();
}

export function saveWorkflowOnButtonClick() {
	cy.intercept('POST', '/rest/workflows').as('createWorkflow');
	getSaveButton().should('contain', 'Save');
	getSaveButton().click();
	getSaveButton().should('contain', 'Saved');
	cy.url().should('not.have.string', '/new');
}

export function pasteWorkflow(workflow: object) {
	cy.get('body').paste(JSON.stringify(workflow));
}

export function clickZoomToFit() {
	getZoomToFitButton().click();
}

export function deleteNode(name: string) {
	getCanvasNodeByName(name).first().click();
	cy.get('body').type('{del}');
}

export function openContextMenu(
	nodeName?: string,
	{ method = 'right-click', anchor = 'center' }: OpenContextMenuOptions = {},
) {
	let target;
	if (nodeName) {
		target =
			method === 'right-click' ? getNodeRenderedTypeByName(nodeName) : getNodeByName(nodeName);
	} else {
		target = getCanvasPane();
	}

	if (method === 'right-click') {
		target.rightclick(nodeName ? anchor : 'topLeft', { force: true });
	} else {
		target.realHover();
		target.find('[data-test-id="overflow-node-button"]').click({ force: true });
	}

	cy.ifCanvasVersion(
		() => {},
		() => {
			getContextMenu().should('be.visible');
		},
	);
}

export function clickContextMenuAction(action: string) {
	getContextMenuAction(action).click({ force: true });
}
