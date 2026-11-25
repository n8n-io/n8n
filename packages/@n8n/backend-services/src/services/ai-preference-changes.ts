import type { AiPreference } from '@n8n/db';
import { BadRequestError, ConflictError, ForbiddenError } from '@n8n/errors';

export type SharedPreferenceChange = {
	id: string;
	scope: 'project' | 'instance';
	projectId?: string;
	/** Omit content only for an explicitly selected removal. */
	content?: string;
};

export type SharedPreferencePlan = {
	items: Array<
		SharedPreferenceChange & {
			action: 'create' | 'update' | 'delete' | 'skip';
			previous: AiPreference | null;
		}
	>;
	issues: SharedPreferenceIssue[];
	newProjectIds: string[];
};

export type SharedPreferenceIssue = {
	kind: 'conflict' | 'forbidden' | 'invalid';
	preferenceId?: string;
	message: string;
};

export function toSharedPreferenceIssue(error: unknown): SharedPreferenceIssue {
	if (error instanceof ConflictError) return { kind: 'conflict', message: error.message };
	if (error instanceof ForbiddenError) return { kind: 'forbidden', message: error.message };
	if (error instanceof BadRequestError) return { kind: 'invalid', message: error.message };
	throw error;
}
