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

	it('treats a step without usage as zero tokens', () => {
		const report = buildContextReport('thread-1', [run('run-1', [{ stepNumber: 0 }])]);

		expect(report).toMatchObject({ llmCalls: 1, inputTokens: 0, firstCallToolCount: 0 });
	});
});
