import { appVisibilitySchema } from '@n8n/api-types';
import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const visibility = z.enum(appVisibilitySchema.options);

const actorUserId = z
	.string()
	.optional()
	.describe('Absent when no user started the action, for example an API call without a user');

export const APPS_TELEMETRY = defineTelemetryEvents({
	USER_CREATED_APP: {
		name: 'User created app',
		description: 'A user created an app. Fires once per app, from the API or the n8n Assistant.',
		properties: z.object({
			app_id: z.string(),
			project_id: z.string(),
			user_id: actorUserId,
			thread_id: z
				.string()
				.optional()
				.describe('The n8n Assistant thread that created the app. Absent outside the Assistant'),
			visibility,
		}),
	},
	USER_OPENED_APP_BUILDER: {
		name: 'User opened app builder',
		description:
			'A user opened the detail view of an app in the editor. Fires once per visit to the view.',
		properties: z.object({
			app_id: z.string(),
			project_id: z.string(),
			is_published: z.boolean(),
		}),
	},
	USER_PUBLISHED_APP: {
		name: 'User published app',
		description:
			'A user published a version of an app. Fires on the first publish and when a new version replaces the published one.',
		properties: z.object({
			app_id: z.string(),
			version_id: z.string(),
			user_id: actorUserId,
			access_level: visibility.describe('Who can open the published app'),
			is_first_publish: z
				.boolean()
				.describe('True when the app had no published version before this publish'),
		}),
	},
	USER_UNPUBLISHED_APP: {
		name: 'User unpublished app',
		description: 'A user unpublished an app, so its link stops working.',
		properties: z.object({
			app_id: z.string(),
			user_id: actorUserId,
		}),
	},
	USER_DELETED_APP: {
		name: 'User deleted app',
		description: 'A user deleted an app.',
		properties: z.object({
			app_id: z.string(),
			user_id: actorUserId,
			was_published: z.boolean(),
		}),
	},
	USER_CHANGED_APP_VISIBILITY: {
		name: 'User changed app visibility',
		description:
			'A user changed who can open an app. Fires only when the value changes, not on every settings save.',
		properties: z.object({
			app_id: z.string(),
			user_id: actorUserId,
			from: visibility,
			to: visibility,
		}),
	},
	APP_BUILD_FINISHED: {
		name: 'App build finished',
		description:
			'A build of an app version finished. Fires once per build, after all automatic retries, for every path that builds: the n8n Assistant, a version restore, a bindings change and a manual retry.',
		properties: z.object({
			app_id: z.string(),
			version_id: z.string(),
			user_id: actorUserId,
			thread_id: z
				.string()
				.optional()
				.describe('The n8n Assistant thread that made the change. Absent outside the Assistant'),
			change_source: z
				.enum(['initial', 'chat', 'restore', 'retry', 'bindings'])
				.describe(
					"'initial' is the first version of the app, 'chat' a later change from the Assistant, 'bindings' a change of the resources the app can use",
				),
			status: z.enum(['succeeded', 'failed']),
			attempts: z.number().describe('Build attempts, including automatic retries'),
			duration_ms: z.number(),
		}),
	},
	APP_OPENED: {
		name: 'App opened',
		description:
			'Someone opened a published app or an app preview in the browser. Fires once per page load, not for the files the page loads. The app builder loads the preview each time it opens, so most preview opens come from the builder.',
		properties: z.object({
			app_id: z.string(),
			version_id: z.string(),
			user_id: z
				.string()
				.optional()
				.describe('The viewer. For a preview, the editor who opened it'),
			is_preview: z.boolean(),
		}),
	},
	USER_CLICKED_SHOW_APP_CODE: {
		name: 'User clicked show app code',
		description:
			'A user clicked "Show code" in the actions menu of the app header. The code view does not exist yet, so this measures interest in it.',
		properties: z.object({
			app_id: z.string(),
			project_id: z.string(),
		}),
	},
	USER_CHANGED_APP_BINDINGS: {
		name: 'User changed app bindings',
		description:
			'A user saved the workflows, data tables and agents that an app can use. Fires once per save, also when the save does not start a build.',
		properties: z.object({
			app_id: z.string(),
			project_id: z.string(),
			version_id: z.string().describe('The new draft version that holds the bindings'),
			user_id: z.string(),
			workflow_count: z.number(),
			data_table_count: z.number(),
			agent_count: z.number(),
			added_count: z.number().describe('Binding keys that the previous draft did not have'),
			removed_count: z.number().describe('Binding keys of the previous draft that are gone'),
		}),
	},
	USER_INTERACTED_WITH_APP: {
		name: 'User interacted with app',
		description:
			'A running app called n8n: it ran a workflow, wrote to a data table, or sent a message to an agent. Fires once per successful call. Data table reads and page loads do not fire it.',
		properties: z.object({
			app_id: z.string(),
			version_id: z.string(),
			user_id: z.string().describe('The viewer'),
			interaction_type: z.enum(['workflow_run', 'data_table_write', 'agent_message']),
			is_preview: z.boolean(),
		}),
	},
});
