import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const PLATFORM_TELEMETRY = defineTelemetryEvents({
	USER_IS_PART_OF_EXPERIMENT: {
		name: 'User is part of experiment',
		description:
			'User was assigned a variant of a running experiment, reported when feature flags resolve in the editor.',
		properties: z.object({
			name: z.string().describe('Experiment feature-flag key'),
			variant: z.union([z.string(), z.boolean()]).describe('Variant assigned to the user'),
		}),
	},
	USER_OPENED_ACCOUNT_MENU: {
		name: 'User opened account menu',
		description:
			'User opened the account menu from the user row at the bottom of the main sidebar, by click or keyboard. Reported once per open, not on close.',
		properties: z.object({
			sidebar_collapsed: z.boolean().describe('Whether the sidebar was the icon rail at the time'),
		}),
	},
	USER_CLICKED_ACCOUNT_MENU_ITEM: {
		name: 'User clicked account menu item',
		description:
			"User chose a row in the account menu that opens from the user row at the bottom of the main sidebar. Help links report 'User clicked help resource' instead.",
		properties: z.object({
			item: z
				.enum(['cloud_console', 'personal_settings', 'whats_new', 'sign_out'])
				.describe('Row the user chose'),
			sidebar_collapsed: z.boolean().describe('Whether the sidebar was the icon rail at the time'),
		}),
	},
	USER_CLICKED_INSTANCE_SETTINGS_LINK: {
		name: 'User clicked instance settings link',
		description:
			"User clicked the Instance settings link at the bottom of the main sidebar, which opens the settings area on its first instance page. Personal settings reached through the account menu report 'User clicked account menu item' instead.",
		properties: z.object({
			sidebar_collapsed: z.boolean().describe('Whether the sidebar was the icon rail at the time'),
		}),
	},
	TASK_RUNNER_DISCONNECTED: {
		name: 'Task runner disconnected',
		description:
			'The broker tore down a task runner connection because the runner was unhealthy: it failed a heartbeat check, or was reported unresponsive after it stopped acknowledging or offering tasks. Normal shutdowns are not reported.',
		properties: z.object({
			reason: z
				.enum(['failed-heartbeat-check', 'runner-unresponsive'])
				.describe('Which detection reported the runner as unhealthy'),
			mode: z.enum(['internal', 'external']).describe('Task runners deployment mode'),
		}),
	},
	MEMORY_GUARD_STOPPED_EXECUTION: {
		name: 'Memory guard stopped execution',
		description:
			'The memory guard stopped the running execution that held the most run data, because the instance was running out of memory. Reported once for each stop, after the guard checked whether the stop freed memory.',
		properties: z.object({
			workflow_id: z.string(),
			execution_mode: z.string().describe('Mode of the stopped execution, for example webhook'),
			reason: z
				.enum(['threshold', 'critical', 'hold-limit'])
				.describe(
					'Why the guard stopped: memory stayed above the stop level, memory reached the critical level, or a held execution waited too long',
				),
			running_node_type: z.string().optional().describe('Type of the node that was running'),
			largest_data_node_type: z
				.string()
				.optional()
				.describe('Type of the node whose output held the most run data'),
			estimated_bytes: z.number().describe('Estimated run data that the execution held'),
			memory_used_bytes: z.number(),
			memory_limit_bytes: z.number(),
			freed_memory: z.boolean().describe('Whether memory fell enough after the stop'),
			workflow_deactivation_started: z
				.boolean()
				.describe(
					'Whether this stop made the guard start to deactivate the workflow, after repeated stops',
				),
		}),
	},
});
