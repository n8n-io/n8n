import type { IWorkflowSettings } from 'n8n-workflow';

/**
 * True when the setting holds an n8n expression.
 *
 * Nothing ever evaluates it, so a stored `=…` string names no workflow and the
 * runtime ignores it. The editor's setting is a workflow picker and cannot
 * produce this; only a caller that writes settings directly (API, MCP) can.
 * Such callers should reject it rather than save a reference that names nothing.
 */
export function isExpressionErrorWorkflowId(
	errorWorkflow: IWorkflowSettings['errorWorkflow'],
): boolean {
	return typeof errorWorkflow === 'string' && errorWorkflow.startsWith('=');
}

/**
 * The workflow id `settings.errorWorkflow` actually points at, or undefined when
 * the setting names no concrete workflow: cleared (`DEFAULT`), or an expression.
 *
 * An expression yields undefined because there is no id to validate, NOT because
 * it is a usable value — see {@link isExpressionErrorWorkflowId}.
 */
export function staticErrorWorkflowId(
	errorWorkflow: IWorkflowSettings['errorWorkflow'],
): string | undefined {
	if (
		typeof errorWorkflow !== 'string' ||
		errorWorkflow === '' ||
		errorWorkflow === 'DEFAULT' ||
		isExpressionErrorWorkflowId(errorWorkflow)
	) {
		return undefined;
	}
	return errorWorkflow;
}
