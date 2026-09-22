import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';
import { assistantSurfaceSchema } from '../schemas';

/** The scope decides who edits a preference and who receives it. */
const scopeType = z
	.enum(['user', 'project', 'instance'])
	.describe('Who the preference applies to: only its author, one project, or the whole instance');

/** Length only. The text is free-form user writing. */
const textLength = z
	.number()
	.describe('Character count of the preference text. The text itself is never reported');

/** Keep settings UI activity separate from assistant activity. */
const surface = z
	.enum(['ui', 'aia', 'mcp'])
	.describe('Surface the event came from, with the same values as the `source` column');

export const CONTEXT_TELEMETRY = defineTelemetryEvents({
	USER_CREATED_PREFERENCE: {
		name: 'User created preference',
		description:
			'A user saved a new preference from the Context settings area. Fires once the save succeeds, so opening the modal and cancelling reports nothing.',
		properties: z.object({
			scope_type: scopeType,
			text_length: textLength,
			project_id: z.string().optional().describe('Present only for a project-scoped preference'),
		}),
	},
	USER_UPDATED_PREFERENCE: {
		name: 'User updated preference',
		description:
			'A user saved an edit to an existing preference. Fires once the save succeeds. Reports the resulting scope, not the prior one; `scope_changed` tells them apart.',
		properties: z.object({
			scope_type: scopeType,
			text_length: textLength,
			scope_changed: z
				.boolean()
				.describe('Whether this edit moved the preference to a different scope'),
			project_id: z
				.string()
				.optional()
				.describe('Present only when the resulting scope is a project'),
		}),
	},
	USER_DELETED_PREFERENCES: {
		name: 'User deleted preferences',
		description:
			'A user deleted one or more preferences. One event covers a single row action and a bulk delete; `source` tells them apart and `count` carries how many went. Fires after the delete succeeds and the confirmation was accepted.',
		properties: z.object({
			count: z.number().describe('How many preferences the operation deleted'),
			source: z
				.enum(['row', 'bulk', 'rejected'])
				.describe(
					'`row` is the per-row Delete button and `bulk` the selection toolbar on the settings page. `rejected` is the Undo on the chat card: the user did not accept a preference the assistant saved, a late refusal of one they first let stand',
				),
			scope_types: z.array(scopeType).describe('Distinct scopes the deleted preferences covered'),
		}),
	},

	// ─── Assistant-written preferences ───

	PREFERENCES_APPLIED_TO_TURN: {
		name: 'Preferences applied to a turn',
		description:
			'A turn was built with the saved preferences available to it. Fires once for each turn that ran the preferences path, including a turn that applied none, so the share of turns with preferences is computable. CONTEXT-139 fires it.',
		properties: z.object({
			count: z.number().describe('Preferences the request carried. 0 when none applied'),
			scope_types: z.array(scopeType).describe('Distinct scopes the applied preferences covered'),
			rendered_length: z
				.number()
				.describe(
					'Characters in the rendered block. Reviews the caps: a 95th percentile above 8,000 means the caps need new numbers',
				),
			surface: assistantSurfaceSchema,
			injected_this_turn: z
				.boolean()
				.describe(
					'False when the text was unchanged and an earlier block in the same conversation still carries it. Shows how often re-injecting on every turn actually costs anything',
				),
			turn_latency_ms: z
				.number()
				.optional()
				.describe('Wall-clock time of the turn. Paired with `count` to show the cost of the block'),
			turn_token_count: z
				.number()
				.optional()
				.describe('Input tokens of the turn, so the cost with and without the block is comparable'),
		}),
	},

	ASSISTANT_SAVED_PREFERENCE: {
		name: 'Assistant saved preference',
		description:
			'An AI surface created or updated a preference on the user behalf, after the user accepted it. Kept apart from the UI events so an assistant write is never counted as a person writing in settings.',
		properties: z.object({
			surface: assistantSurfaceSchema,
			scope_type: scopeType,
			text_length: textLength,
			replaced_existing: z
				.boolean()
				.describe('Whether the write updated an existing preference instead of adding one'),
		}),
	},

	PREFERENCE_CONFIRMATION_SHOWN: {
		name: 'Preference confirmation shown',
		description:
			'The assistant proposed a preference and the confirmation card was shown. Fires when the card appears, whatever the user does next.',
		properties: z.object({
			surface: assistantSurfaceSchema,
			scope_type: scopeType.describe('Scope the assistant offered'),
			text_length: textLength,
		}),
	},

	PREFERENCE_CONFIRMATION_RESOLVED: {
		name: 'Preference confirmation resolved',
		description:
			'The user answered a preference confirmation. A high `rejected` share means the assistant proposes the wrong preferences, and no other number shows that.',
		properties: z.object({
			surface: assistantSurfaceSchema,
			outcome: z
				.enum(['accepted', 'accepted_after_edit', 'rejected'])
				.describe('`accepted_after_edit` means the user changed the text before accepting'),
			scope_type: scopeType.describe(
				'Scope the preference was saved with, or the offered scope on a rejection',
			),
			text_length: textLength.describe('Character count of the text the user accepted or rejected'),
		}),
	},

	PREFERENCE_SCOPE_ACCEPTED: {
		name: 'Preference scope accepted',
		description:
			'The scope the user accepted against the scope the assistant offered. Shows whether the assistant reads the difference between a personal habit and a team rule. Fires only on an accepted write.',
		properties: z.object({
			surface: assistantSurfaceSchema,
			offered_scope: scopeType,
			accepted_scope: scopeType,
			scope_changed: z.boolean().describe('Whether the user moved the write to another scope'),
		}),
	},

	PREFERENCE_WRITE_REJECTED: {
		name: 'Preference write rejected',
		description:
			'A preference write was refused before it reached the database. Separates a rule the code applied from a user saying no, which is `Preference confirmation resolved`.',
		properties: z.object({
			surface,
			reason: z
				.enum([
					'too_long',
					'scope_full',
					'duplicate',
					'not_permitted',
					'blocked_by_admin',
					'failed',
				])
				.describe(
					'`duplicate` is a write the assistant avoided because the same preference was saved already. `scope_full` is the per-scope cap. `blocked_by_admin` is the assistant permission set to blocked',
				),
			scope_type: scopeType.optional().describe('Absent when the write named no usable scope'),
			text_length: textLength.optional(),
		}),
	},
});
