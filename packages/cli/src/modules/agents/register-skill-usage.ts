import { Container } from '@n8n/di';

import { SkillUsageProxy } from '@/modules/skills';

import { AgentSkillUsage } from './agent-skill-usage';

/** Tells the skills module which agents use skills, so that it never imports this module. */
export function registerSkillUsage(): void {
	Container.get(SkillUsageProxy).register(Container.get(AgentSkillUsage));
}
