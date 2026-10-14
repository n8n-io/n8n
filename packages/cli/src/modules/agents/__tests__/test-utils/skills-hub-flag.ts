import { Container } from '@n8n/di';

import { PostHogClient } from '@/posthog';

import { SkillsHubRollout } from '../../skills/skills-hub-rollout';

/**
 * Sets the `125_context_skills` flag for the instance and reads it again, as a restart
 * does. Tests that need the skills hub on or off call it instead of a config value.
 */
export async function setSkillsHubFlag(enabled: boolean): Promise<void> {
	vi.spyOn(Container.get(PostHogClient), 'getFeatureFlagForInstance').mockResolvedValue(enabled);
	await Container.get(SkillsHubRollout).init();
}
