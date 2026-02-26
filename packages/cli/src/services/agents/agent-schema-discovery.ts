import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, type INode } from 'n8n-workflow';

export interface WorkflowInputField {
	name: string;
	type: string;
}

export interface WorkflowSkill {
	workflowId: string;
	workflowName: string;
	inputs: WorkflowInputField[];
}

// Constants inlined from nodes-base to avoid cross-package import
const INPUT_SOURCE = 'inputSource';
const WORKFLOW_INPUTS = 'workflowInputs';
const VALUES = 'values';
const JSON_EXAMPLE = 'jsonExample';
const PASSTHROUGH = 'passthrough';

/**
 * Extract input schema from an Execute Workflow Trigger node's parameters.
 * Reads node.parameters directly — no UI context needed.
 *
 * For v1.1+ nodes, the default inputSource is 'workflowInputs' (not 'passthrough').
 * n8n may omit default parameter values from storage, so we must infer the correct
 * default based on the node's typeVersion.
 */
export function extractTriggerInputSchema(node: INode): WorkflowInputField[] {
	const params = node.parameters ?? {};
	// v1.1+ defaults to 'workflowInputs'; v1 has no inputSource param and is always passthrough
	const defaultSource = node.typeVersion >= 1.1 ? WORKFLOW_INPUTS : PASSTHROUGH;
	const inputSource = (params[INPUT_SOURCE] as string) ?? defaultSource;

	if (inputSource === PASSTHROUGH) return [];

	if (inputSource === WORKFLOW_INPUTS) {
		const container = params[WORKFLOW_INPUTS] as
			| { [key: string]: Array<{ name: string; type: string }> }
			| undefined;
		const fields = container?.[VALUES];
		if (!Array.isArray(fields)) return [];
		// n8n omits default values from storage; the node definition defaults type to 'string'
		return fields.filter((f) => f.name).map((f) => ({ name: f.name, type: f.type ?? 'string' }));
	}

	if (inputSource === JSON_EXAMPLE) {
		const jsonString = params[JSON_EXAMPLE] as string;
		if (!jsonString) return [];
		try {
			const example = JSON.parse(jsonString) as Record<string, unknown>;
			return Object.entries(example).map(([name, value]) => ({
				name,
				type: inferTypeFromValue(value),
			}));
		} catch {
			return [];
		}
	}

	return [];
}

function inferTypeFromValue(value: unknown): string {
	if (value === null || value === undefined) return 'any';
	if (Array.isArray(value)) return 'array';
	return typeof value; // 'string', 'number', 'boolean', 'object'
}

/**
 * Find Execute Workflow Trigger in a workflow's nodes and extract its input schema.
 * Returns null if the workflow has no typed trigger.
 */
export function discoverWorkflowSkill(
	workflowId: string,
	workflowName: string,
	nodes: INode[],
): WorkflowSkill | null {
	const triggerNode = nodes.find(
		(n) => n.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE && !n.disabled,
	);

	if (!triggerNode) return null;

	const inputs = extractTriggerInputSchema(triggerNode);
	if (inputs.length === 0) return null;

	return { workflowId, workflowName, inputs };
}
