import type { Scope } from '@n8n/permissions';
import { z } from 'zod';

/** Multivariate flag: only `variant` enables the feature. */
export const CONTEXT_PREFERENCES_FLAG = '111_context_preferences';
export const CONTEXT_PREFERENCES_CONTROL_VARIANT = 'control';
export const CONTEXT_PREFERENCES_ENABLED_VARIANT = 'variant';

/** Caps the prompt text, not the column. */
export const AI_PREFERENCE_CONTENT_MAX_LENGTH = 2000;

/**
 * Preferences one scope can hold. A safety net rather than a budget: the rendered
 * block, not the row count, is what a prompt pays for, and the applied-preferences
 * event reports that length so the numbers can be reviewed against real data.
 */
export const AI_PREFERENCE_MAX_PER_SCOPE = 50;

/**
 * Which surface wrote the row. `ui` is the settings area, `aia` the n8n Assistant,
 * `mcp` an MCP client. Never taken from a request body: a client must not be able
 * to claim that the assistant wrote a row the user wrote.
 */
export const aiPreferenceSourceSchema = z.enum(['ui', 'aia', 'mcp']);

export type AiPreferenceSource = z.infer<typeof aiPreferenceSourceSchema>;

/** Derived from `userId` and `projectId`. A CHECK constraint forbids both. */
export const aiPreferenceScopeSchema = z.enum(['user', 'project', 'instance']);

export type AiPreferenceScope = z.infer<typeof aiPreferenceScopeSchema>;

export type AiPreferenceTarget =
	| { scope: 'project'; projectId: string }
	| { scope: 'user'; userId: string }
	| { scope: 'instance' };

/** A project id wins, then a user id. Neither means the whole instance. */
export function aiPreferenceTargetOf(row: {
	userId: string | null;
	projectId: string | null;
}): AiPreferenceTarget {
	if (row.projectId) return { scope: 'project', projectId: row.projectId };
	if (row.userId) return { scope: 'user', userId: row.userId };
	return { scope: 'instance' };
}

export function aiPreferenceScopeOf(row: {
	userId: string | null;
	projectId: string | null;
}): AiPreferenceScope {
	return aiPreferenceTargetOf(row).scope;
}

/** Blank content never reaches a prompt, so it is refused rather than stored. */
export const aiPreferenceContentSchema = z
	.string()
	.trim()
	.min(1, 'content must not be empty')
	.max(
		AI_PREFERENCE_CONTENT_MAX_LENGTH,
		`content cannot be longer than ${AI_PREFERENCE_CONTENT_MAX_LENGTH} characters`,
	)
	// Written for a model to read: the `save_user_preference` tool validates its content
	// against this schema, so the limits travel with it and a model reads them before it
	// writes instead of discovering them through a rejection.
	.describe(
		`One instruction, written as the user would say it. At most ${AI_PREFERENCE_CONTENT_MAX_LENGTH} characters. A scope that already holds ${AI_PREFERENCE_MAX_PER_SCOPE} preferences refuses a new one, so edit or delete one first.`,
	);

export type AiPreferenceProjectDto = {
	id: string;
	name: string;
	type: 'personal' | 'team';
	icon: { type: 'emoji'; value: string } | { type: 'icon'; value: string } | null;
};

/** Every field but `id` is nullable on the entity. */
export type AiPreferenceUserDto = {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
};

export type AiPreferenceDto = {
	id: string;
	content: string;
	/** Applies in every project. */
	userId: string | null;
	user: AiPreferenceUserDto | null;
	/** Applies only in that project. */
	projectId: string | null;
	project: AiPreferenceProjectDto | null;
	/** Which surface wrote the row. Rows written before the column existed read `ui`. */
	source: AiPreferenceSource;
	scopes: Scope[];
	createdAt: string;
	updatedAt: string;
};

export type AiPreferenceListDto = {
	count: number;
	data: AiPreferenceDto[];
};

export type AiPreferenceCountDto = {
	count: number;
};
