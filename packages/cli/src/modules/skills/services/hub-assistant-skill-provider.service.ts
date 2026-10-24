import type {
	AssistantSkillContext,
	AssistantSkillContent,
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

	async listSkills(context: AssistantSkillContext): Promise<AssistantSkillSummary[]> {
		if (!(await this.rollout.isEnabled())) return [];
		return await this.skillService.listForAssistant(context);
	}

	async readSkill(
		context: AssistantSkillContext,
		skillId: string,
	): Promise<AssistantSkillContent | null> {
		if (!(await this.rollout.isEnabled())) return null;
		return await this.skillService.readForAssistant(context, skillId);
	}
}
