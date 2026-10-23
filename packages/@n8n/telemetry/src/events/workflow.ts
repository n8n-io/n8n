import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';
import { setupItemProperties, setupTelemetryProperties } from '../setup-properties';

export const WORKFLOW_TELEMETRY = defineTelemetryEvents({
	USER_GROUPED_NODES: {
		name: 'User grouped nodes',
		// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
		description:
			'The user created a node group on the workflow canvas. Empty groups report no node ids because their internal anchor is excluded.',
		properties: z.object({
			workflow_id: z.string(),
			group_id: z.string(),
			node_ids: z.array(z.string()),
			node_count: z.number(),
			group_title: z.string(),
			source: z.enum([
				'group-toolbar',
				'group-header',
				'keyboard-shortcut',
				'context-menu',
				'update-blocked-toast',
				'sub-workflow-extraction',
				// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
				'node-creator',
			]),
			push_ref: z.string(),
			// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
			is_empty: z.boolean().optional(),
			// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
			node_creator_open_source: z
				.enum([
					'context_menu',
					'no_trigger_execution_tooltip',
					'plus_endpoint',
					'add_input_endpoint',
					'trigger_placeholder_button',
					'node_shortcut',
					'replace_node_action',
					'node_connection_action',
					'node_connection_drop',
					'notice_error_message',
					'add_node_button',
					'add_evaluation_node_button',
					'templates_callout',
					'instance_ai',
				])
				.optional(),
		}),
	},
	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	USER_FILLED_EMPTY_GROUP: {
		name: 'User filled empty group',
		description:
			'The user added the first real node or node batch to a group that contained only its internal empty-group anchor.',
		properties: z.object({
			workflow_id: z.string(),
			group_id: z.string(),
			push_ref: z.string(),
			node_count_after: z.number(),
			connection_count_before_fill: z.number(),
		}),
	},
	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	USER_DELETED_LAST_NODE_FROM_GROUP: {
		name: 'User deleted last node from group',
		description:
			'The user deleted the last real node from a group and the editor replaced it with an internal empty-group anchor.',
		properties: z.object({
			workflow_id: z.string(),
			group_id: z.string(),
			push_ref: z.string(),
		}),
	},
	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	USER_DELETED_GROUP: {
		name: 'User deleted group',
		description:
			'The user deleted the final member of a group, which removed the group from the workflow.',
		properties: z.object({
			workflow_id: z.string(),
			group_id: z.string(),
			push_ref: z.string(),
			was_empty: z.boolean(),
		}),
	},
	// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
	USER_CONNECTED_EMPTY_GROUP: {
		name: 'User connected empty group',
		description:
			'The user added a connection whose source or target was a group that still contained only its internal empty-group anchor.',
		properties: z.object({
			workflow_id: z.string(),
			group_id: z.string(),
			push_ref: z.string(),
			was_first_connection: z.boolean(),
		}),
	},
	USER_ACTIVATED_WORKFLOW: {
		name: 'User activated workflow',
		// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
		description:
			'A workflow version became active. The empty-group count is calculated from that published version, not from the current draft.',
		properties: z.object({
			user_id: z.string(),
			workflow_id: z.string(),
			public_api: z.boolean(),
			source: z.enum(['ui', 'api', 'n8n-mcp', 'n8n-ai', 'import', 'review-approval']),
			private_credentials_count: z.number(),
			private_credential_types: z.array(z.string()),
			// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
			empty_group_count: z.number().optional(),
		}),
	},
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
