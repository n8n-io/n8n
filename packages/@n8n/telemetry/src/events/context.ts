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

/**
 * The acting user. `Telemetry.track` composes the PostHog distinct id from this property, and
 * `PostHogClient.track` drops an event whose distinct id is the bare instance id, so a backend
 * event that omits it reaches RudderStack and never reaches PostHog.
 */
const userId = z.string().describe('The acting user, on every surface including MCP');

/**
 * The same property on an event the editor also fires. posthog-js already knows the user there,
 * so the editor sends no `user_id` and only the backend emit sites set it.
 */
const optionalUserId = z
	.string()
	.optional()
	.describe(
		'The acting user. Absent on the events the editor fires, which identify the user already',
	);

/** Where a skill lives. An agent skill takes its project from its agent. */
const skillScope = z
	.enum(['project', 'agent', 'instance'])
	.describe('Where the skill lives: one project, one agent, or the whole instance');

const skillId = z.string().describe('The skill. Its name and text are never reported');

const skillProjectId = z
	.string()
	.optional()
	.describe(
		'The project of a project skill, or the project of the agent for an agent skill. Absent for an instance skill',
	);

/** The surface that wrote the skill. Kept apart from `skill.source`, which stores no MCP value. */
const skillSource = z
	.enum(['ui', 'agent', 'mcp', 'assistant'])
	.describe(
		'`ui` is the Skills settings page. `agent` is the agent builder: a person in its skill modal, or n8n Assistant when it builds the agent. `mcp` is an MCP client. `assistant` is n8n Assistant outside the agent builder',
	);

/** Whether a person or an assistant wrote the text. */
const skillMethod = z
	.enum(['manual', 'upload', 'ai'])
	.describe(
		'`manual` is text typed in the skill modal. `upload` is a SKILL.md file or folder parsed in the browser. `ai` is text that n8n Assistant or an MCP client wrote. Filter out `ai` to count the skills people write by hand',
	);

