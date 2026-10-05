// ---------------------------------------------------------------------------
// `--output-dir` in routing mode: grades each case inline and writes
//
// - `eval-results.json`, in the contract the LangTracer dispatcher reads (see
//   evaluations/__tests__/eval-results-dispatcher-contract.test.ts),
// - `routing-results.json`, the `--json-out` format (written by the CLI), and
// - `routing-summary.md`, a short summary for people.
//
// A routing case has one build expectation, `routingExpectationText(accepts)`,
// the same text the LangTracer push stores, so LangTracer can match the two.
// Each trial is one verdict on it. A trial that could not be graded (the judge
// failed, or the run ended before a committing call because of a timeout or an
// error) is `incomplete`: it counts neither as a pass nor as a failure.
//
// The files are rewritten after every graded case, so a run that is stopped
// early still leaves the cases it finished.
// ---------------------------------------------------------------------------

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { RoutingCaseResult, RoutingResultsFile } from './types';
import type { EvalAttribution } from '../harness/attribution';
import { routingExpectationText } from '../routing/expectation';
import {
	computeRunMetrics,
	failureReason,
	type GradedCase,
	type GradedTrial,
} from '../routing/grade-report';
import { gradeRoutingResults } from '../routing/grade-run';
import type { RoutingCase as GraderCase } from '../routing/grade-types';
import { JUDGE_MODEL, type RoutingJudge } from '../routing/judge';
import type { RoutingCase } from '../routing/loader';
import { passAtK, passHatK } from '../run/aggregator';
import type { BuildExpectationResult, CaseVerificationStatus, TranscriptTurn } from '../types';

export const EVAL_RESULTS_FILE = 'eval-results.json';
export const ROUTING_RESULTS_FILE = 'routing-results.json';
export const ROUTING_SUMMARY_FILE = 'routing-summary.md';

const JUDGE_CONCURRENCY = 4;
const MAX_DETAIL_LENGTH = 300;

export interface RoutingEvalCaseInput {
	routingCase: RoutingCase;
	/** The case file name without `.json`. */
	fileName?: string;
	result: RoutingCaseResult;
	/** One per trial. */
	threadIds: string[];
	/** One per trial. */
	transcripts: TranscriptTurn[][];
}

export interface RoutingEvalCase {
	input: RoutingEvalCaseInput;
	/** Absent when the grader left the case out (no trials, or a stale stop call). */
	graded?: GradedCase;
}

export type RoutingEvalMeta = Pick<
	RoutingResultsFile,
	'runId' | 'variant' | 'model' | 'trialsPerCase' | 'stopOnRoute' | 'startedAt' | 'skillOverrides'
>;

export interface RoutingDispatcherTestCase {
	name: string;
	testCaseFile: string;
	status: CaseVerificationStatus;
	totalRuns: number;
	buildExpectations: Array<{
		expectation: string;
		passCount: number;
		evaluatedCount: number;
		passAtK: number;
		passHatK: number;
	}>;
	buildExpectationResultsPerRun: BuildExpectationResult[][];
	threadIds: Array<string | null>;
	transcriptPerRun: Array<TranscriptTurn[] | null>;
}

export interface RoutingEvalResultsFile {
	timestamp: string;
	duration: number;
	totalRuns: number;
	/** False while the run is still going. */
	complete: boolean;
	routing: RoutingEvalMeta & { judgeModel: string };
	summary: {
		testCases: number;
		/** Cases that passed a strict majority of their graded trials, as LangTracer counts them. */
		passed: number;
		/** Cases with no graded trial. */
		notVerified: number;
	};
	testCases: RoutingDispatcherTestCase[];
}

export function toGraderCase(routingCase: RoutingCase): GraderCase {
	return {
		id: routingCase.id,
		bucket: routingCase.bucket,
		userMessage: routingCase.userMessage,
		accepts: routingCase.accepts,
		policyDependent: routingCase.policyDependent ?? false,
		...(routingCase.agentShaped !== undefined ? { agentShaped: routingCase.agentShaped } : {}),
		source: routingCase.source,
		...(routingCase.rationale !== undefined ? { rationale: routingCase.rationale } : {}),
	};
}

