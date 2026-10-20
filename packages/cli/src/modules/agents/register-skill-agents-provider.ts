import { Container } from '@n8n/di';

import { SkillAgentsProxy } from '@/modules/skills/skill-agents-proxy.service';

import { AgentSkillUsageService } from './agent-skill-usage.service';

/** Tells the skills module which agents use skills, so that it never imports this module. */
export function registerSkillAgentsProvider(): void {
	Container.get(SkillAgentsProxy).registerProvider(Container.get(AgentSkillUsageService));
}
