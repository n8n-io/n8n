import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const failureKind = z
	.enum(['user', 'git_remote', 'unexpected'])
	.optional()
	.describe(
		"Set only when the outcome is 'failed'. 'user' = the request or state was wrong (4xx or promotion conflict); 'git_remote' = the clone, push or fetch failed against the remote; 'unexpected' = anything else",
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
			'A promotion provider (a Git connection) was created. Fires once per created provider.',
		properties: z.object({
			user_id: z.string(),
			provider_id: z.string(),
			provider_type: z.enum(['git', 'gitlab']),
			auth_type: z.enum(['ssh-key', 'token']),
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
	USER_CLONED_PROMOTION_REPOSITORY: {
		name: 'User cloned promotion repository',
		description:
			'A user cloned the repository of a promotion environment. Fires once per attempt, on success and on failure.',
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
			'A user pushed changes to the promotion repository, for the whole instance or for one project. Fires once per attempt that passed validation, on success and on failure.',
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
	USER_APPLIED_CHANGES: {
		name: 'User applied changes',
		description:
			'A user applied changes from the promotion repository, for the whole instance or for one project. Fires once per attempt that passed validation, on every outcome, including continued applies.',
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
});