const preferenceExampleId = z
	.enum(['workflows', 'agents', 'credentials', 'answers'])
	.optional()
	.describe(
		'The example card on the empty preferences page that filled the text (experiment 127). Absent when the text box opened empty',
	);

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
			example_id: preferenceExampleId,
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
			example_id: preferenceExampleId,
		}),
	},
	USER_UPDATED_PREFERENCE: {
		name: 'User updated preference',
		description:
			'A user saved an edit to an existing preference. Fires once the save succeeds. Reports the resulting scope, not the prior one; `scope_changed` tells them apart.',
		properties: z.object({
			user_id: optionalUserId,
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
			user_id: optionalUserId,
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
			'An n8n Assistant turn put saved preferences into the conversation. Fires on the first turn of a thread that has preferences, and again on each turn that injects a new or changed preference. A turn that applies none, or whose block an earlier turn still carries, sends nothing. Rows before CONTEXT-363 fired on every turn, also with `count` 0, so filter on `injected_this_turn` and `count` > 0 when you compare across that change.',
		properties: z.object({
			user_id: userId,
			thread_id: z
				.string()
				.optional()
				.describe('The n8n Assistant thread. Joins the event to a build in the same thread'),
			run_id: z.string().optional().describe('The n8n Assistant run of this turn'),
			count: z
				.number()
				.describe('Preferences the request carried. Rows before CONTEXT-363 can report 0'),
			preference_ids: z
				.array(z.string())
				.optional()
				.describe(
					'Ids of the injected preferences, so reuse of one preference is countable. The text is never reported',
				),
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
					'Always true since CONTEXT-363. False on older rows, where the text was unchanged and an earlier block in the same conversation still carried it',
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
			user_id: userId,
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
			user_id: userId,
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
			user_id: userId,
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
			user_id: userId,
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
			'The scope the user accepted against the scope offered. An accepted write from the assistant reports `user` for both, because the tool writes only `user`. A later move reports the scope the row left as `offered_scope`, so `user` appears there only on the first move off the default. Fires on an accepted assistant write, on every move from the chat card, and on a move from MCP: the review form, or `update_user_preference` with a scope.',
		properties: z.object({
			user_id: userId,
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
			user_id: optionalUserId,
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
	// ─── Skills ───

	USER_VIEWED_SKILLS: {
		name: 'User viewed skills',
		description:
			'A user opened the Skills page in the Context settings area. Fires on every visit, so it counts how often the page is used, also when the user changes nothing.',
		properties: z.object({
			count: z
				.number()
				.describe('Skills the user can see in total, not the number the first page showed'),
		}),
	},
	USER_OPENED_SKILL: {
		name: 'User opened skill',
		description:
			'A user opened one skill from the Skills settings page, in the editor or, without the edit permission, in the viewer. Fires once the skill loads. Kept apart from `User opened agent skill`, which is the agent builder.',
		properties: z.object({
			skill_id: skillId,
			scope: skillScope,
			project_id: skillProjectId,
			read_only: z.boolean().describe('Whether the user may only read the skill'),
		}),
	},
	USER_DOWNLOADED_SKILL: {
		name: 'User downloaded skill',
		description:
			'A user downloaded one skill from the row menu on the Skills settings page. Fires once the browser gets the file.',
		properties: z.object({
			skill_id: skillId,
			scope: skillScope,
			project_id: skillProjectId,
			format: z
				.enum(['markdown', 'zip'])
				.describe('`markdown` is a lone SKILL.md. `zip` holds SKILL.md and its reference files'),
		}),
	},
	USER_CREATED_SKILL: {
		name: 'User created skill',
		description:
			'A skill was created from the settings page, the agent builder, n8n Assistant or an MCP client. Fires once the create commits. A copy that the server makes on its own, such as the data migration or an agent duplicate, reports nothing.',
		properties: z.object({
			user_id: userId,
			skill_id: skillId,
			scope: skillScope,
			project_id: skillProjectId,
			source: skillSource,
			method: skillMethod,
		}),
	},
	USER_UPDATED_SKILL: {
		name: 'User updated skill',
		description:
			'A save stored a new version of a skill. A save with unchanged content stores no version and reports nothing, also when it moves the skill. Reports the scope after the save.',
		properties: z.object({
			user_id: userId,
			skill_id: skillId,
			scope: skillScope,
			project_id: skillProjectId,
			source: skillSource,
			version: z.number().describe('The number of the version this save stored'),
			scope_changed: z.boolean().describe('Whether the same save moved the skill to another scope'),
		}),
	},
	MCP_LISTED_SKILLS: {
		name: 'MCP listed skills',
		description:
			'An MCP client called `skills/list` or `skills/get` of the MCP skills extension. Both return skill entries without their text. Claude Code lists the skills each time it connects, so this counts sessions that receive the skills, not skill use.',
		properties: z.object({
			user_id: userId,
			method: z
				.enum(['skills/list', 'skills/get'])
				.describe('`skills/list` returns one page of skills. `skills/get` returns one skill'),
			count: z.number().describe('Skills the response returned'),
		}),
	},
	MCP_READ_SKILL_FILE: {
		name: 'MCP read skill file',
		description:
			'An MCP client read one file of a skill through `resources/read` of the MCP skills extension. Fires on a successful read only. Claude Code reads each SKILL.md when it connects and keeps it in a cache by digest, so a SKILL.md read means a skill was loaded or changed, not used. A reference read is the nearest sign that a model used the skill.',
		properties: z.object({
			user_id: userId,
			skill_id: skillId,
			scope: skillScope,
			project_id: skillProjectId,
			file: z
				.enum(['skill_md', 'reference'])
				.describe('`skill_md` is the SKILL.md file. `reference` is a file under `references/`'),
		}),
	},
	USER_DELETED_SKILL: {
		name: 'User deleted skill',
		description:
			'A user deleted a skill from the settings page, n8n Assistant or an MCP client. Fires once the delete commits. Removing a skill from one agent keeps the skill and reports nothing here.',
		properties: z.object({
			user_id: userId,
			skill_id: skillId,
			scope: skillScope,
			project_id: skillProjectId,
			source: skillSource,
		}),
	},
});
