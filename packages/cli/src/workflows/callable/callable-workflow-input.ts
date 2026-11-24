import {
	getWorkflowToolIncompatibilityReason,
	WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME,
	type SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
} from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { z } from 'zod';

import { CallableWorkflowUnavailableError } from './callable-workflow-unavailable.error';

/**
 * Map a supported trigger node type to the input-schema key the callable
 * builds against. Keys are sourced from `SUPPORTED_WORKFLOW_TOOL_TRIGGERS` in
 * `@n8n/api-types` so the backend compatibility check and the frontend
 * Available list can't drift.
 */
const SUPPORTED_TRIGGERS: Record<string, string> = {
	[EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE]: 'executeWorkflow',
};

// Compile-time check: `SUPPORTED_TRIGGERS` must cover every trigger the shared
// list declares. Adding a trigger to `SUPPORTED_WORKFLOW_TOOL_TRIGGERS` without
// adding its input-schema mapping here will fail this assertion.
const _assertSupportedTriggersInSync: Record<
	(typeof SUPPORTED_WORKFLOW_TOOL_TRIGGERS)[number],
	string
> = SUPPORTED_TRIGGERS;
void _assertSupportedTriggersInSync;

// ---------------------------------------------------------------------------
// detectTriggerNode
// ---------------------------------------------------------------------------

interface DetectedTrigger {
	node: INode;
	triggerType: string;
}

export function detectTriggerNode(workflow: WorkflowEntity): DetectedTrigger {
	const nodes = workflow.nodes ?? [];

	for (const node of nodes) {
		const triggerType = SUPPORTED_TRIGGERS[node.type];
		if (triggerType) {
			return { node, triggerType };
		}
	}

	throw noSupportedTriggerError(workflow);
}

function noSupportedTriggerError(workflow: WorkflowEntity): CallableWorkflowUnavailableError {
	return new CallableWorkflowUnavailableError(
		'incompatible',
		`Workflow "${workflow.name}" needs a '${WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME}' trigger to run as an agent tool.`,
	);
}

// ---------------------------------------------------------------------------
// validateCompatibility
// ---------------------------------------------------------------------------

export function validateCompatibility(workflow: WorkflowEntity): void {
	const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
	if (!incompatibility) return;

	if (incompatibility.reason === 'incompatible_nodes') {
		// Re-resolve node names here (the shared function only returns types) so the
		// thrown message stays actionable for a developer reading the agent log.
		// Skip disabled nodes — they don't execute, so they aren't the problem.
		const nodes = workflow.nodes ?? [];
		const names = nodes
			.filter((n) => !n.disabled && incompatibility.nodeTypes.includes(n.type))
			.map((n) => `${n.name} (${n.type})`)
			.join(', ');
		throw new CallableWorkflowUnavailableError(
			'incompatible',
			`Workflow "${workflow.name}" contains nodes that aren't supported as agent tools: ${names}. ` +
				'Remove them or pick another workflow.',
		);
	}

	throw noSupportedTriggerError(workflow);
}

// ---------------------------------------------------------------------------
// inferInputSchema
// ---------------------------------------------------------------------------

/** Execute Workflow Trigger `inputSource` values (mirror nodes-base constants). */
const INPUT_SOURCE = 'inputSource';
const WORKFLOW_INPUTS = 'workflowInputs';
const JSON_EXAMPLE = 'jsonExample';
const PASSTHROUGH = 'passthrough';

/**
 * Map an n8n-field primitive type to the matching Zod type.
 * String fields coerce so numeric IDs (e.g. Telegram chatId) do not hard-fail.
 * Fields are nullable/optional to match the trigger's null fallback for missing keys.
 */
function fieldTypeToZod(type: string | undefined, label: string): z.ZodTypeAny {
	const described = (schema: z.ZodTypeAny) => schema.describe(label).nullable().optional();

	switch (type) {
		case 'number':
			return described(z.coerce.number());
		case 'boolean':
			// Do not coerce — Boolean("false") === true.
			return described(z.boolean());
		case 'array':
			return described(z.array(z.unknown()));
		case 'object':
			return described(z.record(z.unknown()));
		case 'any':
			return described(z.unknown());
		default:
			// string (and unknown type labels) — coerce so numbers/booleans stringify
			return described(z.coerce.string());
	}
}

export type WorkflowInputFieldDef = { name: string; type?: string };

/** Apply the trigger's version-specific default before workflow execution adds node defaults. */
function getExecuteWorkflowInputSource(triggerNode: INode): string {
	const params = triggerNode.parameters ?? {};
	const inputSource = params[INPUT_SOURCE];
	const defaultInputSource = triggerNode.typeVersion >= 1.1 ? WORKFLOW_INPUTS : PASSTHROUGH;
	return typeof inputSource === 'string' ? inputSource : defaultInputSource;
}

/** Declared field defs from an Execute Workflow Trigger (empty for passthrough). */
export function listWorkflowInputFields(triggerNode: INode): WorkflowInputFieldDef[] {
	const params = triggerNode.parameters ?? {};
	const inputSource = getExecuteWorkflowInputSource(triggerNode);

	if (inputSource === PASSTHROUGH) return [];

	if (inputSource === JSON_EXAMPLE) {
		const jsonExample = params[JSON_EXAMPLE] as string | undefined;
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

	// workflowInputs (default)
	const workflowInputs = params[WORKFLOW_INPUTS] as
		| { values?: Array<{ name: string; type?: string }> }
		| undefined;

	return (workflowInputs?.values ?? []).filter(
		(field): field is WorkflowInputFieldDef =>
			typeof field.name === 'string' && field.name.length > 0,
	);
}

function schemaFromFieldDefs(fields: WorkflowInputFieldDef[]): z.ZodObject<z.ZodRawShape> | null {
	const shape: z.ZodRawShape = {};
	for (const field of fields) {
		shape[field.name] = fieldTypeToZod(field.type, field.name);
	}
	return Object.keys(shape).length > 0 ? z.object(shape) : null;
}

export function inferInputSchema(
	triggerNode: INode,
	triggerType: string,
): z.ZodObject<z.ZodRawShape> {
	switch (triggerType) {
		case 'executeWorkflow': {
			const inputSource = getExecuteWorkflowInputSource(triggerNode);
			if (inputSource === PASSTHROUGH) {
				return z.object({}).catchall(z.unknown());
			}
			return (
				schemaFromFieldDefs(listWorkflowInputFields(triggerNode)) ??
				z.object({}).catchall(z.unknown())
			);
		}

		default:
			return z.object({}).catchall(z.unknown());
	}
}
