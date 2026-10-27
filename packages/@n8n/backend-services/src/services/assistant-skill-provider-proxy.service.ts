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
	files: Array<{ path: string }>;
}

export interface AssistantSkillFileContent {
	skillId: string;
	versionId: string;
	path: string;
	content: string;
}

/** All reads enforce current availability, user permissions, and session scope. */
export interface AssistantSkillProvider {
	isEnabled(): Promise<boolean>;
	listSkills(context: AssistantSkillContext): Promise<AssistantSkillSummary[]>;
	/** Reads the requested version, or the latest saved version when omitted. */
	readSkill(
		context: AssistantSkillContext,
		skillId: string,
		versionId?: string,
	): Promise<AssistantSkillContent | null>;
	readFile(
		context: AssistantSkillContext,
		skillId: string,
		versionId: string,
		path: string,
	): Promise<AssistantSkillFileContent | null>;
}

/** Keeps the Assistant available when the Hub module is absent. */
@Service()
export class AssistantSkillProviderProxy implements AssistantSkillProvider {
	private provider: AssistantSkillProvider | undefined;

	async isEnabled(): Promise<boolean> {
		return (await this.provider?.isEnabled()) ?? false;
	}

	registerProvider(provider: AssistantSkillProvider): void {
		this.provider = provider;
	}

	async listSkills(context: AssistantSkillContext): Promise<AssistantSkillSummary[]> {
		return (await this.provider?.listSkills(context)) ?? [];
	}

	async readSkill(
		context: AssistantSkillContext,
		skillId: string,
		versionId?: string,
	): Promise<AssistantSkillContent | null> {
		return (await this.provider?.readSkill(context, skillId, versionId)) ?? null;
	}

	async readFile(
		context: AssistantSkillContext,
		skillId: string,
		versionId: string,
		path: string,
	): Promise<AssistantSkillFileContent | null> {
		return (await this.provider?.readFile(context, skillId, versionId, path)) ?? null;
	}
}
