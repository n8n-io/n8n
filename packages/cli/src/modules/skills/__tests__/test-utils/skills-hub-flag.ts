import { Container } from '@n8n/di';

import { SkillsHubRollout } from '../../skills-hub-rollout';

/**
 * Turns the skills hub gate on or off. Agents always use the hub. The gate still hides the
 * `/skills` routes, MCP skill tools and n8n Assistant skills while the agents module is off,
 * and tests of that state turn it off.
 */
export function setSkillsHubFlag(enabled: boolean): void {
	(Container.get(SkillsHubRollout) as unknown as { started: boolean }).started = enabled;
}
