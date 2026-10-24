import type { User } from '@n8n/db';

export interface AssistantSkillContext {
	user: User;
	/** The current session project. Absent means instance skills only. */
	projectId?: string;
}

export interface AssistantSkillSummary {
	id: string;
	projectId: string | null;
	name: string;
	description: string;
	versionId: string;
	version: number;
}

export interface AssistantSkillContent extends AssistantSkillSummary {
	instructions: string;
	frontmatter: Record<string, unknown> | null;
	files: Array<{ path: string; content: string }>;
}
