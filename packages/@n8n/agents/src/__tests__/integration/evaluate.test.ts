import { expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, getModel } from './helpers';
import { parseJudgeResponse } from '../../evals/parse-judge-response';
import { Agent, Tool, Eval, evaluate, evals } from '../../index';

/**
 * Create a fruit-bowl agent with a tool that generates random fruit coordinates.
 */
function createFruitBowlAgent(provider: 'anthropic' | 'openai'): Agent {
	const createFruitBowlTool = new Tool('create_fruit_bowl')
		.description(
			'Generate a fruit bowl with random 3D coordinates for fruits. Always use this tool when asked to create a fruit bowl.',
		)
		.input(
			z.object({
				num_apples: z.number().optional().describe('Number of apples (default: 3)'),
			}),
		)
		.handler(async (input) => {
			const numApples = input.num_apples ?? 3;
			const fruits = Array.from({ length: numApples }, () => ({
				type: 'apple',
				x: Math.round((Math.random() * 20 - 10) * 10) / 10,
				y: Math.round((Math.random() * 20 - 10) * 10) / 10,
				z: Math.round((Math.random() * 20 - 10) * 10) / 10,
			}));
			return { fruits };
		});

	return new Agent('fruit-bowl-bot')
		.model(getModel(provider))
		.instructions(
			'You are a fruit bowl generator. When asked to create a fruit bowl, use the create_fruit_bowl tool and then describe the contents including each fruit type and its x, y, z coordinates.',
		)
		.tool(createFruitBowlTool);
}

const describe = describeIf('anthropic');

