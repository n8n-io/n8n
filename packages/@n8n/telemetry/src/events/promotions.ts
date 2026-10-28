import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const failureKind = z
	.enum(['user', 'git_remote', 'unexpected'])
	.optional()
	.describe(
		"Set only when the outcome is 'failed'. 'user' = the request or state was wrong (4xx or promotion conflict); 'git_remote' = a Git call to the remote failed (clone, fetch, push, pull or ls-remote), or the Git host timed out, was unreachable or rate-limited the request; 'unexpected' = anything else, such as a failed local Git step. A Git host that rejects the token, and a TLS, DNS or network-policy failure report as 'user', because the provider settings need a fix. A malformed merge request response from the Git host reports as 'unexpected'",
	);

const scope = z
	.enum(['instance', 'project'])
	.describe(
		"'instance' = the whole-instance operation; 'project' = the selective operation for one project",
	);

export const PROMOTIONS_TELEMETRY = defineTelemetryEvents({
	USER_CREATED_PROMOTION_PROVIDER: {
		name: 'User created promotion provider',
		description:
			'A user tried to create a promotion provider (a Git connection). Fires once per attempt, on success and on failure, so a rejected token or an unreachable host shows as a failed attempt.',
		properties: z.object({
			user_id: z.string(),
			provider_id: z.string().optional().describe("Set only when the outcome is 'success'"),
			provider_type: z.enum(['git', 'gitlab']),
			auth_type: z.enum(['ssh-key', 'token']),
			outcome: z.enum(['success', 'failed']),
			failure_kind: failureKind,
			duration_ms: z.number(),
		}),
	},
	USER_CREATED_PROMOTION_ENVIRONMENT: {
		name: 'User created promotion environment',
		description:
			'A promotion environment was created on a provider. Fires once per created environment.',
		properties: z.object({
			user_id: z.string(),
			environment_id: z.string(),
			provider_type: z.enum(['git', 'gitlab']),
			direction: z.enum(['apply', 'promote']),
			environment_scope: z.enum(['instance', 'projects']),
			create_branch_on_promotion: z
				.boolean()
				.optional()
				.describe('Promote environments only. True when each promotion opens its own branch'),
		}),
	},
	USER_UPDATED_PROMOTION_PROVIDER: {
		name: 'User updated promotion provider',
		description:
			'A user tried to update a promotion provider. Fires once per attempt on an existing provider, on success and on failure, so rejected new credentials show as a failed attempt.',
		properties: z.object({
			user_id: z.string(),
			provider_id: z.string(),
			provider_type: z.enum(['git', 'gitlab']),
			changed_fields: z
				.array(z.enum(['name', 'auth', 'config']))
				.describe('The fields the request sent, never their values. `auth` means new credentials'),
			outcome: z.enum(['success', 'failed']),
			failure_kind: failureKind,
			duration_ms: z.number(),
		}),
	},
	USER_DELETED_PROMOTION_PROVIDER: {
		name: 'User deleted promotion provider',
		description:
			'A promotion provider was deleted. Fires once per successful delete. A provider that an environment still uses cannot be deleted, so that attempt does not fire it.',
		properties: z.object({
			user_id: z.string(),
			provider_id: z.string(),
			provider_type: z.enum(['git', 'gitlab']),
		}),
	},
	USER_UPDATED_PROMOTION_ENVIRONMENT: {
		name: 'User updated promotion environment',
		description:
			'A promotion environment was updated. Fires once per successful update that sends at least one field listed in `changed_fields`, even with an unchanged value. A failed or conflicted update does not fire it, and neither does an update that only resends the current provider.',
		properties: z.object({
			user_id: z.string(),
			environment_id: z.string(),
			direction: z.enum(['apply', 'promote']),
			changed_fields: z
				.array(z.enum(['name', 'remote', 'provider', 'settings']))
				.describe(
					'Never the values. `name`, `remote` and `settings` are listed when the request sent them, even with an unchanged value. `provider` is listed only when the request names another provider',
				),
		}),
	},
	USER_DELETED_PROMOTION_ENVIRONMENT: {
		name: 'User deleted promotion environment',
		description: 'A promotion environment was deleted. Fires once per successful delete.',
		properties: z.object({
			user_id: z.string(),
			environment_id: z.string(),
			direction: z.enum(['apply', 'promote']),
			environment_scope: z.enum(['instance', 'projects']),
		}),
	},
	USER_CONNECTED_PROMOTION_ENVIRONMENT: {
		name: 'User connected promotion environment',
		description:
			'A user connected n8n to a promotion environment. Fires once per attempt, on success and on failure.',
		properties: z.object({
			user_id: z.string(),
			environment_id: z.string(),
			direction: z.enum(['apply', 'promote']),
			outcome: z.enum(['success', 'failed']),
			failure_kind: failureKind,
			duration_ms: z.number(),
		}),
	},
	USER_PROMOTED_CHANGES: {
		name: 'User promoted changes',
		description:
			'A user pushed changes to the promotion repository, for the whole instance or for one project. Fires once per attempt after n8n resolves the environment, on success and on failure. Later checks, such as the scope, checkout or package checks, also fire it when they fail.',
		properties: z.object({
			user_id: z.string(),
			environment_id: z.string(),
			scope,
			project_id: z.string().optional().describe("Set only when the scope is 'project'"),
			outcome: z
				.enum(['success', 'success_with_warnings', 'failed'])
				.describe(
					"'success_with_warnings' = the push worked, but a follow-up step, such as opening the merge request, failed",
				),
			failure_kind: failureKind,
			duration_ms: z.number(),
			workflow_count: z.number().optional().describe('Set when the outcome is not failed'),
			folder_count: z.number().optional().describe('Set when the outcome is not failed'),
			credential_count: z.number().optional().describe('Set when the outcome is not failed'),
			data_table_count: z.number().optional().describe('Set when the outcome is not failed'),
			variable_count: z.number().optional().describe('Set when the outcome is not failed'),
			tag_count: z.number().optional().describe('Set when the outcome is not failed'),
			selected_workflow_count: z
				.number()
				.optional()
				.describe("Set only when the scope is 'project'. Workflows the user selected"),
			opened_review: z
				.boolean()
				.optional()
				.describe('Set when the outcome is not failed. True when the push opened a merge request'),
		}),
	},
	USER_APPLIED_PROMOTION_CHANGES: {
		name: 'User applied promotion changes',
		description:
			'A user applied changes from the promotion repository, for the whole instance or for one project. Fires once per attempt after n8n resolves the environment, on every outcome, including continued applies. Later checks, such as the scope, checkout or package checks, also fire it when they fail.',
		properties: z.object({
			user_id: z.string(),
			environment_id: z.string(),
			scope,
			project_id: z.string().optional().describe("Set only when the scope is 'project'"),
			outcome: z
				.enum(['applied', 'blocked', 'source_changed', 'failed'])
				.describe(
					"'blocked' = the check found blocking issues, so nothing was imported; 'source_changed' = the branch changed after the user reviewed it, so nothing was imported",
				),
			failure_kind: failureKind,
			duration_ms: z.number(),
			workflows_changed: z
				.number()
				.optional()
				.describe(
					"Set when the outcome is 'applied'. Workflows created, updated, archived and deleted",
				),
			workflows_failed_to_publish: z
				.number()
				.optional()
				.describe("Set when the outcome is 'applied'"),
		}),
	},
	USER_OPENED_PROMOTION_MERGE_REQUEST: {
		name: 'User opened promotion merge request',
		description:
			'A promotion push opened a merge request on the Git host and n8n recorded the review. Fires once per opened review.',
		properties: z.object({
			user_id: z.string(),
			environment_id: z.string(),
			review_type: z.enum(['gitlab']),
			has_conflicts: z
				.boolean()
				.describe('As the Git host reports it when the merge request opens'),
		}),
	},
	USER_APPROVED_PROMOTION_REVIEW: {
		name: 'User approved promotion review',
		description:
			'A user approved a promotion review in n8n, which approves and merges the merge request on the Git host. Fires once per attempt on an existing review, on success and on failure. It does not fire when the feature is off or the review does not exist.',
		properties: z.object({
			user_id: z.string(),
			promotion_review_id: z.string(),
			environment_id: z
				.string()
				.nullable()
				.describe('Null when the environment was deleted after the review opened'),
			review_type: z.enum(['gitlab']),
			review_age_ms: z.number().describe('Time from the review opening to this approval'),
			outcome: z.enum(['merged', 'failed']),
			failure_kind: failureKind,
			duration_ms: z.number(),
		}),
	},
	USER_SWITCHED_TO_ENVIRONMENTS_V2: {
		name: 'User switched to environments v2',
		description:
			'An admin moved the instance from Environments (source control) to Environments v2 (promotions) in the settings. Fires after n8n saves the preference, and only when the version changes.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
	USER_SWITCHED_BACK_TO_ENVIRONMENTS_V1: {
		name: 'User switched back to environments v1',
		description:
			'An admin moved the instance from Environments v2 (promotions) back to Environments (source control) in the settings. Fires after n8n saves the preference, and only when the version changes.',
		properties: z.object({
			user_id: z.string(),
		}),
	},
});
