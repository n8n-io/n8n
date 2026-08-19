import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interface';

export type WorkflowToolInputFieldDef = {
	name: string;
	type?: string;
};

/**
 * Read declared Execute Workflow Trigger input fields from a project workflow.
 * Returns an empty list for passthrough / non-execute-workflow triggers.
 */
export function listWorkflowToolInputFields(
	workflow: IWorkflowDb | undefined,
): WorkflowToolInputFieldDef[] {
	if (!workflow) return [];

	const trigger = (workflow.nodes ?? []).find(
		(node) => node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	);
	if (!trigger) return [];

	const params = trigger.parameters ?? {};
	const inputSource = (params.inputSource as string | undefined) ?? 'workflowInputs';

	if (inputSource === 'passthrough') return [];

	if (inputSource === 'jsonExample') {
		const jsonExample = params.jsonExample as string | undefined;
		if (!jsonExample) return [];
		let parsed: unknown;
		try {
			parsed = JSON.parse(jsonExample);
		} catch {
			return [];
		}
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return [];
		return Object.entries(parsed as Record<string, unknown>).map(([name, value]) => ({
			name,
			type: value === null ? 'any' : Array.isArray(value) ? 'array' : typeof value,
		}));
	}

	const workflowInputs = params.workflowInputs as
		| { values?: Array<{ name: string; type?: string }> }
		| undefined;

	return (workflowInputs?.values ?? []).filter(
		(field): field is WorkflowToolInputFieldDef =>
			typeof field.name === 'string' && field.name.length > 0,
	);
}
