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

export function getNodeCreatorSearchBar() {
	return cy.getByTestId('node-creator-search-bar');
}

export function getNodeCreatorPlusButton() {
	return cy.getByTestId('node-creator-plus-button');
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

export function addSupplementalNodeToParent(
	nodeName: string,
	endpointType: EndpointType,
	parentNodeName: string,
	exactMatch = false,
) {
	getAddInputEndpointByType(parentNodeName, endpointType).click({ force: true });
	if (exactMatch) {
		getNodeCreatorItems().contains(new RegExp("^" + nodeName + "$", "g")).click();
	} else {
		getNodeCreatorItems().contains(nodeName).click();
	}
	getConnectionBySourceAndTarget(parentNodeName, nodeName).should('exist');
}

export function addLanguageModelNodeToParent(nodeName: string, parentNodeName: string, exactMatch = false) {
	addSupplementalNodeToParent(nodeName, 'ai_languageModel', parentNodeName, exactMatch);
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
