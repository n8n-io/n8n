/**
 * Getters
 */

export const getExecutionsSidebar = () => cy.getByTestId('executions-sidebar');

export const getWorkflowExecutionPreviewIframe = () => cy.getByTestId('workflow-preview-iframe');

export const getExecutionPreviewBody = () =>
	getWorkflowExecutionPreviewIframe()
		.its('0.contentDocument.body')
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

/**
 * Actions
 */

export function openExecutions() {
	cy.getByTestId('radio-button-executions').click();
}

export const openExecutionPreviewNode = (name: string) =>
	getExecutionPreviewBodyNodesByName(name).dblclick();
