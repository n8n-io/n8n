import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { JudgeInput, JudgeResult } from '../../routing/judge';
import { parseRoutingCase, type RoutingCase } from '../../routing/loader';
import {
	gradeRoutingCase,
	RoutingEvalOutput,
	toDispatcherTestCase,
	type RoutingEvalMeta,
} from '../routing-eval-results';
import type { RoutingTrialRecord } from '../types';

function routingCase(raw: Record<string, unknown> = {}): RoutingCase {
	const parsed = parseRoutingCase({
		id: 'route-agent-support',
		bucket: 'agent',
		userMessage: 'Set up AI support in our group.',
		accepts: ['agent', 'clarify:agent'],
		source: 'synthetic',
		...raw,
	});
	if (!parsed.success) throw new Error(parsed.issues.join('; '));
	return parsed.data;
}

function trial(n: number, overrides: Partial<RoutingTrialRecord> = {}): RoutingTrialRecord {
	return {
		trial: n,
		durationMs: 1000,
		streamStatus: 'stopped-on-route',
		toolCalls: [],
		subAgentToolCalls: [],
		spawnedAgents: [],
		skillsLoaded: [],
		askUserQuestions: [],
		finalText: '',
		fullText: '',
		...overrides,
	};
}

const askUser = (question: string) => ({
	toolName: 'ask-user',
	args: { questions: [{ question, options: ['A', 'B'] }] },
	status: 'pending' as const,
});

/** Steers by keyword; a final text of "THROW" makes the judge fail. */
const judge = {
	judge: async (input: JudgeInput): Promise<JudgeResult> => {
		if (input.finalText === 'THROW') throw new Error('HTTP 529: overloaded');
		const text = JSON.stringify(input.askUserQuestions);
		const steer = text.includes('trigger')
			? 'workflow'
			: text.includes('persona')
				? 'agent'
				: 'none';
		return await Promise.resolve({
			verdict: { kind: input.mode === 'ask-user' ? 'clarify' : 'answer', steer, reason: 'test' },
			cached: false,
		});
	},
};

const meta: RoutingEvalMeta = {
	runId: 'run-1',
	variant: 'baseline',
	model: 'anthropic/claude-opus-5-5',
	trialsPerCase: 5,
	stopOnRoute: true,
	startedAt: '2026-10-01T10:00:00.000Z',
};

const expectation = 'Routes to one of: agent, clarify:agent';

async function gradedFixture() {
	const source = routingCase();
	return await gradeRoutingCase(
		{
			routingCase: source,
			fileName: 'lt-route-agent-support-1a2b3c4d',
			result: {
				id: source.id,
				userMessage: source.userMessage,
				trials: [
					trial(1, {
						toolCalls: [{ toolName: 'build-agent', args: {}, status: 'pending' }],
					}),
					trial(2, { toolCalls: [askUser('Which trigger should start the workflow?')] }),
					trial(3, { streamStatus: 'timed-out' }),
					trial(4, { streamStatus: 'completed', finalText: 'THROW' }),
					trial(5, { streamStatus: 'errored', runError: 'socket hang up' }),
				],
			},
			threadIds: ['t-1', 't-2', 't-3', 't-4', 't-5'],
			transcripts: [[], [], [], [], []],
		},
		judge,
		meta,
	);
}

describe('toDispatcherTestCase', () => {
	it('turns each trial into one verdict on the routing expectation', async () => {
		const testCase = toDispatcherTestCase(await gradedFixture());

		expect(testCase.buildExpectationResultsPerRun).toEqual([
			[
				{
					expectation,
					pass: true,
					reason: 'Route agent (rule 1, build-agent). Accepted.',
				},
			],
			[
				{
					expectation,
					pass: false,
					reason:
						'Route clarify:workflow (rule 6, ask-user). Judge: test. Not in the accepted routes: agent, clarify:agent.',
					attribution: 'builder_issue',
				},
			],
			[
				{
					expectation,
					pass: false,
					reason: 'Not graded: the run timed out before a committing call (timed-out).',
					incomplete: true,
					attribution: 'timeout',
				},
			],
			[
				{
					expectation,
					pass: false,
					reason: 'Not graded: the judge failed (HTTP 529: overloaded).',
					incomplete: true,
					attribution: 'verification_gap',
				},
			],
			[
				{
					expectation,
					pass: false,
					reason: 'Not graded: the run failed before a committing call (errored: socket hang up).',
					incomplete: true,
					attribution: 'framework_issue',
				},
			],
		]);
		expect(testCase).toMatchObject({
			name: 'route-agent-support',
			testCaseFile: 'lt-route-agent-support-1a2b3c4d',
			status: 'verified',
			totalRuns: 5,
			buildExpectations: [
				{ expectation, passCount: 1, evaluatedCount: 2, passAtK: 1, passHatK: 0.25 },
			],
			threadIds: ['t-1', 't-2', 't-3', 't-4', 't-5'],
		});
	});

	it('passes a same-direction clarification under the v2 score', async () => {
		const source = routingCase({
			id: 'route-workflow-digest',
			bucket: 'workflow',
			accepts: ['workflow'],
		});
		const graded = await gradeRoutingCase(
			{
				routingCase: source,
				result: {
					id: source.id,
					userMessage: source.userMessage,
					trials: [trial(1, { toolCalls: [askUser('Which trigger should start it?')] })],
				},
				threadIds: ['t-1'],
				transcripts: [[]],
			},
			judge,
			meta,
		);

		const [[verdict]] = toDispatcherTestCase(graded).buildExpectationResultsPerRun;
		expect(verdict).toEqual({
			expectation: 'Routes to one of: workflow',
			pass: true,
			reason:
				'Route clarify:workflow (rule 6, ask-user). Judge: test. Accepted as a same-direction clarification.',
		});
	});

	it('marks a case with no graded trial as not verified', async () => {
		const source = routingCase();
		const graded = await gradeRoutingCase(
			{
				routingCase: source,
				result: {
					id: source.id,
					userMessage: source.userMessage,
					trials: [trial(1, { streamStatus: 'timed-out' })],
				},
				threadIds: ['t-1'],
				transcripts: [[]],
			},
			judge,
			meta,
		);

		expect(toDispatcherTestCase(graded)).toMatchObject({
			status: 'notVerified',
			buildExpectations: [{ passCount: 0, evaluatedCount: 0, passAtK: 0, passHatK: 0 }],
		});
	});
});

describe('RoutingEvalOutput', () => {
	it('writes eval-results.json and the summary after each case', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'routing-eval-output-'));
		const output = new RoutingEvalOutput(dir, judge, meta, 1);
		const { input } = await gradedFixture();

		await output.record(0, input);
		const partial: unknown = JSON.parse(readFileSync(output.evalResultsPath, 'utf8'));
		expect(partial).toMatchObject({
			complete: false,
			testCases: [{ name: 'route-agent-support' }],
		});

		const final = await output.finish();
		expect(final.summary).toEqual({ testCases: 1, passed: 0, notVerified: 0 });
		expect(JSON.parse(readFileSync(output.evalResultsPath, 'utf8'))).toMatchObject({
			complete: true,
			totalRuns: 5,
			routing: { runId: 'run-1', judgeModel: expect.any(String) },
		});
		const summary = readFileSync(output.summaryPath, 'utf8');
		expect(summary).toContain(
			'| route-agent-support | agent | agent, clarify:agent | agent, clarify:workflow, none, none, none | 1/2 fail (3 not graded) |',
		);
	});
});
