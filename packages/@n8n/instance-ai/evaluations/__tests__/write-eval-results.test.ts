import { mkdtempSync, readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { tmpdir } from 'os';
import { join } from 'path';

import { aggregateResults } from '../run/aggregator';
import { writeEvalResults } from '../run/persist';
import type { ExecutionScenario, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

// The lang-tracer dispatcher reads `eval-results.json`, not the in-memory
// aggregation. These tests pin that the `notVerified` status actually survives
// serialization: per-case `testCases[].status` and top-level `summary.notVerified`.

const scenario: ExecutionScenario = {
	name: 'happy-path',
	description: 'baseline',
	dataSetup: 'plain',
	successCriteria: 'works',
};

function scenarioCase(): WorkflowTestCase {
	return {
		conversation: [{ role: 'user', text: 'build it' }],
		complexity: 'simple',
		tags: [],
		executionScenarios: [scenario],
		datasets: ['full'],
	};
}

function runResult(
	testCase: WorkflowTestCase,
	run: { success: boolean; incomplete?: boolean },
): WorkflowTestCaseResult {
	return {
		testCase,
		workflowBuildSuccess: true,
		executionScenarioResults: [
			{
				scenario,
				success: run.success,
				score: run.success ? 1 : 0,
				reasoning: run.success ? 'ok' : 'nope',
				...(run.incomplete ? { incomplete: true } : {}),
			},
		],
	};
}

interface SerializedResults {
	summary: { notVerified: number };
	testCases: Array<{ status: string; testCaseFile?: string }>;
}

function writeAndRead(): SerializedResults {
	const notVerifiedCase = scenarioCase();
	const verifiedCase = scenarioCase();

	// Two iterations. Case 0: every run incomplete → notVerified.
	// Case 1: one pass, one fail → verified.
	const evaluation = aggregateResults(
		[
			[
				runResult(notVerifiedCase, { success: false, incomplete: true }),
				runResult(verifiedCase, { success: true }),
			],
			[
				runResult(notVerifiedCase, { success: false, incomplete: true }),
				runResult(verifiedCase, { success: false }),
			],
		],
		2,
	);

	const slugByTestCase = new Map<WorkflowTestCase, string>([
		[notVerifiedCase, 'behavioral-not-verified'],
		[verifiedCase, 'scenario-verified'],
	]);

	const dir = mkdtempSync(join(tmpdir(), 'eval-results-test-'));
	const { jsonPath } = writeEvalResults(
		evaluation,
		1234,
		dir,
		'exp-test',
		undefined,
		undefined,
		slugByTestCase,
		undefined,
		undefined,
	);

	return jsonParse<SerializedResults>(readFileSync(jsonPath, 'utf8'));
}

describe('writeEvalResults — notVerified serialization', () => {
	it('serializes per-case status and the top-level notVerified count', () => {
		const report = writeAndRead();

		const byFile = new Map(report.testCases.map((tc) => [tc.testCaseFile, tc.status]));
		expect(byFile.get('behavioral-not-verified')).toBe('notVerified');
		expect(byFile.get('scenario-verified')).toBe('verified');
		expect(report.summary.notVerified).toBe(1);
	});

	// The committed fixture is the cross-repo contract anchor consumed by the
	// lang-tracer dispatcher test. Guard it so the pinned fields can't silently drift.
	it('matches the committed golden fixture on the pinned fields', () => {
		const golden = jsonParse<SerializedResults>(
			readFileSync(join(__dirname, 'fixtures', 'eval-results.not-verified.json'), 'utf8'),
		);

		const live = writeAndRead();
		expect(golden.summary.notVerified).toBe(live.summary.notVerified);
		expect(golden.testCases.map((tc) => [tc.testCaseFile, tc.status])).toEqual(
			live.testCases.map((tc) => [tc.testCaseFile, tc.status]),
		);
	});
});

// The context/build cross is only worth computing if it survives into the file the
// dispatcher and the cost report read. Exercised through the real writer, so removing
// the persist wiring fails here rather than leaving a classifier nothing calls.
describe('writeEvalResults — contextOutcomePerRun serialization', () => {
	function caseWithVerdicts(
		verdicts: WorkflowTestCaseResult['buildExpectationResults'],
	): WorkflowTestCaseResult {
		return { ...runResult(scenarioCase(), { success: true }), buildExpectationResults: verdicts };
	}

	function writeCases(runs: WorkflowTestCaseResult[]): Array<Record<string, unknown>> {
		const evaluation = aggregateResults([runs], 1);
		const dir = mkdtempSync(join(tmpdir(), 'eval-results-context-'));
		const { jsonPath } = writeEvalResults(
			evaluation,
			1234,
			dir,
			'exp-context',
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
		);
		return jsonParse<{ testCases: Array<Record<string, unknown>> }>(readFileSync(jsonPath, 'utf8'))
			.testCases;
	}

	it('emits the cross when a case graded both a context and a build claim', () => {
		const [testCase] = writeCases([
			caseWithVerdicts([
				{ expectation: 'context contains "#ops"', pass: true, reason: 'r', kind: 'context' },
				{ expectation: 'the workflow posts there', pass: false, reason: 'r' },
			]),
		]);

		expect(testCase.contextOutcomePerRun).toEqual([
			{
				outcome: 'context-ignored',
				contextPassed: 1,
				contextGraded: 1,
				buildPassed: 0,
				buildGraded: 1,
			},
		]);
	});

	it('omits the key entirely for a case with no context claims', () => {
		const [testCase] = writeCases([
			caseWithVerdicts([{ expectation: 'the workflow posts there', pass: true, reason: 'r' }]),
		]);

		expect(testCase).not.toHaveProperty('contextOutcomePerRun');
	});
});