function oneLine(text: string, max = MAX_DETAIL_LENGTH): string {
	const flat = text.replace(/\s+/g, ' ').trim();
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/**
 * Why a trial counts neither as a pass nor as a failure, as its attribution,
 * or undefined when it is graded. A route decided by a committing call is
 * graded even when the run failed later: the decision was already made.
 */
export function incompleteAttribution(trial: GradedTrial): EvalAttribution | undefined {
	const { resolution } = trial;
	if (resolution.judgeError !== undefined) return 'verification_gap';
	const committed = resolution.rule !== undefined && resolution.rule <= 6;
	if (committed) return undefined;
	if (trial.streamStatus === 'timed-out') return 'timeout';
	if (trial.runError !== undefined || trial.streamStatus === 'errored') return 'framework_issue';
	return undefined;
}

/** Ends the text with a full stop unless it already ends a sentence. */
function sentence(text: string): string {
	return /[.!?]$/.test(text) ? text : `${text}.`;
}

function describeRoute(trial: GradedTrial): string {
	const { resolution } = trial;
	const rule = resolution.rule === undefined ? '' : `rule ${String(resolution.rule)}, `;
	const judge = resolution.judgeReason
		? ` Judge: ${sentence(oneLine(resolution.judgeReason))}`
		: '';
	return `Route ${trial.label} (${rule}${resolution.evidence}).${judge}`;
}

function incompleteReason(trial: GradedTrial, attribution: EvalAttribution): string {
	const { resolution } = trial;
	if (attribution === 'verification_gap') {
		return `Not graded: the judge failed (${oneLine(resolution.judgeError ?? 'no verdict')}).`;
	}
	const detail = trial.runError
		? `${trial.streamStatus}: ${oneLine(trial.runError)}`
		: trial.streamStatus;
	return attribution === 'timeout'
		? `Not graded: the run timed out before a committing call (${detail}).`
		: `Not graded: the run failed before a committing call (${detail}).`;
}

/** One trial as a verdict on the case's routing expectation. */
export function trialVerdict(
	accepts: RoutingCase['accepts'],
	trial: GradedTrial,
): BuildExpectationResult {
	const expectation = routingExpectationText(accepts);
	const attribution = incompleteAttribution(trial);
	if (attribution) {
		return {
			expectation,
			pass: false,
			reason: incompleteReason(trial, attribution),
			incomplete: true,
			attribution,
		};
	}
	if (trial.pass) {
		const how = trial.strictPass ? 'Accepted.' : 'Accepted as a same-direction clarification.';
		return { expectation, pass: true, reason: `${describeRoute(trial)} ${how}` };
	}
	return {
		expectation,
		pass: false,
		reason: `${describeRoute(trial)} Not in the accepted routes: ${accepts.join(', ')}.`,
		attribution: 'builder_issue',
	};
}

function ungradedVerdict(accepts: RoutingCase['accepts']): BuildExpectationResult {
	return {
		expectation: routingExpectationText(accepts),
		pass: false,
		reason:
			'Not graded: the grader left the case out (no trials, or a stop call that no longer commits).',
		incomplete: true,
		attribution: 'verification_gap',
	};
}

export function toDispatcherTestCase({
	input,
	graded,
}: RoutingEvalCase): RoutingDispatcherTestCase {
	const { routingCase, result } = input;
	const verdicts = graded
		? graded.trials.map((trial) => trialVerdict(routingCase.accepts, trial))
		: result.trials.map(() => ungradedVerdict(routingCase.accepts));
	const evaluated = verdicts.filter((verdict) => !verdict.incomplete);
	const passCount = evaluated.filter((verdict) => verdict.pass).length;
	const n = evaluated.length;
	return {
		name: routingCase.id,
		testCaseFile: input.fileName ?? routingCase.id,
		status: n > 0 ? 'verified' : 'notVerified',
		totalRuns: result.trials.length,
		buildExpectations: [
			{
				expectation: routingExpectationText(routingCase.accepts),
				passCount,
				evaluatedCount: n,
				// Terminal values, at k = the evaluated trials, as run/persist.ts writes them.
				passAtK: passAtK(n, passCount, n),
				passHatK: passHatK(n, passCount, n),
			},
		],
		buildExpectationResultsPerRun: verdicts.map((verdict) => [verdict]),
		threadIds: result.trials.map((_, index) => input.threadIds[index] ?? null),
		transcriptPerRun: result.trials.map((_, index) => input.transcripts[index] ?? null),
	};
}

function majorityPass(testCase: RoutingDispatcherTestCase): boolean {
	const [unit] = testCase.buildExpectations;
	return unit.evaluatedCount > 0 && unit.passCount * 2 > unit.evaluatedCount;
}

export function buildRoutingEvalResults(
	cases: RoutingEvalCase[],
	meta: RoutingEvalMeta,
	complete: boolean,
	now: Date = new Date(),
): RoutingEvalResultsFile {
	const testCases = cases.map(toDispatcherTestCase);
	return {
		timestamp: now.toISOString(),
		duration: now.getTime() - Date.parse(meta.startedAt),
		totalRuns: meta.trialsPerCase,
		complete,
		routing: { ...meta, judgeModel: JUDGE_MODEL },
		summary: {
			testCases: testCases.length,
			passed: testCases.filter(majorityPass).length,
			notVerified: testCases.filter((testCase) => testCase.status === 'notVerified').length,
		},
		testCases,
	};
}

function pct(value: number | null): string {
	return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function cell(text: string): string {
	return text.replace(/\|/g, '\\|');
}

export function renderRoutingSummary(cases: RoutingEvalCase[], meta: RoutingEvalMeta): string {
	const graded = cases.flatMap(({ graded: gradedCase }) => (gradedCase ? [gradedCase] : []));
	const { all } = computeRunMetrics(graded);
	const lines = [
		'# Routing eval summary',
		'',
		`Run \`${meta.runId}\`: variant ${meta.variant}, model ${meta.model}, ${String(cases.length)} case(s) × ${String(meta.trialsPerCase)} trial(s), stop on route: ${meta.stopOnRoute ? 'yes' : 'no'}.`,
		'',
		`Macro accuracy (v2): ${pct(all.macroAccuracy)}. Strict macro accuracy: ${pct(all.strictMacroAccuracy)}. Trial pass rate: ${pct(all.trialPass.rate)} (${String(all.trialPass.num)}/${String(all.trialPass.den)}). These grader metrics count every trial; the table counts graded trials only, as LangTracer does.`,
		'',
		'| Case | Bucket | Accepts | Routes | Passed |',
		'|---|---|---|---|---|',
	];
	for (const entry of cases) {
		const testCase = toDispatcherTestCase(entry);
		const [unit] = testCase.buildExpectations;
		const routes = entry.graded?.trials.map((trial) => trial.label).join(', ') ?? 'not graded';
		const ungraded = testCase.totalRuns - unit.evaluatedCount;
		const verdict =
			testCase.status === 'notVerified' ? 'not verified' : majorityPass(testCase) ? 'pass' : 'fail';
		const passed = `${String(unit.passCount)}/${String(unit.evaluatedCount)} ${verdict}${ungraded > 0 ? ` (${String(ungraded)} not graded)` : ''}`;
		const { routingCase } = entry.input;
		lines.push(
			`| ${cell(routingCase.id)} | ${routingCase.bucket} | ${routingCase.accepts.join(', ')} | ${routes} | ${passed} |`,
		);
	}
	const failing = graded.filter((gradedCase) => !gradedCase.pass);
	if (failing.length > 0) {
		lines.push('', '## Failing trials', '');
		for (const gradedCase of failing) {
			lines.push(`- ${gradedCase.id}: ${oneLine(failureReason(gradedCase))}`);
		}
	}
	return `${lines.join('\n')}\n`;
}

/** Grades one finished case with the shared grader. */
export async function gradeRoutingCase(
	input: RoutingEvalCaseInput,
	judge: Pick<RoutingJudge, 'judge'>,
	meta: RoutingEvalMeta,
): Promise<RoutingEvalCase> {
	const run = await gradeRoutingResults(
		{
			runId: meta.runId,
			variant: meta.variant,
			model: meta.model,
			startedAt: meta.startedAt,
			cases: [{ id: input.result.id, trials: input.result.trials }],
		},
		new Map([[input.routingCase.id, toGraderCase(input.routingCase)]]),
		judge,
		JUDGE_CONCURRENCY,
		'in-process',
	);
	return { input, graded: run.cases[0] };
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
	const tmpPath = `${filePath}.tmp`;
	await writeFile(tmpPath, content, 'utf-8');
	await rename(tmpPath, filePath);
}

export class RoutingEvalOutput {
	readonly dir: string;

	private readonly cases: Array<RoutingEvalCase | undefined>;

	/** Serializes writes: cases that finish together must not race on the temp files. */
	private pending: Promise<void> = Promise.resolve();

	constructor(
		dir: string,
		private readonly judge: Pick<RoutingJudge, 'judge'>,
		private readonly meta: RoutingEvalMeta,
		caseCount: number,
	) {
		this.dir = resolve(dir);
		this.cases = new Array<RoutingEvalCase | undefined>(caseCount);
	}

	get evalResultsPath(): string {
		return join(this.dir, EVAL_RESULTS_FILE);
	}

	get summaryPath(): string {
		return join(this.dir, ROUTING_SUMMARY_FILE);
	}

	/** Grades a finished case at its load-order position and rewrites the files. */
	async record(index: number, input: RoutingEvalCaseInput): Promise<RoutingEvalCase> {
		const graded = await gradeRoutingCase(input, this.judge, this.meta);
		this.cases[index] = graded;
		await this.enqueueWrite(false);
		return graded;
	}

	async finish(): Promise<RoutingEvalResultsFile> {
		await this.enqueueWrite(true);
		return buildRoutingEvalResults(this.finishedCases(), this.meta, true);
	}

	private finishedCases(): RoutingEvalCase[] {
		return this.cases.filter((entry): entry is RoutingEvalCase => entry !== undefined);
	}

	private async enqueueWrite(complete: boolean): Promise<void> {
		// A failed write must not block later ones; the caller still sees its own failure.
		this.pending = this.pending.catch(() => {}).then(async () => await this.write(complete));
		await this.pending;
	}

	private async write(complete: boolean): Promise<void> {
		const cases = this.finishedCases();
		await mkdir(this.dir, { recursive: true });
		const results = buildRoutingEvalResults(cases, this.meta, complete);
		await writeAtomic(this.evalResultsPath, `${JSON.stringify(results, null, 2)}\n`);
		await writeAtomic(this.summaryPath, renderRoutingSummary(cases, this.meta));
	}
}
