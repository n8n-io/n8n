import type { AiPreference } from '@n8n/db';

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
	issues: Array<{ preferenceId?: string; message: string }>;
	newProjectIds: string[];
};
