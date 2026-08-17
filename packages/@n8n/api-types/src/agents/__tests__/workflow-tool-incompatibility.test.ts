import { describe, expect, it } from 'vitest';

import {
	INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES,
	SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
	getWorkflowToolIncompatibilityReason,
} from '../types';

function wf(...nodeTypes: string[]) {
	return { nodes: nodeTypes.map((type, i) => ({ type, name: `Node ${i}` })) };
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
});
