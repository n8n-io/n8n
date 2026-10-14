import { SKILLS_FLAG } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { SkillsHubRollout } from '../skills/skills-hub-rollout';

describe('SkillsHubRollout', () => {
	const postHog = mock<PostHogClient>();
	let rollout: SkillsHubRollout;

	beforeEach(() => {
		vi.resetAllMocks();
		rollout = new SkillsHubRollout(postHog, mock<Logger>());
	});

	it('is off until the flag is read', () => {
		expect(rollout.isEnabled).toBe(false);
	});

	it('reads the flag for the instance once and keeps the value', async () => {
		postHog.getFeatureFlagForInstance.mockResolvedValue(true);

		await rollout.init();
		postHog.getFeatureFlagForInstance.mockResolvedValue(false);

		expect(rollout.isEnabled).toBe(true);
		expect(postHog.getFeatureFlagForInstance).toHaveBeenCalledTimes(1);
		expect(postHog.getFeatureFlagForInstance).toHaveBeenCalledWith(SKILLS_FLAG);
		expect(postHog.getFeatureFlags).not.toHaveBeenCalled();
	});

	it.each([
		['missing', undefined],
		['false', false],
		['a variant string', 'test'],
	])('stays off when the flag is %s', async (_label, value) => {
		postHog.getFeatureFlagForInstance.mockResolvedValue(value);

		await rollout.init();

		expect(rollout.isEnabled).toBe(false);
	});
});
