import type { InstanceAiRunDebugResponse, InstanceAiRunDebugStep } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import { buildContextReport } from '../context-report';

function step(
	inputTokens: number,
	details: { noCacheTokens: number; cacheReadTokens: number; cacheWriteTokens: number },
	tools: Array<{ name: string; description: string }>,
): InstanceAiRunDebugStep {
	return {
		stepNumber: 0,
		input: { instructions: 'You are a builder.', stepTools: tools, messages: [{ role: 'user' }] },
		output: { usage: { inputTokens, outputTokens: 50, inputTokenDetails: details } },
	};
}

function run(runId: string, steps: InstanceAiRunDebugStep[]): InstanceAiRunDebugResponse {
	return { threadId: 'thread-1', runId, startedAt: 1, steps, workflowCode: [] };
}

const smallTool = { name: 'small', description: 'x' };
const largeTool = { name: 'large', description: 'x'.repeat(200) };

describe('buildContextReport', () => {
	const records = [
		run('run-1', [
			step(1000, { noCacheTokens: 1000, cacheReadTokens: 0, cacheWriteTokens: 900 }, [
				smallTool,
				largeTool,
			]),
			step(1500, { noCacheTokens: 100, cacheReadTokens: 1400, cacheWriteTokens: 0 }, [smallTool]),
		]),
		run('run-2', [
			step(3000, { noCacheTokens: 200, cacheReadTokens: 2800, cacheWriteTokens: 0 }, [smallTool]),
		]),
	];

	it('sums tokens over every LLM call of every run', () => {
		const report = buildContextReport('thread-1', records);

		expect(report).toMatchObject({
			threadId: 'thread-1',
			runs: 2,
			llmCalls: 3,
			inputTokens: 5500,
			uncachedTokens: 1300,
			cacheReadTokens: 4200,
			cacheWriteTokens: 900,
			outputTokens: 150,
		});
	});

	it('reports the first and the largest call input', () => {
		const report = buildContextReport('thread-1', records);

		expect(report.firstCallInput).toBe(1000);
		expect(report.maxCallInput).toBe(3000);
		expect(report.firstCallToolCount).toBe(2);
		expect(report.firstCallSystemChars).toBe(JSON.stringify('You are a builder.').length);
	});

	it('lists the tools of the first call from largest to smallest', () => {
		const report = buildContextReport('thread-1', records);

		expect(report.largestTools.map((tool) => tool.name)).toEqual(['large', 'small']);
		expect(report.largestTools[0].chars).toBe(JSON.stringify(largeTool).length);
	});

	it('numbers each step with its run', () => {
		const report = buildContextReport('thread-1', records);

		expect(report.steps.map((row) => row.run)).toEqual([1, 1, 2]);
	});

	it('returns zeros when the thread has no debug records', () => {
		const report = buildContextReport('thread-1', []);

		expect(report).toMatchObject({
			llmCalls: 0,
			inputTokens: 0,
			firstCallInput: 0,
			maxCallInput: 0,
		});
		expect(report.largestTools).toEqual([]);
	});

	// Some OpenAI paths report cache hits only in providerMetadata and leave the SDK details empty.
	it('reads the OpenAI cache split from the provider metadata', () => {
		const openAiStep: InstanceAiRunDebugStep = {
			stepNumber: 0,
			output: {
				usage: { inputTokens: 1000, outputTokens: 10 },
				providerMetadata: { openai: { cachedPromptTokens: 800 } },
			},
		};

		const report = buildContextReport('thread-1', [run('run-1', [openAiStep])]);

		expect(report).toMatchObject({ inputTokens: 1000, cacheReadTokens: 800, uncachedTokens: 200 });
	});

	// The SDK already excludes cache hits from noCacheTokens, so the provider figure is not subtracted again.
	it('keeps the SDK uncached figure when the SDK reports the cache split', () => {
		const openAiStep: InstanceAiRunDebugStep = {
			stepNumber: 0,
			output: {
				usage: {
					inputTokens: 1000,
					outputTokens: 10,
					inputTokenDetails: { noCacheTokens: 200, cacheReadTokens: 800, cacheWriteTokens: 0 },
				},
				providerMetadata: { openai: { cachedPromptTokens: 800 } },
			},
		};

		const report = buildContextReport('thread-1', [run('run-1', [openAiStep])]);

		expect(report).toMatchObject({ inputTokens: 1000, cacheReadTokens: 800, uncachedTokens: 200 });
	});

	it('trusts a positive noCacheTokens over the provider metadata', () => {
		const step: InstanceAiRunDebugStep = {
			stepNumber: 0,
			output: {
				usage: { inputTokens: 1000, outputTokens: 10, inputTokenDetails: { noCacheTokens: 1000 } },
				providerMetadata: { openai: { cachedPromptTokens: 800 } },
			},
		};

		const report = buildContextReport('thread-1', [run('run-1', [step])]);

		expect(report).toMatchObject({ cacheReadTokens: 0, uncachedTokens: 1000 });
	});

	// The debug buffer keeps the tool set as a map when the SDK does not report stepTools.
	it('reads the tools from the tool map when the step has no stepTools', () => {
		const mapStep: InstanceAiRunDebugStep = {
			stepNumber: 0,
			input: {
				tools: { small: { description: 'x' }, large: { description: 'x'.repeat(200) } },
			},
		};

		const report = buildContextReport('thread-1', [run('run-1', [mapStep])]);

		expect(report.firstCallToolCount).toBe(2);
		expect(report.largestTools.map((tool) => tool.name)).toEqual(['large', 'small']);
	});

	it('treats a step without usage as zero tokens', () => {
		const report = buildContextReport('thread-1', [run('run-1', [{ stepNumber: 0 }])]);

		expect(report).toMatchObject({ llmCalls: 1, inputTokens: 0, firstCallToolCount: 0 });
	});
});
