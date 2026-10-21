import {
	ProjectScopeService,
	type AssistantSkillContext,
	type AssistantSkillContent,
	type AssistantSkillProvider,
	type AssistantSkillSummary,
} from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { SkillRepository } from './skill.repository';
import { SkillService } from './skill.service';
import { AssistantSkillsRollout } from './assistant-skills-rollout';

@Service()
export class HubAssistantSkillProvider implements AssistantSkillProvider {
	constructor(
		private readonly rollout: AssistantSkillsRollout,
		private readonly projectScopeService: ProjectScopeService,
		private readonly skillRepository: SkillRepository,
		private readonly skillService: SkillService,
	) {}

	async listSkills(context: AssistantSkillContext): Promise<AssistantSkillSummary[]> {
		if (!(await this.rollout.isEnabled())) return [];
		return await this.skillRepository.findAssistantSkillSummaries(
			await this.authorizedProject(context),
		);
	}

	async readSkill(
		context: AssistantSkillContext,
		skillId: string,
	): Promise<AssistantSkillContent | null> {
		if (!(await this.rollout.isEnabled())) return null;
		const projectId = await this.authorizedProject(context);
		const row = (await this.skillRepository.findLatestSaved([skillId])).get(skillId);
		if (!row) return null;
		const { skill, version, files } = row;
		if (
			skill.agentId !== null ||
			!skill.availableToAssistant ||
			!(await this.skillService.canAccess(context.user, skill, 'read'))
		)
			return null;
		const skillProjectId = skill.projectId;
		if (skillProjectId !== null && skillProjectId !== projectId) return null;
		return {
			id: skill.id,
			projectId: skillProjectId,
			name: version.name,
			description: version.description,
			versionId: version.id,
			version: version.version,
			instructions: version.instructions,
			frontmatter: version.frontmatter,
			files: files.map(({ path, content }) => ({ path, content })),
		};
	}

	private async authorizedProject({
		user,
		projectId,
	}: AssistantSkillContext): Promise<string | null> {
		if (!projectId) return null;
		const projects = await this.projectScopeService.getProjectIds(user, [
			'projectSkill:list',
			'projectSkill:read',
		]);
		return projects === null || projects.includes(projectId) ? projectId : null;
	}
}
