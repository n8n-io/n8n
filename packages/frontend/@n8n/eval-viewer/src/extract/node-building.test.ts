import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { attemptTotals, iterationPassed } from '../metrics';
import { iterationDetailSchema, viewerIndexSchema } from '../schema';
import { extractNodeBuildingRun, isNodeBuildingRun } from './node-building';

const FIXTURE = join(__dirname, 'fixtures', 'node-building-run');

describe('extractNodeBuildingRun', () => {
	it('detects a node-building run folder', () => {
		expect(isNodeBuildingRun(FIXTURE)).toBe(true);
		expect(isNodeBuildingRun(join(FIXTURE, 'runs'))).toBe(false);
	});

	it('makes one arm per format, old first, numbered from the first arm index', async () => {
		const extracted = await extractNodeBuildingRun(FIXTURE, 2);
		const index = viewerIndexSchema.parse({
			version: 1,
			generatedAt: '2026-01-01T00:00:00.000Z',
			arms: extracted.map((entry) => entry.arm),
		});
		expect(index.arms.map((arm) => arm.name)).toEqual([
			'node-building-run:old',
			'node-building-run:new',
		]);
		expect(
			index.arms.flatMap((arm) => arm.cases.flatMap((c) => c.iterations.map((i) => i.arm))),
		).toEqual([2, 3]);
		expect(new Set(index.arms.map((arm) => arm.path)).size).toBe(2);
	});

	it('maps the run checks to expectations, so an attempt passes when the run passed', async () => {
		const [oldArm, newArm] = (await extractNodeBuildingRun(FIXTURE, 0)).map((entry) => entry.arm);
		const oldCase = oldArm.cases[0];
		const newAttempt = newArm.cases[0].iterations[0];
		expect(oldCase).toMatchObject({
			name: 'acme-tasks',
			title: 'Acme tasks',
			prompt: 'Build an n8n node for the Acme Tasks API.',
		});
		expect(iterationPassed(oldCase.iterations[0])).toBe(true);
		expect(iterationPassed(newAttempt)).toBe(false);
		expect(newAttempt).toMatchObject({
			sub: 'acme-tasks-new-1',
			index: 0,
			built: true,
			scenarios: [],
		});
		expect(newAttempt.expectations).toContainEqual({
			expectation: 'case:create',
			pass: false,
			reason: 'item 0: title differs',
		});
		expect(attemptTotals(newArm.cases[0].iterations)).toMatchObject({
			attempts: 1,
			passed: 0,
			built: 1,
		});
	});

	it('copies the metrics and computes the totals', async () => {
		const [oldArm] = (await extractNodeBuildingRun(FIXTURE, 0)).map((entry) => entry.arm);
		expect(oldArm.cases[0].iterations[0].metrics).toEqual({
			wallSeconds: 20,
			harnessBuildSeconds: null,
			turns: 2,
			toolCalls: 1,
			toolFailed: null,
			buildCalls: null,
			buildFailed: null,
			tscErrors: null,
			inputTokens: 6206,
			noCacheTokens: 6,
			cacheReadTokens: 3000,
			cacheWriteTokens: 3200,
			outputTokens: 150,
			cost: 0.015,
		});
		expect(oldArm.totals).toMatchObject({ builds: 1, built: 1, expPass: 5, expN: 5, scenN: 0 });
		expect(oldArm.totals?.median.cost).toBe(0.015);
		expect(oldArm.totals?.sum.wallSeconds).toBe(20);
	});

	it('reads the transcript, model steps, system prompt and tools from events.jsonl', async () => {
		const [oldExtracted] = await extractNodeBuildingRun(FIXTURE, 0);
		const detail = iterationDetailSchema.parse(oldExtracted.details[0]);
		const start = Date.parse('2026-01-01T00:00:00.000Z');
		expect(detail.systemPrompt).toBe('You are a coding agent.\n\n<cwd>/tmp/workspace</cwd>');
		expect(detail.tools.map((tool) => tool.name)).toEqual(['bash']);
		expect(detail.workflow).toBeNull();
		expect(detail.turns).toHaveLength(1);
		const [turn] = detail.turns;
		expect(turn.userMessage).toBe('Build an n8n node for the Acme Tasks API.');
		expect(turn.items).toEqual([
			{
				kind: 'tool',
				id: 'call-old-1',
				tool: 'bash',
				args: { command: 'curl -s http://127.0.0.1:18090/acme-tasks/docs' },
				hasResult: true,
				result: '# Acme Tasks API',
				failed: false,
			},
			{ kind: 'text', text: 'The node builds and passes.' },
		]);
		expect(turn.steps).toMatchObject([
			{
				startMs: start + 100,
				modelMs: 4000,
				toolWindowMs: 2000,
				finishReason: 'toolUse',
				modelId: 'claude-sonnet-5-5',
				usage: { input: 3004, output: 100, noCache: 4, cacheRead: 0, cacheWrite: 3000 },
				reasoning: 'Read the docs first.',
				toolCalls: [{ id: 'call-old-1', tool: 'bash', skill: null }],
			},
			{ startMs: start + 6100, modelMs: 13900, toolWindowMs: null, reasoning: null, toolCalls: [] },
		]);
	});
});
