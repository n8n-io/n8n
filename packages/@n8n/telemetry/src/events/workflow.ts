import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';
import { setupItemProperties, setupTelemetryProperties } from '../setup-properties';

export const WORKFLOW_TELEMETRY = defineTelemetryEvents({
	USER_REQUESTED_WORKFLOW_TEST: {
		name: 'User requested workflow test',
		description:
			'The user started a manual workflow test from the AI Assistant setup panel. This event does not report execution success.',
		properties: z.object({
			...setupTelemetryProperties,
			source: z.literal('instance_ai_setup_panel'),
			workflow_id: z.string(),
			thread_id: z.string().optional(),
			test_request_id: z.string().optional(),
		}),
	},
	SETUP_TEST_FINISHED: {
		name: 'AI Assistant setup test finished',
		description:
			'The setup panel observed a terminal test result or a failed run request. A failed request does not prove that execution did not start. Leaving setup before the result can omit this event.',
		properties: z.object({
			...setupTelemetryProperties,
			source: z.literal('instance_ai_setup_panel'),
			workflow_id: z.string(),
			thread_id: z.string(),
			test_request_id: z.string(),
			execution_id: z.string().optional(),
			status: z.enum(['success', 'error', 'crashed', 'canceled', 'request_failed']),
		}),
	},
	SETUP_SAVED: {
		name: 'AI Assistant workflow setup saved',
		description:
			'A setup surface observed saved requirements after applying changes. Completion covers the observed setup requirements, not credential validity or edits made while setup is closed.',
		properties: z.object({
			...setupTelemetryProperties,
			instance_id: z.string(),
			workflow_id: z.string(),
			thread_id: z.string(),
			source: z.enum(['instance_ai_setup_wizard', 'instance_ai_setup_panel']),
			request_id: z.string().optional(),
			items: z.array(z.object({ ...setupItemProperties, completed: z.boolean() })),
			setup_complete: z.boolean(),
		}),
	},
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
