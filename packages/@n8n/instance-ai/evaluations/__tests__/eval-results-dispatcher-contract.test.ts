import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mkdtempSync, readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { tmpdir } from 'os';
import { join } from 'path';

import type { CheckOutcome } from '../binaryChecks/types';
import { aggregateResults } from '../run/aggregator';
import { writeEvalResults } from '../run/persist';
import type { ExecutionScenario, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

// Pins the `eval-results.json` fields the lang-tracer dispatcher ingests
// (lang-tracer-dispatcher `src/lib/runner.ts`): it spawns this CLI per case in
// direct (no-LangSmith) mode, reads the file, and projects these fields into
// LangTracer run state. Renaming or dropping any of them breaks LangTracer
// ingestion silently — the dispatcher tolerates absent fields by design.

const scenario: ExecutionScenario = {
	name: 'happy-path',
	description: 'baseline',
	dataSetup: 'plain',
	successCriteria: 'digest arrives',
};

const testCase: WorkflowTestCase = {
	conversation: [{ role: 'user', text: 'send me a daily digest' }],
	complexity: 'simple',
	tags: [],
	datasets: ['full'],
	executionScenarios: [scenario],
	outcomeExpectations: ['sends a digest'],
};

const passingCheck: CheckOutcome = {
	name: 'no-unreachable-nodes',
	description: 'all nodes reachable',
	kind: 'deterministic',
	dimension: 'structure',
	status: 'pass',
};

function iteration1(): WorkflowTestCaseResult {
	return {
		testCase,
		workflowBuildSuccess: true,
		workflowChecks: [passingCheck],
		workflowJson: {
			id: 'wf-1',
			name: 'Digest',
			active: false,
			versionId: 'v1',
			nodes: [],
			connections: {},
		},
		buildExpectationResults: [
			{ expectation: 'sends a digest', pass: true, reason: 'digest node present' },
		],
		executionScenarioResults: [{ scenario, success: true, score: 1, reasoning: 'works' }],
	};
}

function iteration2(): WorkflowTestCaseResult {
	return {
		testCase,
		workflowBuildSuccess: true,
		buildExpectationResults: [
			{ expectation: 'sends a digest', pass: false, reason: 'digest node missing' },
		],
		executionScenarioResults: [
			{
				scenario,
				success: false,
				score: 0,
				reasoning: 'no digest was produced',
				failureCategory: 'mock_issue',
				rootCause: 'mock returned an empty page',
				evalResult: { errors: ['HTTP 500 from the mocked API'] } as InstanceAiEvalExecutionResult,
			},
		],
	};
}

interface DispatcherView {
	experimentName?: string;
	testCases: Array<{
		buildSuccessCount: number;
		workflowJson?: { id: string };
		totalRuns: number;
		workflowChecksPerRun: Array<Record<string, string> | null>;
		buildExpectations: Array<{
			expectation: string;
			passCount: number;
			evaluatedCount: number;
		}>;
		buildExpectationResultsPerRun: Array<Array<{
			expectation: string;
			pass: boolean;
			reason: string;
		}> | null>;
		scenarios: Array<{
			name: string;
			passCount: number;
			totalRuns: number;
			runs: Array<{
				passed: boolean;
				score: number;
				reasoning: string;
				failureCategory?: string;
				rootCause?: string;
				execErrors: string[];
			}>;
		}>;
	}>;
}

function writeAndRead(): DispatcherView {
	const evaluation = aggregateResults([[iteration1()], [iteration2()]], 2);
	const dir = mkdtempSync(join(tmpdir(), 'eval-results-contract-'));
	const { jsonPath } = writeEvalResults(
		evaluation,
		1234,
		dir,
		'exp-dispatcher-contract',
		undefined,
		undefined,
		new Map([[testCase, 'daily-digest']]),
		undefined,
		undefined,
	);
	return jsonParse<DispatcherView>(readFileSync(jsonPath, 'utf8'));
}

describe('eval-results.json — dispatcher contract', () => {
	it('serializes every field the dispatcher projects into run state', () => {
		const report = writeAndRead();

		expect(report.experimentName).toBe('exp-dispatcher-contract');
		expect(report.testCases).toHaveLength(1);

		const tc = report.testCases[0];
		expect(tc.buildSuccessCount).toBe(2);
		expect(tc.totalRuns).toBe(2);
		// Produced workflow rides along (first iteration's) — the dispatcher's
		// Dockerfile patch greps for upstream support of this field and no-ops.
		expect(tc.workflowJson).toMatchObject({ id: 'wf-1' });

		// Per-iteration build signals. Checks serialize as a name→status map (an
		// iteration without checks serializes as null, not as a hole).
		expect(tc.workflowChecksPerRun).toEqual([{ 'no-unreachable-nodes': 'pass' }, null]);
		expect(tc.buildExpectations).toHaveLength(1);
		expect(tc.buildExpectations[0]).toMatchObject({
			expectation: 'sends a digest',
			passCount: 1,
			evaluatedCount: 2,
		});
		expect(tc.buildExpectationResultsPerRun).toEqual([
			[{ expectation: 'sends a digest', pass: true, reason: 'digest node present' }],
			[{ expectation: 'sends a digest', pass: false, reason: 'digest node missing' }],
		]);

		// Scenario blocks serialize under the flat `scenarios` key with a flat
		// `name` — the shape the dispatcher's fallback reader consumes today.
		expect(tc.scenarios).toHaveLength(1);
		const sc = tc.scenarios[0];
		expect(sc.name).toBe('happy-path');
		expect(sc.passCount).toBe(1);
		expect(sc.totalRuns).toBe(2);
		expect(sc.runs).toHaveLength(2);
		expect(sc.runs[0]).toMatchObject({ passed: true, score: 1, reasoning: 'works' });
		expect(sc.runs[1]).toMatchObject({
			passed: false,
			score: 0,
			reasoning: 'no digest was produced',
			failureCategory: 'mock_issue',
			rootCause: 'mock returned an empty page',
			execErrors: ['HTTP 500 from the mocked API'],
		});
	});
});
