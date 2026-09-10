import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

/**
 * Absent for a write that no user made — an environment bootstrap writes the policy with no
 * actor, and `user_id` is what builds the RudderStack user, so a placeholder would create one.
 */
const userId = z.string().optional();

const source = z
	.enum(['user', 'environment'])
	.describe("'environment' is a bootstrap write from configuration, with no acting user");

const scope = z
	.enum(['instance', 'project'])
	.describe('Which scope the policy was written at; project policies compose under instance');

const projectId = z.string().optional().describe('Absent at instance scope');

const ruleCounts = {
	rule_count: z.number(),
	allow_rule_count: z.number(),
	deny_rule_count: z.number(),
	delegate_rule_count: z
		.number()
		.describe('Always 0 at project scope, which rejects the delegate action'),
};

export const NODE_TYPE_POLICIES_TELEMETRY = defineTelemetryEvents({
	USER_SAVED_NODE_TYPE_POLICY: {
		name: 'User saved node type policy',
		description:
			'A node type availability policy was saved for one scope through the composed write that the policy UI uses. One event per save, covering both the scope default action and its rules. Rule-level edits through the advanced document and attachment APIs report separately. The type counts and list report what this scope decides on its own, so at project scope they are the project layer before it composes with the instance policy.',
		properties: z.object({
			user_id: userId,
			source,
			scope,
			project_id: projectId,
			default_action: z
				.enum(['allow', 'deny', 'delegate'])
				.describe('What the scope decides for a type that no rule matches'),
			previous_default_action: z
				.enum(['allow', 'deny', 'delegate'])
				.nullable()
				.describe('Null on the first write to this scope, which had no stored default'),
			is_first_write: z
				.boolean()
				.describe('Whether this write created the scope; an unwritten scope allows every type'),
			...ruleCounts,
			name_selector_count: z.number().describe('Rules that target one exact node type name'),
			package_selector_count: z.number().describe('Rules that target a whole node package'),
			evaluated_type_count: z
				.number()
				.describe('Node types this instance knows, and so the denominator for the counts below'),
			blocked_type_count: z.number(),
			allowed_type_count: z.number(),
			delegated_type_count: z
				.number()
				.describe('Types a project can opt into; always 0 at project scope'),
			listed_types: z
				.array(z.string())
				.describe(
					'The named node types on whichever side listed_types_side reports, capped at 100. Node type names, not user data',
				),
			listed_types_side: z
				.enum(['blocked', 'allowed'])
				.describe(
					'Which side listed_types names. The shorter side is sent: blocked under an allow-by-default policy, allowed under a deny-by-default one',
				),
			listed_types_truncated: z.boolean().describe('Whether the cap dropped names from the list'),
			previous_rule_count: z.number().nullable().describe('Null on the first write to this scope'),
			shadow_warning_count: z
				.number()
				.describe('Saved rules that can never match, because an earlier rule already covers them'),
			version: z.number().describe('The scope version after the write'),
		}),
	},
	USER_UPDATED_NODE_TYPE_POLICY_DOCUMENT: {
		name: 'User updated node type policy document',
		description:
			'A policy document was created, edited, or deleted through the advanced instance-only document API. The composed save that the policy UI uses reports as "User saved node type policy" instead. Rule counts describe the document after the operation, so a delete reports 0 and carries the deleted size in previous_rule_count.',
		properties: z.object({
			user_id: userId,
			source,
			operation: z.enum(['created', 'updated', 'deleted']),
			policy_id: z.string(),
			...ruleCounts,
			previous_rule_count: z.number().nullable().describe('Null on a created document'),
		}),
	},
	USER_UPDATED_NODE_TYPE_POLICY_ATTACHMENTS: {
		name: 'User updated node type policy attachments',
		description:
			'The set of policy documents attached to one scope was replaced through the advanced instance-only attachment API. Reports the resulting set, not the individual add or remove.',
		properties: z.object({
			user_id: userId,
			source,
			scope,
			project_id: projectId,
			scope_id: z.string(),
			attachment_count: z.number(),
			floor_attachment_count: z
				.number()
				.describe('Attachments that a narrower scope cannot override'),
			previous_attachment_count: z.number(),
		}),
	},
});
