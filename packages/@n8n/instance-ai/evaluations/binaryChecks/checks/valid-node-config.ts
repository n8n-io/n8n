import { validateWorkflow } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { WorkflowResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';

/** Error codes emitted by schema validation in validateWorkflow */
const SCHEMA_ERROR_CODES = new Set(['INVALID_PARAMETER', 'MISSING_PARAMETER']);

/**
 * WorkflowResponse uses `Record<string, unknown>` for parameters/connections where
 * WorkflowJSON uses narrower type aliases (IDataObject, IConnections). The shapes
 * are structurally compatible at runtime but require a bridge cast at compile time.
 *
 * If either type drifts (e.g. WorkflowJSON gains a required field), this cast
 * will silently hide the mismatch. If that happens, replace the `as unknown as`
 * with an explicit per-field mapper and let TS enforce the shape.
 */
function toWorkflowJson(workflow: WorkflowResponse): WorkflowJSON {
	return {
		name: workflow.name,
		nodes: (workflow.nodes ?? []).map((n, i) => ({
			id: String(i),
			name: n.name,
			type: n.type,
			typeVersion: n.typeVersion ?? 1,
			parameters: n.parameters ?? {},
			position: [0, 0],
		})),
		connections: workflow.connections,
	} as unknown as WorkflowJSON;
}

/**
 * Validates node parameters against generated Zod schemas via workflow-sdk.
 *
 * Covers both:
 * - Missing required parameters (what ai-workflow-builder.ee checked as `valid_required_parameters`)
 * - Invalid option values (what ai-workflow-builder.ee checked as `valid_options_values`)
 *
 * Uses `validateWorkflow` with trigger/connectivity checks disabled (handled by
 * other binary checks), keeping only schema validation. Gracefully skips nodes
 * that have no schema available.
 */
export const validNodeConfig: BinaryCheck = {
	name: 'valid_node_config',
	description: 'Node parameters match their Zod schemas (required params, valid options)',
	kind: 'deterministic',
	run(workflow: WorkflowResponse) {
		const nodes = workflow.nodes ?? [];
		if (nodes.length === 0) return { pass: true };

		const result = validateWorkflow(toWorkflowJson(workflow), {
			allowNoTrigger: true,
			allowDisconnectedNodes: true,
			validateSchema: true,
		});

		// Only report schema-level errors, not structural warnings
		const schemaErrors = result.errors.filter((e) => SCHEMA_ERROR_CODES.has(e.code));

		if (schemaErrors.length === 0) return { pass: true };

		const messages = schemaErrors.map((e) => `${e.nodeName ? `${e.nodeName}: ` : ''}${e.message}`);

		return { pass: false, comment: messages.join('; ') };
	},
};
