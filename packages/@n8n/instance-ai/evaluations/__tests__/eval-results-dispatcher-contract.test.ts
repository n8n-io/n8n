import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mkdtempSync, readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { tmpdir } from 'os';
import { join } from 'path';

import type { CheckOutcome } from '../binaryChecks/types';
import { aggregateResults } from '../run/aggregator';
import { writeEvalResults } from '../run/persist';
import type {
	ExecutionScenario,
	TranscriptTurn,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';

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

const transcript: TranscriptTurn[] = [
	{
		userMessage: 'send me a daily digest',
		steps: [
			{ kind: 'agent-text', text: 'Building the digest workflow.' },
			{
				kind: 'tool-call',
				toolName: 'add-nodes',
				args: { nodeType: 'n8n-nodes-base.scheduleTrigger' },
				result: { added: true },
			},
		],
	},
];

function iteration1(): WorkflowTestCaseResult {
	return {
		testCase,
		workflowBuildSuccess: true,
		threadId: '3f0c9a2e-8d41-4b77-9a10-1c2d3e4f5a6b',
		transcript,
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
		buildError: 'agent stopped before producing a workflow',
		buildExpectationResults: [
			{
				expectation: 'sends a digest',
				pass: false,
				reason: 'digest node missing',
				attribution: 'builder_issue',
			},
		],
		executionScenarioResults: [
			{
				scenario,
				success: false,
				score: 0,
				reasoning: 'no digest was produced',
				failureCategory: 'mock_issue',
				attribution: 'mock_issue',
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
			attribution?: string;
		}> | null>;
		buildCostUsdPerRun?: Array<number | null>;
		buildTurnsPerRun?: Array<number | null>;
		transcriptPerRun: Array<TranscriptTurn[] | null>;
		buildErrorPerRun: Array<string | null>;
		threadIds: Array<string | null>;
		scenarios: Array<{
			name: string;
			passCount: number;
			totalRuns: number;
			runs: Array<{
				passed: boolean;
				score: number;
				reasoning: string;
				failureCategory?: string;
				attribution?: string;
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
			[
				{
					expectation: 'sends a digest',
					pass: false,
					reason: 'digest node missing',
					// A missed expectation is a builder miss — the harness decides this,
					// lang-tracer stores it (TRUST-375).
					attribution: 'builder_issue',
				},
			],
		]);
		// Spend arrays are `--build-via-mcp`-only — absent when no iteration
		// recorded `claude` spend, so non-MCP dispatcher output is unchanged.
		expect(tc).not.toHaveProperty('buildCostUsdPerRun');
		expect(tc).not.toHaveProperty('buildTurnsPerRun');

		// Per-iteration conversation transcript — one entry per run, null when
		// the iteration captured none. A present transcript keeps the full
		// step detail (tool calls with args + results) the dispatcher renders.
		expect(tc.transcriptPerRun).toHaveLength(2);
		expect(tc.transcriptPerRun[1]).toBeNull();
		const turn = tc.transcriptPerRun[0]?.[0];
		expect(turn?.userMessage).toBe('send me a daily digest');
		expect(turn?.steps[0]).toEqual({ kind: 'agent-text', text: 'Building the digest workflow.' });
		expect(turn?.steps[1]).toEqual({
			kind: 'tool-call',
			toolName: 'add-nodes',
			args: { nodeType: 'n8n-nodes-base.scheduleTrigger' },
			result: { added: true },
		});

		// Per-iteration build-failure reason — one `string | null` per run.
		expect(tc.buildErrorPerRun).toEqual([null, 'agent stopped before producing a workflow']);

		// Build thread ids — one per iteration, null when the iteration never
		// reached a build. LangTracer persists these (case_run_artifacts.thread_ids)
		// as the join key from a case run to its LangSmith builder trace
		// (`metadata.thread_id`) when eval trace capture is enabled on the n8n
		// container. Dropping the field orphans every captured trace: the trace
		// itself carries only a bare UUID, with no case, verdict, or version.
		expect(tc.threadIds).toEqual(['3f0c9a2e-8d41-4b77-9a10-1c2d3e4f5a6b', null]);

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
			// The attribution rides ALONGSIDE the legacy category — lang-tracer reads
			// this one and only falls back to re-deriving from the category for rows
			// written by an older pinned harness commit (TRUST-375).
			attribution: 'mock_issue',
			rootCause: 'mock returned an empty page',
			execErrors: ['HTTP 500 from the mocked API'],
		});
		// A passing run carries no attribution at all — nobody owns a pass.
		expect(sc.runs[0]).not.toHaveProperty('attribution');
	});

	it('serializes per-iteration `claude` build spend when a run recorded it', () => {
		const evaluation = aggregateResults(
			[[{ ...iteration1(), buildCostUsd: 0.31, buildTurns: 5 }], [iteration2()]],
			2,
		);
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
		const report = jsonParse<DispatcherView>(readFileSync(jsonPath, 'utf8'));

		const tc = report.testCases[0];
		expect(tc.buildCostUsdPerRun).toEqual([0.31, null]);
		expect(tc.buildTurnsPerRun).toEqual([5, null]);
	});
});
