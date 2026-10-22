import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { SkillsHubRollout } from '../../skills-hub-rollout';

/**
 * Sets `AgentsConfig.skillsHubEnabled` and reads it again, as a restart does. Tests that
 * need the skills hub on or off call it instead of changing the config directly.
 */
export function setSkillsHubFlag(enabled: boolean): void {
	Container.get(AgentsConfig).skillsHubEnabled = enabled;
	Container.get(SkillsHubRollout).init();
}
