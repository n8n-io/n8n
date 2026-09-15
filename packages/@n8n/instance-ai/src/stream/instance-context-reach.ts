import type { InstanceContextReach, InstanceContextSurface } from '@n8n/api-types';

import type { ToolCallSummary } from './work-summary-accumulator';
import { DOMAIN_TOOL_IDS } from '../tools/tool-ids';

/**
 * Which tool call means which surface. Data rather than a chain of conditionals, so a
 * new surface is one entry here plus its depth and its label.
 *
 * `get-as-code` is the same rung as `get`: both return the whole workflow, and the
 * difference is the shape it arrives in, not how much was read.
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
	// The index has two entrances: the `node-usage` action and the `nodeTypes` filter on `list`.
	// Checked before the action guard, since the filter is recorded without one.
	if (call.toolName === DOMAIN_TOOL_IDS.WORKFLOWS && call.filteredByNodeTypes === true) {
		return 'node-usage';
	}

	if (call.action === undefined) return undefined;

	// Both come off the model's own tool call, so a plain index could return an inherited
	// member — `action: "constructor"` would put a function in `surfaces`.
	const byAction = Object.hasOwn(SURFACE_BY_CALL, call.toolName)
		? SURFACE_BY_CALL[call.toolName]
		: undefined;
	if (byAction === undefined || !Object.hasOwn(byAction, call.action)) return undefined;

	return byAction[call.action];
}

/**
 * Which context surfaces a turn used. Attempts count, not just successes — a turn that tried
 * and failed still went looking. Derived once, because the trace and telemetry must agree.
 */
export function deriveInstanceContextReach(toolCalls: ToolCallSummary[]): InstanceContextReach {
	const surfaces: InstanceContextSurface[] = [];

	for (const call of toolCalls) {
		const surface = surfaceFor(call);
		if (surface !== undefined && !surfaces.includes(surface)) surfaces.push(surface);
	}

	return { surfaces };
}

/**
 * Combines what two segments of one turn each used.
 *
 * A turn that stops for a confirmation runs in segments, and each gets its own work
 * summary, so neither knows what the other read. The reads that follow an approval are
 * often the deepest, so the segments accumulate rather than the later one winning.
 */
export function mergeInstanceContextReach(
	earlier: InstanceContextReach | undefined,
	later: InstanceContextReach,
): InstanceContextReach {
	if (!earlier) return later;

	const surfaces = [...earlier.surfaces];
	for (const surface of later.surfaces) {
		if (!surfaces.includes(surface)) surfaces.push(surface);
	}

	return { surfaces };
}
