import type {
	AssistantSkillContext,
	AssistantSkillContent,
	AssistantSkillFileContent,
	AssistantSkillProvider,
	AssistantSkillSummary,
} from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { SkillService } from './skill.service';
import { AssistantSkillsRollout } from './assistant-skills-rollout';

@Service()
export class HubAssistantSkillProvider implements AssistantSkillProvider {
	constructor(
		private readonly rollout: AssistantSkillsRollout,
		private readonly skillService: SkillService,
	) {}

	async isEnabled(): Promise<boolean> {
		return await this.rollout.isEnabled();
	}

	async listSkills(context: AssistantSkillContext): Promise<AssistantSkillSummary[]> {
		if (!(await this.rollout.isEnabled())) return [];
		return await this.skillService.listForAssistant(context);
	}

	async readSkill(
		context: AssistantSkillContext,
		skillId: string,
		versionId?: string,
	): Promise<AssistantSkillContent | null> {
		if (!(await this.rollout.isEnabled())) return null;
		return await this.skillService.readForAssistant(context, skillId, versionId);
	}

	async readFile(
		context: AssistantSkillContext,
		skillId: string,
		versionId: string,
		path: string,
	): Promise<AssistantSkillFileContent | null> {
		if (!(await this.rollout.isEnabled())) return null;
		return await this.skillService.readFileForAssistant(context, skillId, versionId, path);
	}
}
