import { WorkflowPage } from '../pages';
import { ROUTES } from '../constants';
import { getManualChatModal } from './modals/chat-modal';

/**
 * Types
 */

export type EndpointType =
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

export function getAddInputEndpointByType(nodeName: string, endpointType: EndpointType) {
	return cy.get(
		`.add-input-endpoint[data-jtk-scope-${endpointType}][data-endpoint-name="${nodeName}"]`,
	);
}

export function getNodeCreatorItems() {
	return cy.getByTestId('item-iterator-item');
}

export function getExecuteWorkflowButton() {
	return cy.getByTestId('execute-workflow-button');
}

export function getManualChatButton() {
	return cy.getByTestId('workflow-chat-button');
}

export function getNodes() {
	return cy.getByTestId('canvas-node');
}

export function getNodeByName(name: string) {
	return cy.getByTestId('canvas-node').filter(`[data-name="${name}"]`).eq(0);
}

export function getConnectionBySourceAndTarget(source: string, target: string) {
	return cy
		.get('.jtk-connector')
		.filter(`[data-source-node="${source}"][data-target-node="${target}"]`)
		.eq(0);
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
	new WorkflowPage().actions.addNodeToCanvas(
		nodeDisplayName,
		plusButtonClick,
		preventNdvClose,
		action,
	);
}

export function navigateToNewWorkflowPage(preventNodeViewUnload = true) {
	cy.visit(ROUTES.NEW_WORKFLOW_PAGE);
	cy.waitForLoad();
	cy.window().then((win) => {
		win.preventNodeViewBeforeUnload = preventNodeViewUnload;
	});
}

export function addSupplementalNodeToParent(
	nodeName: string,
	endpointType: EndpointType,
	parentNodeName: string,
) {
	getAddInputEndpointByType(parentNodeName, endpointType).click({ force: true });
	getNodeCreatorItems().contains(nodeName).click();
	getConnectionBySourceAndTarget(parentNodeName, nodeName).should('exist');
}

export function addLanguageModelNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_languageModel', parentNodeName);
}

export function addMemoryNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_memory', parentNodeName);
}

export function addToolNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_tool', parentNodeName);
}

export function addOutputParserNodeToParent(nodeName: string, parentNodeName: string) {
	addSupplementalNodeToParent(nodeName, 'ai_outputParser', parentNodeName);
}

export function clickExecuteWorkflowButton() {
	getExecuteWorkflowButton().click();
}

export function clickManualChatButton() {
	getManualChatButton().click();
	getManualChatModal().should('be.visible');
}

export function openNode(nodeName: string) {
	getNodeByName(nodeName).dblclick();
}
