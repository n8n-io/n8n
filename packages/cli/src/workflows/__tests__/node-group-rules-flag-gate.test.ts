import { GROUPS_WITH_MANY_BOUNDARIES_FLAG, GROUPS_WITH_TRIGGERS_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { NodeGroupRulesFlagGate } from '../node-group-rules-flag-gate';

describe('NodeGroupRulesFlagGate', () => {
	let postHogClient: Mocked<PostHogClient>;
	let gate: NodeGroupRulesFlagGate;

	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		postHogClient = mock<PostHogClient>();
		gate = new NodeGroupRulesFlagGate(postHogClient);
	});

	it('enables each rule from its own flag', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({
			[GROUPS_WITH_TRIGGERS_FLAG]: true,
			[GROUPS_WITH_MANY_BOUNDARIES_FLAG]: true,
		});

		expect(await gate.getEnabledRules(user)).toEqual({
			allowTriggerInGroup: true,
			allowMultipleBoundaryNodes: true,
		});
	});

	it('enables the trigger rule alone', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({ [GROUPS_WITH_TRIGGERS_FLAG]: true });

		expect(await gate.getEnabledRules(user)).toEqual({
			allowTriggerInGroup: true,
			allowMultipleBoundaryNodes: false,
		});
	});

	it('enables the boundary rule alone', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({ [GROUPS_WITH_MANY_BOUNDARIES_FLAG]: true });

		expect(await gate.getEnabledRules(user)).toEqual({
			allowTriggerInGroup: false,
			allowMultipleBoundaryNodes: true,
		});
	});

	it('disables both rules when the flags are absent', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({});

		expect(await gate.getEnabledRules(user)).toEqual({
			allowTriggerInGroup: false,
			allowMultipleBoundaryNodes: false,
		});
	});

	it('disables both rules when the flags are explicitly off', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({
			[GROUPS_WITH_TRIGGERS_FLAG]: false,
			[GROUPS_WITH_MANY_BOUNDARIES_FLAG]: false,
		});

		expect(await gate.getEnabledRules(user)).toEqual({
			allowTriggerInGroup: false,
			allowMultipleBoundaryNodes: false,
		});
	});

	it('reads PostHog once for both rules', async () => {
		postHogClient.getFeatureFlags.mockResolvedValue({});

		await gate.getEnabledRules(user);

		expect(postHogClient.getFeatureFlags).toHaveBeenCalledTimes(1);
	});
});
