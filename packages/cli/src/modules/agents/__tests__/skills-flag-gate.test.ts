import { SKILLS_FLAG } from '@n8n/api-types';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { SkillsFlagGate } from '../skills/skills-flag-gate';

describe('SkillsFlagGate', () => {
	const postHog = mock<PostHogClient>();
	const gate = new SkillsFlagGate(postHog);

	beforeEach(() => vi.resetAllMocks());

	it('is enabled when the flag is true for the instance', async () => {
		postHog.getFeatureFlagForInstance.mockResolvedValue(true);

		await expect(gate.isEnabled()).resolves.toBe(true);
		await expect(gate.assertEnabled()).resolves.toBeUndefined();
		expect(postHog.getFeatureFlagForInstance).toHaveBeenCalledWith(SKILLS_FLAG);
		// One answer for every user: the per-user flags are never read.
		expect(postHog.getFeatureFlags).not.toHaveBeenCalled();
	});

	it.each([
		['missing', undefined],
		['false', false],
		['a variant string', 'test'],
	])('throws NotFoundError when the flag is %s', async (_label, value) => {
		postHog.getFeatureFlagForInstance.mockResolvedValue(value);

		await expect(gate.isEnabled()).resolves.toBe(false);
		await expect(gate.assertEnabled()).rejects.toThrow(NotFoundError);
	});
});
