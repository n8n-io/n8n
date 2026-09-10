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
	if (call.action === undefined) return undefined;

	// The node-usage index has two entrances under one flag: the `node-usage` action, and
	// narrowing `list` by node type, which the tool documents as reading the same index.
	// Crediting only the action would report a turn that asked "who uses Slack" the cheap
	// way as never having left the block.
	if (call.toolName === DOMAIN_TOOL_IDS.WORKFLOWS && call.filteredByNodeTypes === true) {
		return 'node-usage';
	}

	// `toolName` and `action` both come off the model's own tool call, so a plain index
	// could return an inherited member — `action: "constructor"` would hand back a
	// function and put it in `surfaces`, where the schema promises a surface name.
	const byAction = Object.hasOwn(SURFACE_BY_CALL, call.toolName)
		? SURFACE_BY_CALL[call.toolName]
		: undefined;
	if (byAction === undefined || !Object.hasOwn(byAction, call.action)) return undefined;

	return byAction[call.action];
}

/**
 * Which context surfaces a turn used.
 *
 * Attempts count, not just successes: a turn that tried to read deeper and failed still
 * went looking, and dropping it would hide the cases where a surface is broken or too
 * hard to call.
 *
 * The single place this is derived. The trace shows it and telemetry reports it, and the
 * two have to agree about what happened.
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
