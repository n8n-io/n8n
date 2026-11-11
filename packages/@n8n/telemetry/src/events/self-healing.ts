import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

// Mirrors `SelfHealingResultOutcome` in @n8n/api-types. Inlined because the
// result kind is a warehouse column and must not change with the API type.
const resultKind = z.enum(['fix_ready', 'needs_you', 'could_not_fix']);

const reviewState = z.enum(['open', 'closed', 'applied', 'discarded', 'dismissed', 'outdated']);

const originalAction = z.enum(['publish', 'continue', 'open_editor', 'dismiss']);

const resultIdentity = {
	result_id: z.string(),
	workflow_id: z.string(),
	project_id: z.string(),
	result_kind: resultKind,
};

export const SELF_HEALING_TELEMETRY = defineTelemetryEvents({
	SELF_HEALING_EVALUATED_FAILURE: {
		name: 'Self healing evaluated failure',
		description:
			'Self-healing decided whether to investigate a failed production execution. Fires for each failure in a project that has a self-healing configuration. A rare repeat is possible. Keep one row for each execution_id.',
		properties: z.object({
			execution_id: z.string(),
			workflow_id: z.string(),
			project_id: z.string(),
			workflow_version_id: z
				.string()
				.nullable()
				.describe('Workflow version that failed. Null when the executing process did not send it'),
			failed_at: z.string().nullable().describe('When the execution stopped, ISO 8601'),
			error_type: z
				.string()
				.nullable()
				.describe('Error class name, for example NodeApiError. Never the error message'),
			error_node_type: z.string().nullable().describe('Type of the node that failed'),
			configuration_id: z
				.number()
				.nullable()
				.describe('Null when no configuration covers the workflow'),
			decision: z.enum(['investigate', 'skip']),
			skip_reason: z
				.enum([
					'not_watched',
					'configuration_paused',
					'investigation_running',
					'result_awaiting_review',
					'cooldown',
					'unpublished_changes',
					'other',
				])
				.nullable()
				.describe(
					"Null for 'investigate'. 'configuration_paused': a user or the system disabled the configuration. 'cooldown' follows a recent Could not fix result for the same published version",
				),
			investigation_id: z.string().nullable(),
			user_id: z
				.string()
				.optional()
				.describe(
					'User who enabled the configuration. The investigation runs with the access of this user',
				),
		}),
	},
	SELF_HEALING_FINISHED_INVESTIGATION: {
		name: 'Self healing finished investigation',
		description:
			'A self-healing investigation ended, with a saved result or without one. A rare repeat is possible. Keep one row for each investigation_id.',
		properties: z.object({
			investigation_id: z.string(),
			execution_id: z.string(),
			workflow_id: z.string(),
			project_id: z.string(),
			thread_id: z.string(),
			run_id: z.string(),
			user_id: z.string().describe('User who enabled the configuration'),
			baseline_version_id: z
				.string()
				.describe('Published workflow version that the investigation started from'),
			outcome: z.enum([...resultKind.options, 'no_result']),
			termination_reason: z
				.string()
				.describe(
					"Why the investigation ended. 'completed' for a saved result. Otherwise a short code, for example cancelled, errored, max-iterations, invalid_output, save_failed, not_saved, crash_interrupted or not_started. Usage is unknown for crash_interrupted",
				),
			result_id: z.string().nullable(),
			duration_seconds: z.number().nullable(),
			turns: z.number().nullable().describe('Agent steps used'),
			token_usage_by_model: z
				.array(
					z.object({
						model: z.string(),
						uncached_input: z.number(),
						cache_read: z.number(),
						cache_write: z.number(),
						output: z.number(),
					}),
				)
				.nullable()
				.describe('Null when usage is unknown'),
			credits_charged: z
				.number()
				.nullable()
				.describe('Null when the instance does not use Gateway credits or the claim failed'),
		}),
	},
	SELF_HEALING_CHANGED_RESULT_STATE: {
		name: 'Self healing changed result state',
		description:
			"A self-healing result was created or closed. Fires when the result is created, with new_state 'open' or 'closed', and when it closes. Could not fix results are created as 'closed'. \"User clicked self healing action\" also fires for a click that closed nothing.",
		properties: z.object({
			...resultIdentity,
			new_state: reviewState,
			user_id: z
				.string()
				.describe(
					'The reviewer for applied, discarded and dismissed. Otherwise the user who enabled the configuration',
				),
			original_action: originalAction
				.nullable()
				.describe(
					"The button that closed the result. Null for a system change. 'continue' and 'open_editor' close a Needs you result that has no fix as 'dismissed'",
				),
			saved_version_id: z
				.string()
				.nullable()
				.describe('Workflow version that the applied fix created'),
			published: z
				.boolean()
				.nullable()
				.describe(
					"Set when new_state is 'applied'. True when the publish request succeeded. False when the fix was only saved or the publish failed",
				),
		}),
	},
	USER_VIEWED_SELF_HEALING_RESULT: {
		name: 'User viewed self healing result',
		description:
			'The details of a Fix ready or Needs you result rendered for a user. Fires once each time the user opens the result. Could not fix results send no event.',
		properties: z.object({
			...resultIdentity,
			current_state: reviewState,
		}),
	},
	USER_CLICKED_SELF_HEALING_ACTION: {
		name: 'User clicked self healing action',
		description:
			'A user selected an action on a Fix ready or Needs you result. Fires on the click, before the request. "Self healing changed result state" reports whether the action succeeded.',
		properties: z.object({
			...resultIdentity,
			original_action: originalAction.describe(
				"The button the user selected. 'continue' is Continue with Assistant, which opens a chat. 'open_editor' opens the editor. Both save the fix first when the result has one",
			),
		}),
	},
	INSTANCE_CHANGED_SELF_HEALING_CONFIGURATION: {
		name: 'Instance changed self healing configuration',
		description:
			'A self-healing configuration was created, updated, enabled, disabled, deleted or paused by the system. A configuration that is deleted with its project sends no event. "Instance reported self healing configuration" has the current counts.',
		properties: z.object({
			configuration_id: z.number(),
			project_id: z.string(),
			change: z.enum(['created', 'updated', 'enabled', 'disabled', 'deleted', 'auto_paused']),
			reason: z
				.enum(['no_eligible_reviewer', 'enabling_user_lost_access'])
				.nullable()
				.describe('Set for auto_paused only'),
			user_id: z
				.string()
				.optional()
				.describe('The acting user. For auto_paused, the user who enabled the configuration'),
			enabled: z.boolean().describe('State after the change'),
			enabled_by_id: z.string().nullable(),
			scope: z.enum(['all', 'selected']),
			include_all_project_members: z
				.boolean()
				.describe('True when all project members are reviewers'),
			reviewer_count: z
				.number()
				.nullable()
				.describe('Selected reviewers. Set for created and updated only'),
			selected_workflow_count: z
				.number()
				.nullable()
				.describe('Selected workflows. Set for created and updated only'),
		}),
	},
	INSTANCE_REPORTED_SELF_HEALING_CONFIGURATION: {
		name: 'Instance reported self healing configuration',
		description:
			'Daily snapshot of self-healing adoption on an instance where the feature is available. Fires with zero configurations too.',
		properties: z.object({
			configuration_count: z.number().describe('All configurations, enabled or not'),
			enabled_project_count: z
				.number()
				.describe('Projects with at least one enabled configuration'),
			all_scope_count: z.number().describe('Enabled configurations that watch all workflows'),
			selected_scope_count: z
				.number()
				.describe('Enabled configurations that watch selected workflows'),
			watched_workflow_count: z.number().describe('Workflows that an enabled configuration covers'),
		}),
	},
});
