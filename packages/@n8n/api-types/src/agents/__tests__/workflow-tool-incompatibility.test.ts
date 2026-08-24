import type { IConnections } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
	INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES,
	SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
	getWorkflowToolIncompatibilityReason,
} from '../types';

function wf(...nodeTypes: string[]) {
	return { nodes: nodeTypes.map((type, i) => ({ type, name: `Node ${i}` })) };
}

/**
 * Build a workflow with named nodes and (optionally) connections. `disabled`
 * is a per-node flag keyed by 0-based index.
 */
function wfNamed(
	nodes: Array<{ type: string; name: string; disabled?: boolean }>,
	connections?: IConnections,
) {
	return { nodes, connections };
}

/** Connect `source` → `target` on the main output[0] → input[0] axis. */
function link(source: string, target: string): IConnections {
	return {
		[source]: { main: [[{ node: target, type: 'main', index: 0 }]] },
	};
}

const [compatibleTrigger] = SUPPORTED_WORKFLOW_TOOL_TRIGGERS;
const [incompatibleBodyNode] = INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES;

describe('getWorkflowToolIncompatibilityReason', () => {
	it('returns null for a compatible workflow with a supported trigger', () => {
		expect(getWorkflowToolIncompatibilityReason(wf(compatibleTrigger))).toBeNull();
	});

	it('returns null for a compatible workflow with a trigger and a regular body node', () => {
		expect(
			getWorkflowToolIncompatibilityReason(wf(compatibleTrigger, 'n8n-nodes-base.set')),
		).toBeNull();
	});

	it('returns incompatible_nodes when an incompatible body node is present', () => {
		const result = getWorkflowToolIncompatibilityReason(
			wf(compatibleTrigger, incompatibleBodyNode),
		);
		expect(result).toEqual({
			reason: 'incompatible_nodes',
			nodeTypes: [incompatibleBodyNode],
		});
	});

	it('collects all incompatible node types', () => {
		const allIncompatible = [...INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES];
		const result = getWorkflowToolIncompatibilityReason(wf(compatibleTrigger, ...allIncompatible));
		expect(result).toEqual({
			reason: 'incompatible_nodes',
			nodeTypes: allIncompatible,
		});
	});

	it('returns no_supported_trigger when no trigger matches', () => {
		const result = getWorkflowToolIncompatibilityReason(wf('n8n-nodes-base.set'));
		expect(result).toEqual({ reason: 'no_supported_trigger' });
	});

	it('prioritises incompatible_nodes over no_supported_trigger', () => {
		// An incompatible body node with no supported trigger — the node check fires first.
		const result = getWorkflowToolIncompatibilityReason(wf(incompatibleBodyNode));
		expect(result).toEqual({
			reason: 'incompatible_nodes',
			nodeTypes: [incompatibleBodyNode],
		});
	});

	it('treats an empty node list as no_supported_trigger', () => {
		expect(getWorkflowToolIncompatibilityReason({ nodes: [] })).toEqual({
			reason: 'no_supported_trigger',
		});
	});

	it('treats a missing nodes array as no_supported_trigger', () => {
		expect(getWorkflowToolIncompatibilityReason({})).toEqual({
			reason: 'no_supported_trigger',
		});
	});

	it('ignores a disabled incompatible node', () => {
		const result = getWorkflowToolIncompatibilityReason(
			wfNamed([
				{ type: compatibleTrigger, name: 'Trigger' },
				{ type: incompatibleBodyNode, name: 'Wait', disabled: true },
			]),
		);
		expect(result).toBeNull();
	});

	it('ignores an incompatible node that is not reachable from a supported trigger', () => {
		// Two disconnected subgraphs: the supported trigger's branch has no
		// incompatible node; the Wait sits behind an unsupported trigger and
		// never runs when the agent invokes the workflow.
		const result = getWorkflowToolIncompatibilityReason(
			wfNamed(
				[
					{ type: compatibleTrigger, name: 'Trigger' },
					{ type: 'n8n-nodes-base.set', name: 'Set' },
					{ type: 'n8n-nodes-base.cronTrigger', name: 'Cron' },
					{ type: incompatibleBodyNode, name: 'Wait' },
				],
				{ ...link('Trigger', 'Set'), ...link('Cron', 'Wait') },
			),
		);
		expect(result).toBeNull();
	});

	it('flags an incompatible node that is reachable from a supported trigger', () => {
		const result = getWorkflowToolIncompatibilityReason(
			wfNamed(
				[
					{ type: compatibleTrigger, name: 'Trigger' },
					{ type: incompatibleBodyNode, name: 'Wait' },
				],
				link('Trigger', 'Wait'),
			),
		);
		expect(result).toEqual({
			reason: 'incompatible_nodes',
			nodeTypes: [incompatibleBodyNode],
		});
	});

	it('ignores an incompatible node reachable only from a second supported trigger', () => {
		// The agent invokes the first supported trigger only, so the second
		// trigger's subgraph never runs and its incompatible node is ignored.
		const secondTrigger = SUPPORTED_WORKFLOW_TOOL_TRIGGERS[1];
		const result = getWorkflowToolIncompatibilityReason(
			wfNamed(
				[
					{ type: compatibleTrigger, name: 'First' },
					{ type: secondTrigger, name: 'Second' },
					{ type: incompatibleBodyNode, name: 'Wait' },
				],
				link('Second', 'Wait'),
			),
		);
		expect(result).toBeNull();
	});
});
