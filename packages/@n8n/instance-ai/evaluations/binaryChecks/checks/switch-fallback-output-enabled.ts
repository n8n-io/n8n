import { validateWorkflow } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { WorkflowResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';

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
			...(n.onError ? { onError: n.onError } : {}),
		})),
		connections: workflow.connections,
	} as unknown as WorkflowJSON;
}

export const switchFallbackOutputEnabled: BinaryCheck = {
	name: 'switch_fallback_output_enabled',
	description: 'Switch fallback branches are only wired when the extra fallback output exists',
	kind: 'deterministic',
	run(workflow: WorkflowResponse) {
		const result = validateWorkflow(toWorkflowJson(workflow), {
			allowNoTrigger: true,
			allowDisconnectedNodes: true,
			validateSchema: false,
		});

		const warnings = result.warnings.filter((w) => w.code === 'SWITCH_FALLBACK_OUTPUT_DISABLED');
		if (warnings.length === 0) return { pass: true };

		return {
			pass: false,
			comment: warnings.map((w) => w.message).join('; '),
		};
	},
};
