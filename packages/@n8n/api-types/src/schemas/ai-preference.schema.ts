import type { Scope } from '@n8n/permissions';
import { z } from 'zod';

/** Multivariate flag: only `variant` enables the feature. */
export const CONTEXT_PREFERENCES_FLAG = '111_context_preferences';
export const CONTEXT_PREFERENCES_CONTROL_VARIANT = 'control';
export const CONTEXT_PREFERENCES_ENABLED_VARIANT = 'variant';

/** Caps the prompt text, not the column. */
export const AI_PREFERENCE_CONTENT_MAX_LENGTH = 2000;

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
