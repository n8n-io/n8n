import type { INode, IWorkflowBase, IWorkflowSettings, WorkflowExecuteMode } from 'n8n-workflow';

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

/** The parts of a workflow that decide which error workflow handles its failure. */
export type ErrorWorkflowOwner = Pick<IWorkflowBase, 'id' | 'nodes' | 'settings'>;

/**
 * Which workflow handles a failure, by the v1 rules: `target` names it, `loop`
 * means the settings name the failed workflow itself during an error run, and
 * `none` means no error workflow applies.
 */
export type ErrorWorkflowTarget =
	| { kind: 'target'; workflowId: string }
	| { kind: 'loop' }
	| { kind: 'none' };

/**
 * The Error Trigger an error run starts from. v1 takes the last one it finds.
 * A disabled one is left out, because the engine v2 graph has no disabled nodes.
 */
export function findErrorTrigger(nodes: INode[], errorTriggerType: string): INode | undefined {
	return nodes.findLast((node) => node.type === errorTriggerType && node.disabled !== true);
}

/**
 * Picks the error workflow of a failed run. The settings come first. The own
 * Error Trigger applies only when the settings name no workflow and the failed
 * run is not itself an error run.
 */
export function findErrorWorkflowTarget(
	workflow: ErrorWorkflowOwner,
	isErrorRun: boolean,
	errorTriggerType: string,
): ErrorWorkflowTarget {
	const namedId = staticErrorWorkflowId(workflow.settings?.errorWorkflow);
	if (namedId !== undefined) {
		return isErrorRun && namedId === workflow.id
			? { kind: 'loop' }
			: { kind: 'target', workflowId: namedId };
	}

	if (!isErrorRun && findErrorTrigger(workflow.nodes, errorTriggerType) !== undefined) {
		return { kind: 'target', workflowId: workflow.id };
	}

	return { kind: 'none' };
}

/**
 * Whether a failure of a run of this workflow in this mode can start an error
 * workflow: the value of the engine flag `resolveErrorWorkflowOnFailure`. The
 * caller still applies the manual-run and suppression rules.
 */
export function resolvesErrorWorkflowOnFailure(
	workflow: ErrorWorkflowOwner,
	executionMode: WorkflowExecuteMode,
	errorTriggerType: string,
): boolean {
	return (
		findErrorWorkflowTarget(workflow, executionMode === 'error', errorTriggerType).kind === 'target'
	);
}
