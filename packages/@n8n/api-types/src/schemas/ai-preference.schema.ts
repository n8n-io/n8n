import type { Scope } from '@n8n/permissions';
import { z } from 'zod';

/**
 * Gates the AI preferences feature: the Context settings UI and the injection of
 * saved preferences into the AI assistant and the MCP server.
 *
 * Multivariate: the enabled arm is the `variant` string, not `true`. Every reader
 * compares against `CONTEXT_PREFERENCES_ENABLED_VARIANT`, so `control` and an
 * unassigned user both fail closed.
 */
export const CONTEXT_PREFERENCES_FLAG = '111_context_preferences';
export const CONTEXT_PREFERENCES_CONTROL_VARIANT = 'control';
export const CONTEXT_PREFERENCES_ENABLED_VARIANT = 'variant';

/**
 * `ai_preference.content` is a text column, so this cap guards the prompt the
 * preferences are injected into, not the storage.
 */
export const AI_PREFERENCE_CONTENT_MAX_LENGTH = 2000;

/**
 * Who a preference applies to. Not a stored column: the `ai_preference` entity
 * encodes it as a tri-state over `userId` and `projectId`, and a CHECK constraint
 * forbids setting both.
 */
export const aiPreferenceScopeSchema = z.enum(['user', 'project', 'instance']);

export type AiPreferenceScope = z.infer<typeof aiPreferenceScopeSchema>;

/** Blank content never reaches a prompt, so it is refused rather than stored. */
export const aiPreferenceContentSchema = z
	.string()
	.trim()
	.min(1, 'content must not be empty')
	.max(
		AI_PREFERENCE_CONTENT_MAX_LENGTH,
		`content cannot be longer than ${AI_PREFERENCE_CONTENT_MAX_LENGTH} characters`,
	);

export type AiPreferenceProjectDto = {
	id: string;
	name: string;
	/** Discriminated, so a client can render it without narrowing it first. */
	icon: { type: 'emoji'; value: string } | { type: 'icon'; value: string } | null;
};

/** One `ai_preference` row, as the REST layer returns it. */
export type AiPreferenceDto = {
	id: string;
	content: string;
	/** Set when the preference belongs to one user. */
	userId: string | null;
	/** Set when the preference belongs to one project. */
	projectId: string | null;
	project: AiPreferenceProjectDto | null;
	/** What the requesting user may do to this row. */
	scopes: Scope[];
	createdAt: string;
	updatedAt: string;
};

export type AiPreferenceListDto = {
	count: number;
	data: AiPreferenceDto[];
};
