import type { InstanceContextReach, InstanceContextSurface } from '@n8n/api-types';

import type { ToolCallSummary } from './work-summary-accumulator';
import { DOMAIN_TOOL_IDS } from '../tools/tool-ids';

/** Workflow inspection can return a summary or a file index instead of full content. */
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
	// A node-type filter uses the same index as the node-usage action.
	if (call.toolName === DOMAIN_TOOL_IDS.WORKFLOWS && call.filteredByNodeTypes === true) {
		return 'node-usage';
	}

	if (call.action === undefined) return undefined;

	// Model input must not select inherited object properties.
	const byAction = Object.hasOwn(SURFACE_BY_CALL, call.toolName)
		? SURFACE_BY_CALL[call.toolName]
		: undefined;
	if (byAction === undefined || !Object.hasOwn(byAction, call.action)) return undefined;

	return byAction[call.action];
}

/** Count attempted reads, including failures. Share this result with trace and telemetry. */
export function deriveInstanceContextReach(toolCalls: ToolCallSummary[]): InstanceContextReach {
	const surfaces: InstanceContextSurface[] = [];

	for (const call of toolCalls) {
		const surface = surfaceFor(call);
		if (surface !== undefined && !surfaces.includes(surface)) surfaces.push(surface);
	}

	return { surfaces };
}

/** Combine segment reads so a resumed turn retains its earlier reads. */
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
