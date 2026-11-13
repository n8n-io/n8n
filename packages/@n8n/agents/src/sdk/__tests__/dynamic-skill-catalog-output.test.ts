import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

import { InMemoryMemory } from '../../runtime/memory/memory-store';
import { generateResultToDelegateSubAgentOutput } from '../../runtime/tools/delegate-sub-agent-tool';
import { createRuntimeSkillSource } from '../../skills/registry';
import { Agent } from '../agent';
import { Eval } from '../eval';
import { evaluate } from '../evaluate';
import { Memory } from '../memory';
import { isRuntimeSkillCatalog } from '../message';
import { Tool } from '../tool';

type ModelResult = Awaited<ReturnType<MockLanguageModelV3['doGenerate']>>;

function modelResult(content: ModelResult['content'], toolCall = false): ModelResult {
	return {
		content,
		finishReason: { unified: toolCall ? 'tool-calls' : 'stop', raw: 'stop' },
		usage: {
			inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
			outputTokens: { total: 5, text: 5, reasoning: 0 },
		},
		warnings: [],
	};
}

function createAgent(model: MockLanguageModelV3) {
	const source = createRuntimeSkillSource([
		{
			id: 'review',
			name: 'Review',
			description: 'Review invoices.',
			instructions: 'Check totals.',
		},
	]);
	source.dynamicCatalog = { skillIds: ['review'] };
	return new Agent('catalog-output').model(model).instructions('Complete the task.').skills(source);
}

function toolResult(): ModelResult {
	return modelResult(
		[{ type: 'tool-call', toolCallId: 'finish-1', toolName: 'finish', input: '{}' }],
		true,
	);
}

function finishTool() {
	return new Tool('finish')
		.description('Finish the task.')
		.input(z.object({}))
		.handler(async () => await Promise.resolve({ status: 'done' }))
		.endsTurnWhen(() => true);
}

describe('dynamic skill catalogue output', () => {
	it('scores only the generated answer while the model receives the catalogue', async () => {
		const answer = '{"status":"done"}';
		const model = new MockLanguageModelV3({
			doGenerate: modelResult([{ type: 'text', text: answer }]),
		});
		const result = await evaluate(createAgent(model), {
			dataset: [{ input: 'Return the status as JSON.' }],
			evals: [
				new Eval('exact').check(({ output }) => ({
					pass: output === answer,
					reasoning: 'Only the generated JSON answer must reach the evaluator.',
				})),
			],
		});

		expect(result.runs[0].output).toBe(answer);
		expect(result.runs[0].scores.exact.pass).toBe(true);
		expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain('Review invoices.');
	});

	it('uses tool output for evaluation when the model returns no text', async () => {
		const model = new MockLanguageModelV3({ doGenerate: toolResult() });
		const result = await evaluate(createAgent(model).tool(finishTool()), {
			dataset: [{ input: 'Finish the task.' }],
			evals: [],
		});

		expect(result.runs[0].output).toBe('[finish] {"status":"done"}');
	});

	it('does not return the catalogue as a delegate answer when there is no assistant text', async () => {
		const model = new MockLanguageModelV3({ doGenerate: toolResult() });
		const result = await createAgent(model).tool(finishTool()).generate('Finish the task.');

		expect(generateResultToDelegateSubAgentOutput('/root/review', result).answer).toBe('');
		expect(result.messages.some(isRuntimeSkillCatalog)).toBe(false);
	});

	it('persists and reuses the catalogue without returning it to the caller', async () => {
		const model = new MockLanguageModelV3({
			doGenerate: modelResult([{ type: 'text', text: 'Done.' }]),
		});
		const store = new InMemoryMemory();
		const persistence = { threadId: 'catalog-thread', resourceId: 'catalog-user' };
		const agent = createAgent(model).memory(new Memory().storage(store));
		const first = await agent.generate('Review an invoice.', { persistence });
		const second = await agent.generate('Continue the review.', { persistence });

		expect(first.messages.some(isRuntimeSkillCatalog)).toBe(false);
		expect(second.messages.some(isRuntimeSkillCatalog)).toBe(false);
		expect(
			(await store.getMessages(persistence.threadId)).filter(isRuntimeSkillCatalog),
		).toHaveLength(1);
		expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain('Review invoices.');
	});

	it('keeps the catalogue through suspension and resume without returning it as output', async () => {
		const model = new MockLanguageModelV3({
			doGenerate: [toolResult(), modelResult([{ type: 'text', text: 'Done.' }])],
		});
		const tool = new Tool('finish')
			.description('Finish after approval.')
			.input(z.object({}))
			.suspend(z.object({ question: z.string() }))
			.resume(z.object({ approved: z.boolean() }))
			.handler(async (_input, { suspend, resumeData }) => {
				if (!resumeData) return await suspend({ question: 'Finish?' });
				return { approved: resumeData.approved };
			});
		const agent = createAgent(model).tool(tool).checkpoint('memory');
		const suspended = await agent.generate('Finish the task.');
		expect(suspended.pendingSuspend).toHaveLength(1);
		expect(suspended.messages.some(isRuntimeSkillCatalog)).toBe(false);
		const resumed = await agent.resume(
			'generate',
			{ approved: true },
			{ runId: suspended.runId, toolCallId: 'finish-1' },
		);

		expect(resumed.messages.some(isRuntimeSkillCatalog)).toBe(false);
		expect(
			JSON.stringify(model.doGenerateCalls[1].prompt).match(/Review invoices\./g),
		).toHaveLength(1);
	});

	it('restores the catalogue after mid-run observation without adding it to output', async () => {
		const model = new MockLanguageModelV3({
			doGenerate: [
				modelResult(
					[
						{
							type: 'tool-call',
							toolCallId: 'load-1',
							toolName: 'load_skill',
							input: '{"skillId":"review"}',
						},
					],
					true,
				),
				modelResult([{ type: 'text', text: 'Done.' }]),
			],
		});
		const store = new InMemoryMemory();
		const memory = new Memory().storage(store).observationalMemory({
			observerThresholdTokens: 1,
			observe: async () => await Promise.resolve('* CRITICAL User requested an invoice review.'),
		});
		const result = await createAgent(model)
			.memory(memory)
			.generate('Review an invoice.', {
				persistence: { threadId: 'compact-thread', resourceId: 'catalog-user' },
			});

		expect(result.messages.some(isRuntimeSkillCatalog)).toBe(false);
		expect((await store.getMessages('compact-thread')).filter(isRuntimeSkillCatalog)).toHaveLength(
			2,
		);
		expect(
			JSON.stringify(model.doGenerateCalls[1].prompt).match(/Review invoices\./g),
		).toHaveLength(1);
	});
});
