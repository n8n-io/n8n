import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const WORKFLOW_TELEMETRY = defineTelemetryEvents({
	USER_SELECTED_MULTIPLE_NODES: {
		name: 'User selected multiple nodes',
		description:
			'The user selected more than one canvas element (node or group) at once, regardless of whether they went on to act on the selection. Debounced to one event per multi-select gesture.',
		properties: z.object({
			workflow_id: z.string(),
			node_ids: z.array(z.string()).describe('Selected node ids, including group member ids'),
			node_count: z.number(),
			push_ref: z.string(),
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
