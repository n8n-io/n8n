import { Container } from '@n8n/di';

import { SkillSourceCredentialsProxy, SkillUsageProxy } from '@/modules/skills';

import { AgentSkillSourceCredentials } from './agent-skill-source-credentials';
import { AgentSkillUsage } from './agent-skill-usage';

/**
 * Tells the skills module which agents use skills, and which credentials a skill source may
 * use, so that it never imports this module or the credential services of cli.
 */
export function registerSkillUsage(): void {
	Container.get(SkillUsageProxy).register(Container.get(AgentSkillUsage));
	Container.get(SkillSourceCredentialsProxy).register(() =>
		Container.get(AgentSkillSourceCredentials),
	);
}
