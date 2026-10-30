import type { AgentJsonConfig } from '@n8n/api-types';

import { MAX_IDEA_PROMPT_LENGTH, buildPromptIdeasPrompt, parsePromptIdeas } from '../prompt-ideas';
import type { AgentToolProfile } from '../types';

const config: AgentJsonConfig = {
	name: 'Order help desk',
	model: 'anthropic/claude-sonnet-5-5',
	instructions:
		'You help shoppers with their orders. Never promise a delivery date. Ask for the order number before you look up an order.',
};

const skills = [
	{
		name: 'Refunds',
		description: 'When someone asks for money back',
		instructions: 'Only a manager can approve a refund over 100 euros.',
	},
];

const tools: AgentToolProfile[] = [
	{
		name: 'lookup_order',
		source: 'workflow',
		action: 'reads',
		basis: 'name',
		requireApproval: false,
	},
	{
		name: 'issue_refund',
		source: 'workflow',
		action: 'acts',
		basis: 'name',
		requireApproval: true,
	},
];

const sources = { instructions: config.instructions, skills, tools };

const everyday = {
	kind: 'everyday',
	prompt: 'Where is my latest order?',
	why: 'The most common question this agent gets.',
};
const rule = {
	kind: 'rule',
	prompt: 'When will my parcel arrive?',
	why: 'Tests the rule about delivery dates.',
	quote: 'Never promise a delivery date.',
};
const action = {
	kind: 'action',
	prompt: 'Please refund my last order.',
	why: 'Uses the refund tool, which changes data.',
	tool: 'issue_refund',
};

const parse = (ideas: unknown[]) => parsePromptIdeas(JSON.stringify({ ideas }), sources);

describe('buildPromptIdeasPrompt', () => {
	it('puts the instructions, skills, and tools inside data blocks', () => {
		const prompt = buildPromptIdeasPrompt({ config, skills, tools });

		expect(prompt.user).toContain('<instructions>');
		expect(prompt.user).toContain('Never promise a delivery date.');
		expect(prompt.user).toContain('Only a manager can approve a refund over 100 euros.');
		expect(prompt.user).toContain('issue_refund (workflow): acts');
		expect(prompt.system).toContain('JSON');
	});

	it('asks for prompts in the language of the instructions', () => {
		expect(buildPromptIdeasPrompt({ config, skills, tools }).system).toContain(
			'same language as the instructions',
		);
	});
});

describe('parsePromptIdeas', () => {
	it('keeps one idea of each kind, in the order everyday, rule, action', () => {
		const { ideas, dropped } = parse([action, rule, everyday]);

		expect(ideas.map((idea) => idea.kind)).toEqual(['everyday', 'rule', 'action']);
		expect(ideas[1]).toEqual({
			kind: 'rule',
			prompt: 'When will my parcel arrive?',
			why: 'Tests the rule about delivery dates.',
			source: { field: 'instructions', quote: 'Never promise a delivery date.' },
		});
		expect(ideas[2]).toEqual({
			kind: 'action',
			prompt: 'Please refund my last order.',
			why: 'Uses the refund tool, which changes data.',
			tool: 'issue_refund',
		});
		expect(dropped).toEqual([]);
	});

	it('drops a rule idea whose quote the author never wrote', () => {
		const { ideas, dropped } = parse([{ ...rule, quote: 'Always be polite.' }]);

		expect(ideas).toEqual([]);
		expect(dropped).toEqual([{ prompt: rule.prompt, why: 'quote-not-found' }]);
	});

	it('matches a quote across case and spaces, and finds it in a skill', () => {
		const { ideas } = parse([
			{ ...rule, quote: 'only a manager  can APPROVE a refund over 100 euros.' },
		]);

		expect(ideas[0].source).toEqual({
			field: 'skills',
			quote: 'only a manager  can APPROVE a refund over 100 euros.',
		});
	});

	it('drops an action idea for a tool the agent does not have', () => {
		const { ideas, dropped } = parse([{ ...action, tool: 'send_email' }]);

		expect(ideas).toEqual([]);
		expect(dropped).toEqual([{ prompt: action.prompt, why: 'unknown-tool' }]);
	});

	it('drops an action idea for a tool that only reads', () => {
		const { ideas, dropped } = parse([{ ...action, tool: 'lookup_order' }]);

		expect(ideas).toEqual([]);
		expect(dropped).toEqual([{ prompt: action.prompt, why: 'tool-only-reads' }]);
	});

	it('keeps the first idea of a kind and drops the rest', () => {
		const { ideas, dropped } = parse([everyday, { ...everyday, prompt: 'Hi there' }]);

		expect(ideas).toHaveLength(1);
		expect(dropped).toEqual([{ prompt: 'Hi there', why: 'duplicate-kind' }]);
	});

	it('drops an idea with a missing field, an unknown kind, or a prompt that is too long', () => {
		const long = 'a'.repeat(MAX_IDEA_PROMPT_LENGTH + 1);
		const { ideas, dropped } = parse([
			{ kind: 'everyday', why: 'No prompt' },
			{ kind: 'boundary', prompt: 'What can you do?', why: 'Unknown kind' },
			{ ...everyday, prompt: long },
		]);

		expect(ideas).toEqual([]);
		expect(dropped.map((d) => d.why)).toEqual(['missing-field', 'missing-field', 'too-long']);
	});

	it('trims the prompt', () => {
		expect(parse([{ ...everyday, prompt: '  Where is my order?  ' }]).ideas[0].prompt).toBe(
			'Where is my order?',
		);
	});

	it('reports text that is not JSON as unreadable', () => {
		expect(parsePromptIdeas('Sorry, I cannot help.', sources)).toEqual({
			ideas: [],
			dropped: [],
			unreadable: true,
		});
	});
});
