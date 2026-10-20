import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

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

/** Both operations enforce current availability, user permissions, and session scope. */
export interface AssistantSkillProvider {
	listSkills(context: AssistantSkillContext): Promise<AssistantSkillSummary[]>;
	/** Returns the latest saved content and identifies the version that supplied it. */
	readSkill(context: AssistantSkillContext, skillId: string): Promise<AssistantSkillContent | null>;
}

/** The owning module registers a provider. An absent module contributes no skills. */
@Service()
export class AssistantSkillProviderProxy implements AssistantSkillProvider {
	private provider: AssistantSkillProvider | undefined;

	registerProvider(provider: AssistantSkillProvider): void {
		this.provider = provider;
	}

	async listSkills(context: AssistantSkillContext): Promise<AssistantSkillSummary[]> {
		return (await this.provider?.listSkills(context)) ?? [];
	}

	async readSkill(
		context: AssistantSkillContext,
		skillId: string,
	): Promise<AssistantSkillContent | null> {
		return (await this.provider?.readSkill(context, skillId)) ?? null;
	}
}
