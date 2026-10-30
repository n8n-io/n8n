import { ASSISTANT_SKILLS_FLAG, SKILL_SYNC_FLAG } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { PostHogClient } from '@/posthog';

import { AssistantSkillsFlagGate } from '../services/assistant-skills-flag-gate';
import type { SkillUsage } from '../services/skill-usage.contracts';
import { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';
import { SkillUsageProxy } from '../services/skill-usage-proxy.service';
import { SkillsGate } from '../services/skills-gate';

describe('skills gates', () => {
	function createGates() {
		const proxy = new SkillUsageProxy();
		const skillsGate = new SkillsGate(proxy);
		const postHog = mock<PostHogClient>();
		const assistantGate = new AssistantSkillsFlagGate(skillsGate, postHog);
		const syncGate = new SkillSyncFlagGate(skillsGate, postHog);
		return { proxy, skillsGate, postHog, assistantGate, syncGate };
	}

	const user = mock<User>({ id: 'user-1' });

	it('keeps both gates off until the agents module registers its SkillUsage', async () => {
		const { skillsGate, postHog, assistantGate } = createGates();
		postHog.getFeatureFlagForInstance.mockResolvedValue(true);

		expect(skillsGate.isEnabled).toBe(false);
		expect(await assistantGate.isEnabled()).toBe(false);
		expect(postHog.getFeatureFlagForInstance).not.toHaveBeenCalled();
	});

	it.each([
		{ flag: true, expected: true },
		{ flag: false, expected: false },
		{ flag: 'test', expected: false },
		{ flag: undefined, expected: false },
	])(
		'turns Assistant skills on only for the flag value true (flag: $flag)',
		async ({ flag, expected }) => {
			const { proxy, skillsGate, postHog, assistantGate } = createGates();
			postHog.getFeatureFlagForInstance.mockResolvedValue(flag);

			proxy.register(mock<SkillUsage>());

			expect(skillsGate.isEnabled).toBe(true);
			expect(await assistantGate.isEnabled()).toBe(expected);
			expect(postHog.getFeatureFlagForInstance).toHaveBeenCalledWith(ASSISTANT_SKILLS_FLAG);
		},
	);

	it('keeps Skill Sync off while skills are off, whatever the flag says', async () => {
		const { postHog, syncGate } = createGates();
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });

		expect(await syncGate.isEnabled(user)).toBe(false);
		await expect(syncGate.assertEnabled(user)).rejects.toThrow(NotFoundError);
		expect(postHog.getFeatureFlags).not.toHaveBeenCalled();
	});

	it.each([
		{ flag: true, expected: true },
		{ flag: false, expected: false },
		{ flag: 'test', expected: false },
		{ flag: undefined, expected: false },
	])(
		'turns Skill Sync on only for the user flag value true (flag: $flag)',
		async ({ flag, expected }) => {
			const { proxy, postHog, syncGate } = createGates();
			postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: flag });
			proxy.register(mock<SkillUsage>());

			expect(await syncGate.isEnabled(user)).toBe(expected);
			expect(postHog.getFeatureFlags).toHaveBeenCalledWith(user);
		},
	);

	it('answers 404 for a user without the Skill Sync flag', async () => {
		const { proxy, postHog, syncGate } = createGates();
		proxy.register(mock<SkillUsage>());

		postHog.getFeatureFlags.mockResolvedValue({});
		await expect(syncGate.assertEnabled(user)).rejects.toThrow(NotFoundError);

		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
		await expect(syncGate.assertEnabled(user)).resolves.toBeUndefined();
	});

	it('gives empty answers before the agents module registers its SkillUsage', async () => {
		const { proxy } = createGates();

		expect(await proxy.findAgents(['agent-1'])).toEqual(new Map());
		expect(await proxy.findUsage('skill-1')).toEqual({ drafts: [], pins: [], hiddenAgents: 0 });
		expect(await proxy.countUsingAgents(['skill-1'])).toEqual(new Map());
		expect(await proxy.findUsingAgentIds('skill-1')).toEqual([]);
		await expect(
			proxy.assertRenameKeepsNamesApart('skill-1', 'Old', 'New'),
		).resolves.toBeUndefined();
		expect(await proxy.markFollowersChanged('skill-1')).toEqual([]);
		await expect(proxy.refreshAgents(['agent-1'])).resolves.toBeUndefined();
	});

	it('skips the registered SkillUsage for an empty list', async () => {
		const { proxy } = createGates();
		const usage = mock<SkillUsage>();
		proxy.register(usage);

		expect(await proxy.findAgents([])).toEqual(new Map());
		expect(await proxy.countUsingAgents([])).toEqual(new Map());
		await proxy.refreshAgents([]);

		expect(usage.findAgents).not.toHaveBeenCalled();
		expect(usage.countUsingAgents).not.toHaveBeenCalled();
		expect(usage.refreshAgents).not.toHaveBeenCalled();
	});

	it('passes each call to the registered SkillUsage', async () => {
		const { proxy } = createGates();
		const usage = mock<SkillUsage>();
		const agents = new Map([['agent-1', { name: 'Agent', projectId: 'project-1' }]]);
		const usedBy = { drafts: [], pins: [], hiddenAgents: 2 };
		const counts = new Map([['skill-1', 3]]);
		usage.findAgents.mockResolvedValue(agents);
		usage.findUsage.mockResolvedValue(usedBy);
		usage.countUsingAgents.mockResolvedValue(counts);
		usage.findUsingAgentIds.mockResolvedValue(['agent-1']);
		usage.markFollowersChanged.mockResolvedValue(['agent-2']);
		proxy.register(usage);
		const ctx = { trx: undefined };

		expect(await proxy.findAgents(['agent-1'], ctx)).toBe(agents);
		expect(await proxy.findUsage('skill-1', ['project-1'], ctx)).toBe(usedBy);
		expect(await proxy.findUsage('skill-1')).toBe(usedBy);
		expect(await proxy.countUsingAgents(['skill-1'], ctx)).toBe(counts);
		expect(await proxy.findUsingAgentIds('skill-1', ctx)).toEqual(['agent-1']);
		await proxy.assertRenameKeepsNamesApart('skill-1', 'Old', 'New', ctx);
		expect(await proxy.markFollowersChanged('skill-1', ctx, 'user-1')).toEqual(['agent-2']);
		await proxy.refreshAgents(['agent-1'], 'push-ref');

		expect(usage.findAgents).toHaveBeenCalledWith(['agent-1'], ctx);
		expect(usage.findUsage).toHaveBeenCalledWith('skill-1', ['project-1'], ctx);
		expect(usage.findUsage).toHaveBeenCalledWith('skill-1', 'all', {});
		expect(usage.countUsingAgents).toHaveBeenCalledWith(['skill-1'], ctx);
		expect(usage.findUsingAgentIds).toHaveBeenCalledWith('skill-1', ctx);
		expect(usage.assertRenameKeepsNamesApart).toHaveBeenCalledWith('skill-1', 'Old', 'New', ctx);
		expect(usage.markFollowersChanged).toHaveBeenCalledWith('skill-1', ctx, 'user-1');
		expect(usage.refreshAgents).toHaveBeenCalledWith(['agent-1'], 'push-ref');
	});
});
