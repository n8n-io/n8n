import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mkdtempSync, readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { tmpdir } from 'os';
import { join } from 'path';

import type { CheckOutcome } from '../binaryChecks/types';
import { RoutingEvalOutput } from '../discovery/routing-eval-results';
import type { RoutingTrialRecord } from '../discovery/types';
import { AGENT_ARTIFACT_CASE_CAP_BYTES } from '../harness/artifacts/agent-artifact';
import { routingExpectationText } from '../routing/expectation';
import type { JudgeInput, JudgeResult } from '../routing/judge';
import { parseRoutingCase } from '../routing/loader';
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

const agentArtifact = {
	agentId: 'agent-1',
	config: {
		name: 'Digest agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Use sk-abc123DEF456ghi789jkl012 to call the provider.',
		credentials: { slack: { id: 'credential-1' } },
		futureDisplayMode: { density: 'compact' },
	},
	skills: {
		digest: {
			name: 'Digest',
			description: 'Summarize updates.',
			instructions: 'Send with api_key=skill-secret.',
			futurePolicy: { mode: 'strict' },
		},
	},
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
		agentArtifact,
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
		agentArtifact?: Record<string, unknown>;
		agentArtifactPerRun: Array<Record<string, unknown> | null>;
		totalRuns: number;
		workflowChecksPerRun: Array<Record<string, string> | null>;
		status?: string;
		buildExpectations: Array<{
			expectation: string;
			passCount: number;
			evaluatedCount: number;
			passAtK?: number;
			passHatK?: number;
		}>;
		buildExpectationResultsPerRun: Array<Array<{
			expectation: string;
			pass: boolean;
			reason: string;
			incomplete?: boolean;
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

		// The first structured agent artifact supports legacy/single consumers.
		// The positional array keeps one artifact or null per build iteration.
		expect(tc.agentArtifact).toEqual({
			agentId: 'agent-1',
			config: {
				name: 'Digest agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Use [REDACTED] to call the provider.',
				credentials: '[REDACTED]',
				futureDisplayMode: { density: 'compact' },
			},
			skills: {
				digest: {
					name: 'Digest',
					description: 'Summarize updates.',
					instructions: 'Send with [REDACTED]',
					futurePolicy: { mode: 'strict' },
				},
			},
		});
		expect(tc.agentArtifactPerRun).toEqual([tc.agentArtifact, null]);

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

	it('keeps positional nulls when an agent build produced no preview artifact', () => {
		const evaluation = aggregateResults(
			[
				[{ ...iteration1(), agentId: 'agent-1', agentArtifact: undefined }],
				[{ ...iteration2(), agentId: 'agent-1' }],
			],
			2,
		);
		const dir = mkdtempSync(join(tmpdir(), 'eval-results-contract-'));
		const { jsonPath } = writeEvalResults(
			evaluation,
			1234,
			dir,
			'exp-agent-artifact-missing',
			undefined,
			undefined,
			new Map([[testCase, 'daily-digest']]),
			undefined,
			undefined,
		);
		const report = jsonParse<DispatcherView>(readFileSync(jsonPath, 'utf8'));
		const tc = report.testCases[0];

		expect(tc).not.toHaveProperty('agentArtifact');
		expect(tc.agentArtifactPerRun).toEqual([null, null]);
	});

	it('caps the final formatted artifact fields while preserving positional artifacts', () => {
		const largeArtifact = (index: number) => ({
			agentId: `agent-${index}`,
			config: {
				name: `Large agent ${index}`,
				model: 'anthropic/claude-sonnet-4-5',
				instructions: '界'.repeat(60_000),
			},
			skills: {},
		});
		const evaluation = aggregateResults(
			[
				...[0, 1, 2].map((index) => [{ ...iteration1(), agentArtifact: largeArtifact(index) }]),
				[
					{
						...iteration1(),
						agentArtifact: {
							agentId: 'agent-3',
							config: {
								name: 'Small agent',
								model: 'anthropic/claude-sonnet-4-5',
								instructions: 'Keep the digest concise.',
							},
							skills: {},
						},
					},
				],
			],
			4,
		);
		const dir = mkdtempSync(join(tmpdir(), 'eval-results-contract-'));
		const { jsonPath } = writeEvalResults(
			evaluation,
			1234,
			dir,
			'exp-agent-artifact-case-cap',
			undefined,
			undefined,
			new Map([[testCase, 'daily-digest']]),
			undefined,
			undefined,
		);
		const report = jsonParse<DispatcherView>(readFileSync(jsonPath, 'utf8'));
		const tc = report.testCases[0];

		expect(tc).not.toHaveProperty('agentArtifact');
		expect(tc.agentArtifactPerRun[0]).toMatchObject({ agentId: 'agent-0' });
		expect(tc.agentArtifactPerRun[1]).toMatchObject({ agentId: 'agent-1' });
		expect(tc.agentArtifactPerRun[2]).toBeNull();
		expect(tc.agentArtifactPerRun[3]).toMatchObject({ agentId: 'agent-3' });

		const formattedArtifactFields = JSON.stringify(
			{ agentArtifactPerRun: tc.agentArtifactPerRun },
			null,
			2,
		);
		expect(new TextEncoder().encode(formattedArtifactFields).byteLength).toBeLessThanOrEqual(
			AGENT_ARTIFACT_CASE_CAP_BYTES,
		);
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

// The discovery CLI's routing mode (`--output-dir`) writes the same file for a
// LangTracer routing case. The dispatcher matches each expectation to the
// case's stored process expectation by trimmed text, and passes it on a strict
// majority of the evaluated (not `incomplete`) runs.
describe('eval-results.json — dispatcher contract (routing)', () => {
	const parsed = parseRoutingCase({
		id: 'route-agent-support',
		bucket: 'agent',
		userMessage: 'Set up AI support in our group.',
		accepts: ['agent', 'clarify:agent'],
		source: 'synthetic',
	});
	if (!parsed.success) throw new Error(parsed.issues.join('; '));
	const routingCase = parsed.data;

	function trial(n: number, overrides: Partial<RoutingTrialRecord>): RoutingTrialRecord {
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

	const judge = {
		judge: async (input: JudgeInput): Promise<JudgeResult> =>
			await Promise.resolve({
				verdict: {
					kind: input.mode === 'ask-user' ? 'clarify' : 'answer',
					steer: 'workflow',
					reason: 'Asks which trigger starts the workflow.',
				},
				cached: false,
			}),
	};

	async function writeAndReadRouting(): Promise<DispatcherView> {
		const dir = mkdtempSync(join(tmpdir(), 'eval-results-routing-contract-'));
		const output = new RoutingEvalOutput(
			dir,
			judge,
			{
				runId: 'run-1',
				variant: 'baseline',
				model: 'anthropic/claude-opus-5-5',
				trialsPerCase: 3,
				stopOnRoute: true,
				startedAt: '2026-10-01T10:00:00.000Z',
			},
			1,
		);
		await output.record(0, {
			routingCase,
			fileName: 'lt-route-agent-support-1a2b3c4d',
			result: {
				id: routingCase.id,
				userMessage: routingCase.userMessage,
				trials: [
					trial(1, { toolCalls: [{ toolName: 'build-agent', args: {}, status: 'pending' }] }),
					trial(2, {
						toolCalls: [
							{
								toolName: 'ask-user',
								args: { questions: [{ question: 'Which trigger?', options: ['Schedule'] }] },
								status: 'pending',
							},
						],
					}),
					trial(3, { streamStatus: 'timed-out' }),
				],
			},
			threadIds: ['discovery-thread-a', 'discovery-thread-b', 'discovery-thread-c'],
			transcripts: [[], [], []],
		});
		await output.finish();
		return jsonParse<DispatcherView>(readFileSync(output.evalResultsPath, 'utf8'));
	}

	it('serializes the fields the dispatcher reads for a routing case', async () => {
		const report = await writeAndReadRouting();

		// The dispatcher ingests `testCases[0]` of a single-case run.
		expect(report.testCases).toHaveLength(1);
		const tc = report.testCases[0];
		expect(tc.totalRuns).toBe(3);
		expect(tc.status).toBe('verified');
		expect(tc.threadIds).toEqual([
			'discovery-thread-a',
			'discovery-thread-b',
			'discovery-thread-c',
		]);

		// The same text the LangTracer push stores as the case's process expectation.
		const expectation = routingExpectationText(routingCase.accepts);
		expect(tc.buildExpectations).toEqual([
			{ expectation, passCount: 1, evaluatedCount: 2, passAtK: 1, passHatK: 0.25 },
		]);
		expect(tc.buildExpectationResultsPerRun).toEqual([
			[{ expectation, pass: true, reason: expect.stringContaining('Route agent') }],
			[
				{
					expectation,
					pass: false,
					reason: expect.stringContaining('Route clarify:workflow'),
					attribution: 'builder_issue',
				},
			],
			[
				{
					expectation,
					pass: false,
					reason: expect.stringContaining('timed out'),
					incomplete: true,
					attribution: 'timeout',
				},
			],
		]);

		// Dispatcher rule: a strict majority of the evaluated runs. 1 of 2 fails.
		const [unit] = tc.buildExpectations;
		expect(unit.passCount * 2 > unit.evaluatedCount).toBe(false);
	});
});
