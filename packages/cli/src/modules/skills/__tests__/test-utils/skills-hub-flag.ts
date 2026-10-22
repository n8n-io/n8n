import { Container } from '@n8n/di';

import { SkillsHubRollout } from '../../skills-hub-rollout';

/**
 * Turns the skills hub on or off, as starting n8n with or without the skills module does.
 * Tests that cover the inline skills, which a later release removes, turn it off.
 */
export function setSkillsHubFlag(enabled: boolean): void {
	(Container.get(SkillsHubRollout) as unknown as { started: boolean }).started = enabled;
}
