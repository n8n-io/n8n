import { AGENT_SKILL_NAME_MAX_LENGTH, skillNameKey, type SkillUsedBy } from '@n8n/api-types';

import {
	blocksDelete,
	deleteRefusalMessage,
	findLosingAgents,
	isNameTaken,
	losingAgentsMessage,
	nextFreeName,
} from '../services/skill.policy';
import type { SkillAgent } from '../services/skill-usage.contracts';

const keys = (...names: string[]) => new Set(names.map(skillNameKey));

describe('nextFreeName', () => {
	const long = 'x'.repeat(AGENT_SKILL_NAME_MAX_LENGTH);

	it.each([
		{ requested: 'Brand voice', taken: [], expected: 'Brand voice' },
		{ requested: '  Brand voice  ', taken: [], expected: 'Brand voice' },
		{ requested: 'Brand voice', taken: ['brand_voice'], expected: 'Brand voice 2' },
		{
			requested: 'Brand voice',
			taken: ['Brand voice', 'Brand voice 2'],
			expected: 'Brand voice 3',
		},
		{ requested: 'Brand voice', taken: ['Brand voice 2'], expected: 'Brand voice' },
		{ requested: long, taken: [long], expected: `${long.slice(0, -2)} 2` },
	])('"$requested" with $taken taken → "$expected"', ({ requested, taken, expected }) => {
		expect(nextFreeName(requested, keys(...taken))).toBe(expected);
	});
});

describe('isNameTaken', () => {
	const names = [
		{ skillId: 'skill_a', name: 'Brand voice' },
		{ skillId: 'skill_b', name: 'Pricing' },
	];

	it.each([
		{ name: 'Brand voice', except: undefined, expected: true },
		{ name: 'brand-voice', except: undefined, expected: true },
		{ name: 'BRAND_VOICE ', except: undefined, expected: true },
		{ name: 'Brand voice', except: 'skill_a', expected: false },
		{ name: 'Pricing', except: 'skill_a', expected: true },
		{ name: 'Brand voices', except: undefined, expected: false },
	])('"$name" except $except → $expected', ({ name, except, expected }) => {
		expect(isNameTaken(name, names, except)).toBe(expected);
	});

	it('finds no clash in an empty scope', () => {
		expect(isNameTaken('Brand voice', [])).toBe(false);
	});
});

describe('findLosingAgents', () => {
	const agents = new Map<string, SkillAgent>([
		['agent-p', { name: 'In P', projectId: 'P' }],
		['agent-q', { name: 'In Q', projectId: 'Q' }],
	]);
	const instance = { projectId: null };
	const projectP = { projectId: 'P' };

	it.each([
		{
			target: instance,
			using: ['agent-p', 'agent-q'],
			losing: [],
			why: 'every agent can add an instance skill',
		},
		{ target: projectP, using: ['agent-p'], losing: [], why: 'the agent is in the project' },
		{
			target: projectP,
			using: ['agent-q'],
			losing: ['agent-q'],
			why: 'the agent is in another project',
		},
		{
			target: projectP,
			using: ['agent-gone'],
			losing: ['agent-gone'],
			why: 'an agent without a project loses a scoped skill',
		},
		{ target: projectP, using: [], losing: [], why: 'no agent uses the skill' },
	])('$why', ({ target, using, losing }) => {
		expect(findLosingAgents(using, target, agents)).toEqual(losing);
	});
});

describe('losingAgentsMessage', () => {
	const agents = new Map<string, SkillAgent>([
		['agent-1', { name: 'Support', projectId: 'P' }],
		['agent-2', { name: 'Sales', projectId: 'P' }],
		['agent-3', { name: 'Billing', projectId: 'Q' }],
	]);

	it.each([
		{
			losing: ['agent-1'],
			visible: 'all' as const,
			expected:
				'"Support" would lose access to this skill. Choose a scope that includes that agent, or detach the skill from it first.',
		},
		{
			losing: ['agent-1', 'agent-2'],
			visible: 'all' as const,
			expected:
				'"Support", "Sales" would lose access to this skill. Choose a scope that includes those agents, or detach the skill from them first.',
		},
		{
			losing: ['agent-1', 'agent-3'],
			visible: ['P'],
			expected:
				'"Support", 1 agent in other projects would lose access to this skill. Choose a scope that includes those agents, or detach the skill from them first.',
		},
		{
			losing: ['agent-3', 'agent-gone'],
			visible: ['P'],
			expected:
				'2 agents in other projects would lose access to this skill. Choose a scope that includes those agents, or detach the skill from them first.',
		},
	])(
		'names the visible agents of $losing and counts the others',
		({ losing, visible, expected }) => {
			expect(losingAgentsMessage(losing, agents, visible)).toBe(expected);
		},
	);
});

describe('blocksDelete and deleteRefusalMessage', () => {
	const unused: SkillUsedBy = { drafts: [], pins: [], hiddenAgents: 0 };
	const draft = {
		agentId: 'agent-1',
		agentName: 'Support',
		projectId: 'P',
		version: 1,
		pinned: false,
	};
	const pin = (version: number | null, agentName = 'Support') => ({
		agentId: 'agent-1',
		agentName,
		projectId: 'P',
		version,
	});

	it.each([
		{ case: 'unused', usage: unused, blocks: false, message: undefined },
		{
			case: 'a draft ref',
			usage: { ...unused, drafts: [draft] },
			blocks: true,
			message: 'Skill "Brand voice" is used by Support (draft) and cannot be deleted.',
		},
		{
			case: 'a draft ref and a pin of the same agent',
			usage: { ...unused, drafts: [draft], pins: [pin(2)] },
			blocks: true,
			message:
				'Skill "Brand voice" is used by Support (draft), Support (published v2) and cannot be deleted.',
		},
		{
			case: 'a pin in an older publish only',
			usage: { ...unused, pins: [pin(null)] },
			blocks: true,
			message:
				'Skill "Brand voice" is used by Support (older published version) and cannot be deleted.',
		},
		{
			case: 'agents in other projects only',
			usage: { ...unused, hiddenAgents: 2 },
			blocks: true,
			message: 'Skill "Brand voice" is used by 2 agents in other projects and cannot be deleted.',
		},
		{
			case: 'one agent once, then the hidden count',
			usage: { drafts: [draft, draft], pins: [], hiddenAgents: 1 },
			blocks: true,
			message:
				'Skill "Brand voice" is used by Support (draft), 1 agent in other projects and cannot be deleted.',
		},
		{
			case: 'two agents with the same name, both',
			usage: {
				drafts: [draft, { ...draft, agentId: 'agent-2', projectId: 'Q' }],
				pins: [],
				hiddenAgents: 0,
			},
			blocks: true,
			message:
				'Skill "Brand voice" is used by Support (draft), Support (draft) and cannot be deleted.',
		},
	])('$case → blocks: $blocks', ({ usage, blocks, message }) => {
		expect(blocksDelete(usage)).toBe(blocks);
		if (message) expect(deleteRefusalMessage('Brand voice', usage)).toBe(message);
	});
});
