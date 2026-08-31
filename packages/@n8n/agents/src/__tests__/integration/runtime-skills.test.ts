import { expect, it } from 'vitest';
import { z } from 'zod';

import {
	chunksOfType,
	collectStreamChunks,
	collectTextDeltas,
	describeIf,
	findLastTextContent,
	getModel,
} from './helpers';
import { Agent, Tool, createRuntimeSkillSource, type RuntimeSkill } from '../../index';

const describe = describeIf('anthropic');

const SUMMARY_MARKER = 'SKILL_MARKER_ALPHA';
const STATUS_MARKER = 'STATUS_FORMATTED_BRAVO';

function summarySkill(category = 'productivity'): RuntimeSkill {
	return {
		id: 'summary-marker',
		name: 'Summary marker',
		description: 'Use for summarizing notes, updates, or short text while preserving a marker.',
		category,
		instructions: [
			`Every final answer after loading this skill must include the exact marker ${SUMMARY_MARKER}.`,
			'For summaries, be concise and keep the marker unchanged.',
		].join(' '),
	};
}

function engineeringSkill(): RuntimeSkill {
	return {
		id: 'engineering-status',
		name: 'Engineering status formatter',
		description: 'Use for formatting engineering workflow status identifiers.',
		category: 'engineering',
		instructions: [
			'For status-formatting requests, call the format_status tool with the exact status token from the user.',
			`Use the returned formatted value verbatim in the final answer and include ${STATUS_MARKER}.`,
			'Do not format the status manually.',
		].join(' '),
	};
}

function createSkillAgent(skills: RuntimeSkill[], extraTools: Tool[] = []): Agent {
	const agent = new Agent('runtime-skills-test')
		.model(getModel('anthropic'))
		.instructions(
			[
				'You are testing runtime skill loading.',
				'Use the skill catalog in your instructions to pick a matching skillId.',
				'Call load_skill with the exact matching skillId before answering when a skill applies.',
				'After loading a skill, strictly follow its returned instructions.',
				'Do not answer from memory when a relevant skill applies.',
			].join(' '),
		)
		.skills(createRuntimeSkillSource(skills));

	for (const tool of extraTools) {
		agent.tool(tool);
	}

	return agent;
}

describe('runtime skills integration', () => {
	it('loads a matching skill and follows its instructions with generate()', async () => {
		const agent = createSkillAgent([summarySkill()]);

		const result = await agent.generate(
			'The Summary marker skill applies. Load the relevant skill first, then summarize: n8n agents keep workflow context compact.',
		);

		const toolNames = result.toolCalls?.map((toolCall) => toolCall.tool) ?? [];
		expect(toolNames).toContain('load_skill');
		expect(findLastTextContent(result.messages)).toContain(SUMMARY_MARKER);
	});

	it('loaded skill drives a domain tool call', async () => {
		const formatStatusTool = new Tool('format_status')
			.description('Format a workflow status token for display.')
			.input(z.object({ status: z.string().describe('Workflow status token to format') }))
			.output(z.object({ formatted: z.string() }))
			.handler(async ({ status }) => ({
				formatted: `${STATUS_MARKER}: ${status.toUpperCase()}`,
			}));
		const agent = createSkillAgent([engineeringSkill()], [formatStatusTool]);

		const result = await agent.generate(
			'The engineering-status skill applies. Load it first, then format status token waiting_on_vendor_info using the required tool.',
		);

		const toolNames = result.toolCalls?.map((toolCall) => toolCall.tool) ?? [];
		expect(toolNames).toEqual(expect.arrayContaining(['load_skill', 'format_status']));
		expect(result.toolCalls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					tool: 'format_status',
					output: { formatted: `${STATUS_MARKER}: WAITING_ON_VENDOR_INFO` },
				}),
			]),
		);
	});

	it('loads and follows a skill in stream()', async () => {
		const agent = createSkillAgent([summarySkill()]);

		const { stream } = await agent.stream(
			'The Summary marker skill applies. Load the relevant skill first, then summarize: streaming agents emit tool events.',
		);

		const chunks = await collectStreamChunks(stream);
		const toolNames = [
			...chunksOfType(chunks, 'tool-call').map((chunk) => chunk.toolName),
			...chunksOfType(chunks, 'tool-result').map((chunk) => chunk.toolName),
		];

		expect(toolNames).toContain('load_skill');
		expect(collectTextDeltas(chunks)).toContain(SUMMARY_MARKER);
	});
});
