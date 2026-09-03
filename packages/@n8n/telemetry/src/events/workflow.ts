import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const WORKFLOW_TELEMETRY = defineTelemetryEvents({
	MULTIPLE_NODES_SELECTED: {
		name: 'User selected multiple nodes',
		description:
			'The user has two or more nodes selected on the workflow canvas. Fires once the selection settles (debounced), covering all selection paths — rubber-band drag, shift-click, and select-all — so intermediate states during a drag are not reported. Groups are excluded from the count.',
		properties: z.object({
			workflow_id: z.string(),
			node_count: z.number().describe('Number of nodes selected once the selection settled'),
			push_ref: z.string().describe('Editor session ref, to join with other canvas events'),
		}),
	},
	NODE_IDS_HEALED: {
		name: 'Workflow node ids healed',
		description:
			'A published version about to be activated carried duplicate or missing node ids, so a corrected system-authored version was published in its place. `superseded` means the corrected version lost against a concurrent publish or unpublish and was discarded.',
		properties: z.object({
			workflow_id: z.string(),
			filled_count: z.number().describe('Nodes that had no id and received a fresh one'),
			reassigned_count: z
				.number()
				.describe('Nodes that shared their id with another node and received a fresh one'),
			dropped_count: z
				.number()
				.describe('Exact same-name duplicates removed in favor of their last occurrence'),
			superseded: z
				.boolean()
				.describe('Whether the corrected version lost the publish race and was discarded'),
		}),
	},
});
