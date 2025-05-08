/**
 * Getters
 */

export const getExecutionsSidebar = () => cy.getByTestId('executions-sidebar');

export const getWorkflowExecutionPreviewIframe = () => cy.getByTestId('workflow-preview-iframe');

export const getExecutionPreviewBody = () =>
	getWorkflowExecutionPreviewIframe()
		.its('0.contentDocument.body')
		.should((body) => {
			expect(body.querySelector('[data-test-id="canvas-wrapper"]')).to.exist;
		})
		.then((el) => cy.wrap(el));

export const getExecutionPreviewBodyNodes = () =>
	getExecutionPreviewBody().findChildByTestId('canvas-node');

export const getExecutionPreviewBodyNodesByName = (name: string) =>
	getExecutionPreviewBody().findChildByTestId('canvas-node').filter(`[data-name="${name}"]`).eq(0);

export function getExecutionPreviewOutputPanelRelatedExecutionLink() {
	return getExecutionPreviewBody().findChildByTestId('related-execution-link');
}

export function getLogsOverviewStatus() {
	return getExecutionPreviewBody().findChildByTestId('logs-overview-status');
}

export function getLogEntries() {
	return getExecutionPreviewBody().findChildByTestId('logs-overview-body').find('[role=treeitem]');
}

export function getManualChatMessages() {
	return getExecutionPreviewBody().find('.chat-messages-list .chat-message');
}

/**
 * Actions
 */

export const openExecutionPreviewNode = (name: string) =>
	getExecutionPreviewBodyNodesByName(name).dblclick();

export const toggleAutoRefresh = () => cy.getByTestId('auto-refresh-checkbox').click();
