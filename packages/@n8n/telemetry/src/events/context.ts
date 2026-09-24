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
const surfaceType = z
	.enum(['ui', 'aia', 'mcp'])
	.describe('Surface the event came from, with the same values as the `source` column');

export const CONTEXT_TELEMETRY = defineTelemetryEvents({
	USER_VIEWED_PREFERENCES: {
		name: 'User viewed preferences',
		description:
			'A user opened the preferences list in the Context settings area. Fires on every visit, so it is the first step of the create funnel and the only sign that somebody read their saved preferences without changing one.',
		properties: z.object({
			count: z
				.number()
				.describe('Preferences the user can see in total, not the number the page showed'),
			scope_types: z
				.array(scopeType)
				.describe(
					'Distinct scopes on the page the visit loaded. The list pages at 50 rows, so a longer list reports the scopes of the first page only and does not cover `count`',
				),
		}),
	},
	USER_OPENED_PREFERENCE_MODAL: {
		name: 'User opened preference modal',
		description:
			'A user opened the create or edit dialog on the preferences settings page. Pairs with `User created preference` and `User updated preference`: an open with no save that follows is an abandoned edit, which no other event shows.',
		properties: z.object({
			mode: z
				.enum(['new', 'edit'])
				.describe('`new` is the Add button. `edit` is the pencil on an existing row'),
			scope_type: scopeType.optional().describe('Scope of the row being edited. Absent on `new`'),
		}),
	},
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
			surface: surfaceType
				.optional()
				.describe(
					'Where the user made the edit: `ui` is the settings page and `aia` the chat card. Absent on a row written before the chat card could edit',
				),
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
					'`row` is the per-row Delete button and `bulk` the selection toolbar on the settings page. `rejected` is the Undo on the chat card, Decline on the MCP review form, or the MCP undo tool: the user did not accept a preference the assistant saved, a late refusal of one they first let stand',
				),
			scope_types: z.array(scopeType).describe('Distinct scopes the deleted preferences covered'),
			surface: assistantSurfaceSchema
				.optional()
				.describe('Set on a `rejected` delete, to tell the chat card from an MCP client'),
			seconds_since_saved: z
				.number()
				.optional()
				.describe(
					'On a `rejected` delete, how long after the assistant write the user took it back. A short gap means the write itself was wrong, not a later change of mind',
				),
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
			surface: assistantSurfaceSchema.describe(
				'Always `aia`. An MCP client reads through a tool and never reports a turn, so it fires `Preferences read over MCP` instead',
			),
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

	PREFERENCES_READ_OVER_MCP: {
		name: 'Preferences read over MCP',
		description:
			'An MCP client called `get_user_preferences`. Kept apart from `Preferences applied to a turn` because an MCP read is not a turn: n8n hands the text over and never learns whether the client applied it, so the latency and token columns of the turn event would stay empty. Fires on a successful read, including one that found nothing.',
		properties: z.object({
			count: z.number().describe('Preferences the read returned. 0 when none are saved'),
			scope_types: z.array(scopeType).describe('Distinct scopes the returned preferences covered'),
			rendered_length: z
				.number()
				.describe(
					'Characters in the rendered block the client received. 0 when nothing is saved. Reviews the caps against the same number the turn event reports',
				),
			project_scoped: z
				.boolean()
				.describe('Whether the call named one project instead of reading every visible project'),
		}),
	},

	ASSISTANT_SAVED_PREFERENCE: {
		name: 'Assistant saved preference',
		description:
			'An AI surface created or updated a preference on the user behalf. The assistant writes first and the chat card is the confirmation, so this fires with the write, before the user has said anything. Kept apart from the UI events so an assistant write is never counted as a person writing in settings.',
		properties: z.object({
			surface: assistantSurfaceSchema,
			scope_type: scopeType,
			text_length: textLength,
			replaced_existing: z
				.boolean()
				.describe(
					'Whether the write updated an existing preference instead of adding one. Only `update_user_preference` on MCP sets this true. The chat assistant has no update tool, so an `aia` row is always false',
				),
		}),
	},

	PREFERENCE_CONFIRMATION_SHOWN: {
		name: 'Preference confirmation shown',
		description:
			'The assistant saved a preference and the user was given the way to edit or undo it: the chat card, the MCP review form, or, on an MCP client without elicitation, the tool result that tells the client to relay the saved text and the settings link. Fires with the write, whatever the user does next.',
		properties: z.object({
			surface: assistantSurfaceSchema,
			scope_type: scopeType.describe('Scope the assistant offered'),
			text_length: textLength,
		}),
	},

	USER_SAW_PREFERENCE_CARD: {
		name: 'User saw preference card',
		description:
			'The preference card rendered in the chat thread. `Preference confirmation shown` fires with the write, so it counts confirmations offered, not confirmations seen. The gap between the two is a write whose card never reached the screen, which an MCP client without a review form always produces.',
		properties: z.object({
			scope_type: scopeType.describe('Scope the card names at render time'),
			state: z
				.enum(['saved', 'edited', 'undone'])
				.describe(
					'State the card rendered in, so a re-render after an edit is not read as a new write',
				),
		}),
	},

	PREFERENCE_CONFIRMATION_RESOLVED: {
		name: 'Preference confirmation resolved',
		description:
			'How a preference the assistant saved was settled. `accepted` fires with the write itself: the assistant writes first and silence is agreement, so it is not a user answer. `accepted_after_edit` and `rejected` are the explicit user actions, and either one supersedes the `accepted` already recorded for the same preference: read the last outcome for a preference, not the count of them. A high share of edits and removals means the assistant saves the wrong preferences, and no other number shows that.',
		properties: z.object({
			surface: assistantSurfaceSchema,
			outcome: z
				.enum(['accepted', 'accepted_after_edit', 'rejected'])
				.describe(
					'`accepted` is implicit, fired with the write. `accepted_after_edit` means the user changed the text from the card or the MCP review form. `rejected` means the user took the write back: Undo on the card, Decline on the MCP review form, or the MCP undo tool. The same removal also fires `User deleted preferences` with source `rejected`',
				),
			scope_type: scopeType.describe(
				'Scope the preference was saved with, or the offered scope on a rejection',
			),
			text_length: textLength.describe('Character count of the text the user accepted or rejected'),
		}),
	},

	PREFERENCE_SCOPE_ACCEPTED: {
		name: 'Preference scope accepted',
		description:
			'The scope the user accepted against the scope offered. An accepted write from the assistant reports `user` for both, because the tool writes only `user`. A move from the chat card reports the scope the row left as `offered_scope`, so `user` appears there only on the first move off the default. Fires on an accepted assistant write and on every move from the card.',
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
			surface: surfaceType,
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
