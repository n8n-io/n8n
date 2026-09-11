import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

/**
 * Who a preference applies to. The scope decides both who may edit it and who
 * receives it, so it is the primary segmentation for adoption.
 */
const scopeType = z
	.enum(['user', 'project', 'instance'])
	.describe('Who the preference applies to: only its author, one project, or the whole instance');

/**
 * The preference text is free-form user writing and never leaves the instance.
 * Length stands in for it, because the open question is whether people write
 * usable guidance or one-word notes.
 */
const textLength = z
	.number()
	.describe('Character count of the preference text. The text itself is never reported');

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
				.enum(['row', 'bulk'])
				.describe('`row` is the per-row Delete button, `bulk` is the selection toolbar'),
			scope_types: z.array(scopeType).describe('Distinct scopes the deleted preferences covered'),
		}),
	},
});
