import { FLEXIBLE_GROUPS_CANVAS_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { RelaxedNodeGroupRulesFlagGate } from '../relaxed-node-group-rules-flag-gate';

describe('RelaxedNodeGroupRulesFlagGate', () => {
	let postHogClient: Mocked<PostHogClient>;
	let gate: RelaxedNodeGroupRulesFlagGate;

	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		postHogClient = mock<PostHogClient>();
		gate = new RelaxedNodeGroupRulesFlagGate(postHogClient);
	});

	it('resolves true when the flag is on for the user', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({ [FLEXIBLE_GROUPS_CANVAS_FLAG]: true });

		expect(await gate.isEnabled(user)).toBe(true);
	});

	it('resolves false when the flag is absent', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({});

		expect(await gate.isEnabled(user)).toBe(false);
	});

	it('resolves false when the flag is explicitly off', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({ [FLEXIBLE_GROUPS_CANVAS_FLAG]: false });

		expect(await gate.isEnabled(user)).toBe(false);
	});
});
