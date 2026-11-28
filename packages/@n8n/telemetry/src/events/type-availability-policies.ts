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

/**
 * Where the editor showed a type restriction. The components that pass it type their prop with
 * `RestrictedTypeSurface`, so the prop and this schema share one list.
 */
const RESTRICTED_TYPE_SURFACES = [
	'node_creator',
	'command_bar',
	'ndv',
	'setup_panel',
	'template',
	'tools_connection',
	'chat_hub_tools',
	'chat_hub_tool_settings',
	'chat_hub_tools_manager',
	'chat_hub_agent_editor',
	'agent_model_selector',
	'agent_tool_config',
	'agent_chat',
	'credential_select',
	'credential_select_modal',
	'node_credentials',
	'credential_card',
	'credential_edit',
	'transfer_dialog',
] as const;
export type RestrictedTypeSurface = (typeof RESTRICTED_TYPE_SURFACES)[number];

const surface = z
	.enum(RESTRICTED_TYPE_SURFACES)
	.describe('Where in the editor the user met the restriction');

const restrictionScope = z
	.enum(['instance', 'project'])
	.nullable()
	.describe('Which scope restricts the type. Null when the editor does not know it');

const contactAudience = z
	.enum(['instance', 'project'])
	.describe('Whose admins the dialog asks the user to contact');

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
	USER_OPENED_RESTRICTED_TYPE_DETAILS: {
		name: 'User opened restricted type details',
		description:
			'The card that explains why a node or credential type is restricted opened in the editor. The card opens on hover or focus of the restricted item, so this measures attention, not only clicks. Fires at most once for each mounted card. A card that opens only because a list selected its row, for example the first search result, does not fire it.',
		properties: z.object({
			kind,
			scope: restrictionScope,
			source: surface,
		}),
	},
	USER_OPENED_CONTACT_ADMIN_DIALOG: {
		name: 'User opened contact admin dialog',
		description:
			'The dialog that lists the admins who can change a type availability policy opened. Fires once each time the dialog opens, from any surface.',
		properties: z.object({
			kind,
			audience: contactAudience,
			source: surface,
			restricted_type_count: z
				.number()
				.describe('How many restricted types the request names. More than 1 for a bulk request'),
		}),
	},
	USER_CLICKED_ADMIN_EMAIL: {
		name: 'User clicked admin email',
		description:
			'The user clicked the email link of an admin in the contact admin dialog. This is the point where a user asks an admin to change a type availability policy.',
		properties: z.object({
			kind,
			audience: contactAudience,
			source: surface,
			admin_count: z.number().describe('How many admins the dialog listed'),
		}),
	},
	USER_CLICKED_REPLACE_RESTRICTED_NODE: {
		name: 'User clicked replace restricted node',
		description:
			'The user chose to replace a restricted node from its node details view, instead of asking an admin for access.',
		properties: z.object({
			scope: restrictionScope,
		}),
	},
});
