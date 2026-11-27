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

/**
 * Exported so callers that build these events from a domain event (which keeps `kind` as a
 * plain string, so a later kind needs no change there) can narrow it against the same set this
 * schema validates against, instead of redeclaring the list and risking drift.
 */
export const POLICY_KINDS = ['node-types', 'credential-types'] as const;
export type PolicyKind = (typeof POLICY_KINDS)[number];

const kind = z
	.enum(POLICY_KINDS)
	.describe(
		'Which type family the policy governs. Credential type policies report through these same events instead of a second set, so this is what tells the two apart.',
	);

const projectId = z.string().optional().describe('Absent at instance scope');

const ruleCounts = {
	rule_count: z.number(),
	allow_rule_count: z.number(),
	deny_rule_count: z.number(),
	delegate_rule_count: z
		.number()
		.describe('Always 0 at project scope, which rejects the delegate action'),
};

export const TYPE_AVAILABILITY_POLICIES_TELEMETRY = defineTelemetryEvents({
	USER_SAVED_TYPE_AVAILABILITY_POLICY: {
		name: 'User saved type availability policy',
		description:
			'A type availability policy (node types or credential types, per `kind`) was saved for one scope through the composed write that the policy UI uses. One event per save, covering both the scope default action and its rules. Rule-level edits through the advanced document and attachment APIs report separately. The type counts and list report what this scope decides on its own, so at project scope they are the project layer before it composes with the instance policy. Adding a project policy through `POST /project-policies` also reports here, with `origin: add-project-policy`.',
		properties: z.object({
			user_id: userId,
			source,
			kind,
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
			name_selector_count: z.number().describe('Rules that target one exact type name'),
			package_selector_count: z.number().describe('Rules that target a whole package'),
			extends_selector_count: z
				.number()
				.describe('Rules that target a credential type and every type built on it'),
			evaluated_type_count: z
				.number()
				.describe(
					"Types this instance knows for the policy's kind, and so the denominator for the counts below",
				),
			blocked_type_count: z.number(),
			allowed_type_count: z.number(),
			delegated_type_count: z
				.number()
				.describe('Types a project can opt into; always 0 at project scope'),
			blocked_types: z
				.array(z.string())
				.describe(
					'The types this policy makes unavailable, capped at 100. Type names, not user data. Compare the length against blocked_type_count to see whether the cap dropped any',
				),
			allowed_types: z
				.array(z.string())
				.describe('The types this policy leaves available, capped at 100 the same way'),
			previous_rule_count: z.number().nullable().describe('Null on the first write to this scope'),
			shadow_warning_count: z
				.number()
				.describe('Saved rules that can never match, because an earlier rule already covers them'),
			not_loaded_warning_count: z
				.number()
				.describe('Saved rules that name a package or type this instance has not loaded'),
			version: z.number().describe('The scope version after the write'),
			origin: z
				.enum(['save', 'add-project-policy'])
				.optional()
				.describe(
					"'add-project-policy' is the one-call create from the Add project policy dialog. It reports one event for each kind that had no project policy, with no rules and the allow default action",
				),
		}),
	},
	USER_UPDATED_TYPE_AVAILABILITY_POLICY_DOCUMENT: {
		name: 'User updated type availability policy document',
		description:
			'A policy document was created, edited, or deleted through the advanced instance-only document API. The composed save that the policy UI uses reports as "User saved type availability policy" instead. Rule counts describe the document after the operation, so a delete reports 0 and carries the deleted size in previous_rule_count.',
		properties: z.object({
			user_id: userId,
			source,
			kind,
			operation: z.enum(['created', 'updated', 'deleted']),
			policy_id: z.string(),
			...ruleCounts,
			previous_rule_count: z.number().nullable().describe('Null on a created document'),
		}),
	},
	USER_UPDATED_TYPE_AVAILABILITY_POLICY_ATTACHMENTS: {
		name: 'User updated type availability policy attachments',
		description:
			'The set of policy documents attached to one scope was replaced through the advanced instance-only attachment API. Reports the resulting set, not the individual add or remove.',
		properties: z.object({
			user_id: userId,
			source,
			kind,
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
	USER_OPENED_TYPE_ACCESS_DIALOG: {
		name: 'User opened type access dialog',
		description:
			'An admin opened the access dialog of one node or credential type on the instance policy page. Fires once the page knows the type, so a link to a type that the instance does not have does not fire it.',
		properties: z.object({
			kind,
			type_name: z.string().describe('The node or credential type name, not user data'),
			source: z
				.enum(['table', 'link'])
				.describe("'table' for a click in the policy table, 'link' for a URL that names the type"),
			current_access: z
				.enum(['allow', 'deny', 'delegate'])
				.describe('The instance access of the type when the dialog opened'),
		}),
	},
	USER_REVIEWED_TYPE_RESTRICTION: {
		name: 'User reviewed type restriction',
		description:
			'An admin answered the review that opens before a type that workflows use becomes restricted. A cancel does not reach the backend, so only this event reports it. A type that no workflow uses skips the review and does not fire it.',
		properties: z.object({
			kind,
			type_name: z.string().describe('The node or credential type name, not user data'),
			decision: z
				.enum(['confirm', 'cancel'])
				.describe("'cancel' also covers Escape and a click outside the review"),
			use_count: z
				.number()
				.nullable()
				.describe('Nodes that use the type. Null when the review could not load the counts'),
			workflow_count: z
				.number()
				.nullable()
				.describe('Workflows that use the type. Null when the review could not load the counts'),
			active_workflow_count: z
				.number()
				.nullable()
				.describe(
					'Active workflows that use the type. Null when the review could not load the counts',
				),
		}),
	},
});
