import type { InstanceContextReach, InstanceContextSurface } from '@n8n/api-types';
import { INSTANCE_CONTEXT_SURFACE_DEPTH } from '@n8n/api-types';

import type { ToolCallSummary } from './work-summary-accumulator';
import { DOMAIN_TOOL_IDS } from '../tools/tool-ids';

/**
 * Which tool call means which surface. Kept as data rather than a chain of
 * conditionals so adding a surface is one line here and nothing elsewhere.
 *
 * `get-as-code` counts as the same rung as `get`: both hand back the whole workflow,
 * and the difference between them is the shape it arrives in, not how much was read.
 */
const SURFACE_BY_CALL: Record<string, Record<string, InstanceContextSurface>> = {
	[DOMAIN_TOOL_IDS.ACTIVITY]: {
		list: 'activity-list',
		expand: 'activity-expand',
	},
	[DOMAIN_TOOL_IDS.WORKFLOWS]: {
		'node-usage': 'node-usage',
		get: 'workflow-read',
		'get-as-code': 'workflow-read',
	},
};

function surfaceFor(call: ToolCallSummary): InstanceContextSurface | undefined {
	if (call.action === undefined) return undefined;

	// The node-usage index has two entrances and one flag over both: the `node-usage`
	// action, and narrowing `list` by node type — which the tool documents as reading the
	// same index. Crediting only the action would report a turn that asked "who uses Slack"
	// the cheap way as never having left the block.
	if (call.toolName === DOMAIN_TOOL_IDS.WORKFLOWS && call.filteredByNodeTypes === true) {
		return 'node-usage';
	}

	return SURFACE_BY_CALL[call.toolName]?.[call.action];
}

/**
 * How far a turn went for instance context.
 *
 * Attempts count, not just successes: a turn that tried to read deeper and failed
 * still went looking, and treating it as if it never asked would hide exactly the
 * cases where a surface is broken or too hard to call.
 *
 * The single place this is derived. The trace shows it to the user and telemetry
 * reports it, and both have to agree or the two read-outs of the same feature
 * disagree about what happened.
 */
export function deriveInstanceContextReach(toolCalls: ToolCallSummary[]): InstanceContextReach {
	const surfaces: InstanceContextSurface[] = [];

	for (const call of toolCalls) {
		const surface = surfaceFor(call);
		if (surface !== undefined && !surfaces.includes(surface)) surfaces.push(surface);
	}

	const depth = surfaces.reduce<InstanceContextReach['depth']>(
		(deepest, surface) =>
			INSTANCE_CONTEXT_SURFACE_DEPTH[surface] > deepest
				? INSTANCE_CONTEXT_SURFACE_DEPTH[surface]
				: deepest,
		0,
	);

	return { depth, surfaces };
}
