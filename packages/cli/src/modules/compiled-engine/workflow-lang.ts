/**
 * Lazy access to `@n8n/workflow-lang`. The package loads the TypeScript
 * compiler, so n8n loads it only when a compiled workflow needs it.
 */
export type WorkflowLang = typeof import('@n8n/workflow-lang');

let loading: Promise<WorkflowLang> | undefined;

export async function loadWorkflowLang(): Promise<WorkflowLang> {
	loading ??= import('@n8n/workflow-lang');
	return await loading;
}