describe('evaluate() integration', () => {
	it('runs deterministic evals against a fruit bowl agent', async () => {
		const mentionsFruit = new Eval('mentions-fruit')
			.description('Check if response mentions apples with coordinates')
			.check(({ output }) => {
				const lower = output.toLowerCase();
				const hasApple = lower.includes('apple');
				const hasCoord = /\d+\.\d/.test(output);
				return {
					pass: hasApple && hasCoord,
					reasoning:
						hasApple && hasCoord
							? 'Mentions apples with coordinates'
							: hasApple
								? 'Mentions apples but no coordinates'
								: 'No mention of apples',
				};
			});

		const usedTool = new Eval('used-tool')
			.description('Check if create_fruit_bowl tool was called')
			.check(({ toolCalls }) => {
				const used = (toolCalls ?? []).some((tc) => tc.tool === 'create_fruit_bowl');
				return {
					pass: used,
					reasoning: used ? 'Tool was called' : 'Tool was NOT called',
				};
			});

		const agent = createFruitBowlAgent('anthropic');

		const results = await evaluate(agent, {
			dataset: [{ input: 'Create a fruit bowl with 3 apples' }],
			evals: [mentionsFruit, usedTool],
		});

		expect(results.runs).toHaveLength(1);

		const run = results.runs[0];
		expect(run.output).toBeTruthy();

		expect(run.scores['mentions-fruit'].pass).toBe(true);
		expect(run.scores['used-tool'].pass).toBe(true);

		expect(results.summary['mentions-fruit'].total).toBe(1);
		expect(results.summary['used-tool'].passed).toBe(1);
	});

	it('runs multiple dataset rows in parallel', async () => {
		const hasContent = new Eval('has-content')
			.description('Check response is non-empty')
			.check(({ output }) => ({
				pass: output.length > 10,
				reasoning: `Response length: ${output.length}`,
			}));

		const agent = createFruitBowlAgent('anthropic');

		const results = await evaluate(agent, {
			dataset: [
				{ input: 'Create a fruit bowl with 2 apples' },
				{ input: 'Create a fruit bowl with 5 apples' },
			],
			evals: [hasContent],
		});

		expect(results.runs).toHaveLength(2);
		expect(results.summary['has-content'].total).toBe(2);
		expect(results.summary['has-content'].passed).toBe(2);
	});

	it('runs built-in string similarity eval', async () => {
		const agent = new Agent('echo-agent')
			.model(getModel('anthropic'))
			.instructions(
				'When asked "What is the capital of France?", reply with exactly: "Paris". Nothing else.',
			);

		const similarity = evals.stringSimilarity();

		const results = await evaluate(agent, {
			dataset: [{ input: 'What is the capital of France?', expected: 'Paris' }],
			evals: [similarity],
		});

		expect(results.runs).toHaveLength(1);
		expect(results.runs[0].scores['string-similarity'].pass).toBe(true);
	});

	it('runs LLM-as-judge correctness eval', async () => {
		const agent = new Agent('math-agent')
			.model(getModel('anthropic'))
			.instructions('Answer math questions with just the number. No explanation.');

		const correctness = evals.correctness().model(getModel('anthropic'));

		const results = await evaluate(agent, {
			dataset: [{ input: 'What is 2 + 2?', expected: '4' }],
			evals: [correctness],
		});

		expect(results.runs).toHaveLength(1);
		expect(results.runs[0].scores['correctness'].pass).toBe(true);
		expect(results.runs[0].scores['correctness'].reasoning).toBeTruthy();
	});

	it('runs LLM correctness eval on fruit bowl agent with expected output', async () => {
		const agent = createFruitBowlAgent('anthropic');

		const correctness = evals.correctness().model(getModel('anthropic'));

		const domainHelpfulness = new Eval('domain-helpfulness')
			.description('Judge helpfulness in the context of a fruit-picking robot simulation')
			.model(getModel('anthropic'))
			.judge(async ({ input, output, llm }) => {
				const result = await llm(
					[
						'You are evaluating a response from a simple fruit-picking robot simulation tool.',
						'This is a demo/toy agent. The robot generates fruit bowls with 3D coordinates.',
						'Judge ONLY whether the response fulfills what the user asked for — not production quality.',
						'',
						`User request: ${input}`,
						`Robot response: ${output}`,
						'',
						'Did the response deliver what was asked?',
						'Respond with ONLY JSON (no markdown fences): {"pass": true/false, "reasoning": "<explanation>"}',
					].join('\n'),
				);
				return parseJudgeResponse(result.text);
			});

		const results = await evaluate(agent, {
			dataset: [
				{
					input: 'Create a fruit bowl',
					expected: 'A fruit bowl with a number of apples and their coordinates',
				},
			],
			evals: [correctness, domainHelpfulness],
		});

		expect(results.runs).toHaveLength(1);

		const run = results.runs[0];
		expect(run.output.toLowerCase()).toContain('apple');

		expect(run.scores['correctness'].pass).toBe(true);
		expect(run.scores['correctness'].reasoning).toBeTruthy();

		expect(run.scores['domain-helpfulness'].pass).toBe(true);
		expect(run.scores['domain-helpfulness'].reasoning).toBeTruthy();
	});

	it('auto-approves tool calls with requiresApproval during eval', async () => {
		const { createAgentWithMixedTools } = await import('./helpers');
		const agent = createAgentWithMixedTools('anthropic');

		const usedTool = new Eval('used-list-tool')
			.description('Check if list_files was called')
			.check(({ toolCalls }) => {
				const used = (toolCalls ?? []).some((tc) => tc.tool === 'list_files');
				return {
					pass: used,
					reasoning: used ? 'Called list_files' : 'Did not call list_files',
				};
			});

		const hasOutput = new Eval('has-output')
			.description('Check response is non-empty')
			.check(({ output }) => ({
				pass: output.length > 5,
				reasoning: `Output length: ${output.length}`,
			}));

		const results = await evaluate(agent, {
			dataset: [{ input: 'List files in /home' }],
			evals: [usedTool, hasOutput],
		});

		expect(results.runs).toHaveLength(1);
		expect(results.runs[0].scores['used-list-tool'].pass).toBe(true);
		expect(results.runs[0].scores['has-output'].pass).toBe(true);
	});
});
