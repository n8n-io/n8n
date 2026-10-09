import { SKILLS_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { SkillsFlagGate } from '../skills/skills-flag-gate';

describe('SkillsFlagGate', () => {
	const postHog = mock<PostHogClient>();
	const gate = new SkillsFlagGate(postHog);
	const user = mock<User>({ id: 'user-1' });

	it('is enabled when the flag is true for the user', async () => {
		postHog.getFeatureFlags.mockResolvedValue({ [SKILLS_FLAG]: true });

		await expect(gate.isEnabled(user)).resolves.toBe(true);
		await expect(gate.assertEnabled(user)).resolves.toBeUndefined();
		expect(postHog.getFeatureFlags).toHaveBeenCalledWith(user);
	});

	it.each([
		['missing', {}],
		['false', { [SKILLS_FLAG]: false }],
		['a variant string', { [SKILLS_FLAG]: 'test' }],
	])('throws NotFoundError when the flag is %s', async (_label, flags) => {
		postHog.getFeatureFlags.mockResolvedValue(flags);

		await expect(gate.isEnabled(user)).resolves.toBe(false);
		await expect(gate.assertEnabled(user)).rejects.toThrow(NotFoundError);
	});
});
