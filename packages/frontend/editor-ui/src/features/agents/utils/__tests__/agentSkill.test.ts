import type { SkillUsage } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { agentsLosingSkill } from '../agentSkill';

const usage: SkillUsage = {
	drafts: [
		{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1' },
		{ agentId: 'a2', agentName: 'Ops bot', projectId: 'p2' },
	],
	pins: [{ agentId: 'a2', agentName: 'Ops bot', projectId: 'p2', version: 1 }],
	hiddenAgents: 1,
};

describe('agentsLosingSkill', () => {
	it('drops no agent when the skill moves to the instance', () => {
		expect(agentsLosingSkill(usage, { projectId: null, agentId: null })).toEqual({
			names: [],
			hidden: 0,
		});
	});

	it('names each agent outside the target project once, and counts the hidden ones', () => {
		expect(agentsLosingSkill(usage, { projectId: 'p1', agentId: null })).toEqual({
			names: ['Ops bot'],
			hidden: 1,
		});
	});

	it('keeps the target agent and the agent that asks for the move', () => {
		expect(agentsLosingSkill(usage, { projectId: null, agentId: 'a1' }, 'a2')).toEqual({
			names: [],
			hidden: 1,
		});
	});
});
