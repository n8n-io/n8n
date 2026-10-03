// ---------------------------------------------------------------------------
// Metrics and the markdown report for the routing grader (see the SPEC's
// "Report" section and v2 addendum). Pure functions over graded runs; no I/O.
//
// `pass` is the v2 score. `strictPass` applies only the case's accept tokens.
// ---------------------------------------------------------------------------

import type { ResolutionRule, RouteResolution } from './grade-resolve';
import { type AcceptToken, type Bucket, BUCKETS } from './grade-types';
import type { JudgeStats } from './judge';

export interface GradedTrial {
	trial: number;
	streamStatus: string;
	runError?: string;
	skillLoaded: boolean;
	resolution: RouteResolution;
	label: string;
	pass: boolean;
	strictPass: boolean;
	/** A clarification toward the bucket's artifact (agent and workflow buckets only). */
	sameDirectionClarify: boolean;
	judged: boolean;
	judgeCached?: boolean;
}

export interface GradedCase {
	id: string;
	bucket: Bucket;
	accepts: AcceptToken[];
	policyDependent: boolean;
	trials: GradedTrial[];
	passedTrials: number;
	pass: boolean;
	strictPassedTrials: number;
	strictPass: boolean;
}

/** A case left out of the metrics because a trial stopped on a call that no longer commits. */
export interface PendingRerunCase {
	id: string;
	bucket: Bucket;
	trials: number;
	staleTrials: Array<{ trial: number; stopCall: string }>;
}

export interface RunMeta {
	file: string;
	runId: string;
	variant: string;
	model: string;
	startedAt?: string;
	finishedAt?: string;
}

export interface GradedRun {
	meta: RunMeta;
	cases: GradedCase[];
	/** Case ids in the results file that have no case file. */
	missingCaseIds: string[];
	/** Case ids in the results file with zero trials. */
	emptyCaseIds: string[];
	pendingRerun: PendingRerunCase[];
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export interface Rate {
	num: number;
	den: number;
	rate: number | null;
}

function rate(num: number, den: number): Rate {
	return { num, den, rate: den === 0 ? null : num / den };
}

export interface BucketMetrics {
	cases: number;
	casePass: Rate;
	trialPass: Rate;
	strictCasePass: Rate;
	strictTrialPass: Rate;
	/** Agent and workflow buckets only: share of trials that are a same-direction clarify. */
	overAsking?: Rate;
	skillLoad: Rate;
	passWithSkill: Rate;
	passWithoutSkill: Rate;
}

export interface ScopeMetrics {
	cases: number;
	trials: number;
	/** Unweighted mean of per-bucket case pass rates, over buckets that have cases. */
	macroAccuracy: number | null;
	strictMacroAccuracy: number | null;
	casePass: Rate;
	trialPass: Rate;
	strictCasePass: Rate;
	strictTrialPass: Rate;
	/** Share of agent-bucket and workflow-bucket trials that are a same-direction clarify. */
	overAsking: Rate;
	skillLoad: Rate;
	passWithSkill: Rate;
	passWithoutSkill: Rate;
	buckets: Partial<Record<Bucket, BucketMetrics>>;
}

export interface RunMetrics {
	all: ScopeMetrics;
	excludingPolicyDependent: ScopeMetrics;
}

/** Buckets whose cases have a direction, so a clarification can be same-direction. */
const DIRECTED_BUCKETS: ReadonlySet<Bucket> = new Set(['agent', 'workflow']);

function trialStats(cases: readonly GradedCase[]) {
	const trials = cases.flatMap((graded) => graded.trials);
	const withSkill = trials.filter((trial) => trial.skillLoaded);
	const withoutSkill = trials.filter((trial) => !trial.skillLoaded);
	const passed = (list: GradedTrial[]) => list.filter((trial) => trial.pass).length;
	return {
		trials: trials.length,
		trialPass: rate(passed(trials), trials.length),
		strictTrialPass: rate(trials.filter((trial) => trial.strictPass).length, trials.length),
		skillLoad: rate(withSkill.length, trials.length),
		passWithSkill: rate(passed(withSkill), withSkill.length),
		passWithoutSkill: rate(passed(withoutSkill), withoutSkill.length),
	};
}

function overAskingRate(cases: readonly GradedCase[]): Rate {
	const trials = cases
		.filter((graded) => DIRECTED_BUCKETS.has(graded.bucket))
		.flatMap((graded) => graded.trials);
	return rate(trials.filter((trial) => trial.sameDirectionClarify).length, trials.length);
}

function mean(values: Array<number | null>): number | null {
	const present = values.filter((value): value is number => value !== null);
	return present.length === 0
		? null
		: present.reduce((sum, value) => sum + value, 0) / present.length;
}

export function computeScopeMetrics(cases: readonly GradedCase[]): ScopeMetrics {
	const buckets: Partial<Record<Bucket, BucketMetrics>> = {};
	for (const bucket of BUCKETS) {
		const inBucket = cases.filter((graded) => graded.bucket === bucket);
		if (inBucket.length === 0) continue;
		const stats = trialStats(inBucket);
		buckets[bucket] = {
			cases: inBucket.length,
			casePass: rate(inBucket.filter((graded) => graded.pass).length, inBucket.length),
			trialPass: stats.trialPass,
			strictCasePass: rate(inBucket.filter((graded) => graded.strictPass).length, inBucket.length),
			strictTrialPass: stats.strictTrialPass,
			overAsking: DIRECTED_BUCKETS.has(bucket) ? overAskingRate(inBucket) : undefined,
			skillLoad: stats.skillLoad,
			passWithSkill: stats.passWithSkill,
			passWithoutSkill: stats.passWithoutSkill,
		};
	}
	const bucketMetrics = Object.values(buckets);
	const stats = trialStats(cases);
	return {
		cases: cases.length,
		trials: stats.trials,
		macroAccuracy: mean(bucketMetrics.map((metrics) => metrics.casePass.rate)),
		strictMacroAccuracy: mean(bucketMetrics.map((metrics) => metrics.strictCasePass.rate)),
		casePass: rate(cases.filter((graded) => graded.pass).length, cases.length),
		trialPass: stats.trialPass,
		strictCasePass: rate(cases.filter((graded) => graded.strictPass).length, cases.length),
		strictTrialPass: stats.strictTrialPass,
		overAsking: overAskingRate(cases),
		skillLoad: stats.skillLoad,
		passWithSkill: stats.passWithSkill,
		passWithoutSkill: stats.passWithoutSkill,
		buckets,
	};
}

export function computeRunMetrics(cases: readonly GradedCase[]): RunMetrics {
	return {
		all: computeScopeMetrics(cases),
		excludingPolicyDependent: computeScopeMetrics(
			cases.filter((graded) => !graded.policyDependent),
		),
	};
}

/** Trial counts: bucket -> route label -> count. */
export type Confusion = Partial<Record<Bucket, Record<string, number>>>;

export function computeConfusion(cases: readonly GradedCase[]): Confusion {
	const confusion: Confusion = {};
	for (const graded of cases) {
		const row = (confusion[graded.bucket] ??= {});
		for (const trial of graded.trials) row[trial.label] = (row[trial.label] ?? 0) + 1;
	}
	return confusion;
}

const LABEL_ORDER = [
	'agent',
	'workflow',
	'one-off',
	'debug',
	'multi',
	'clarify:agent',
	'clarify:both',
	'clarify:none',
	'clarify:workflow',
	'answer',
	'decline',
	'none',
];

function labelColumns(confusion: Confusion): string[] {
	const present = new Set(Object.values(confusion).flatMap((row) => Object.keys(row)));
	const known = LABEL_ORDER.filter((label) => present.has(label));
	const extra = [...present].filter((label) => !LABEL_ORDER.includes(label)).sort();
	return [...known, ...extra];
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

export interface FlippedCase {
	id: string;
	bucket: Bucket;
	accepts: AcceptToken[];
	direction: 'fixed' | 'broken';
	before: string[];
	after: string[];
}

export interface CompareSummary {
	baseMeta: RunMeta;
	sharedCases: number;
	onlyInResults: string[];
	onlyInCompare: string[];
	/** Both runs restricted to shared cases, so deltas compare like with like. */
	base: RunMetrics;
	current: RunMetrics;
	flipped: FlippedCase[];
}

export function computeCompare(current: GradedRun, base: GradedRun): CompareSummary {
	const baseById = new Map(base.cases.map((graded) => [graded.id, graded]));
	const currentIds = new Set(current.cases.map((graded) => graded.id));
	const sharedCurrent = current.cases.filter((graded) => baseById.has(graded.id));
	const sharedBase = base.cases.filter((graded) => currentIds.has(graded.id));

	const flipped: FlippedCase[] = [];
	for (const after of sharedCurrent) {
		const before = baseById.get(after.id);
		if (!before || before.pass === after.pass) continue;
		flipped.push({
			id: after.id,
			bucket: after.bucket,
			accepts: after.accepts,
			direction: after.pass ? 'fixed' : 'broken',
			before: before.trials.map((trial) => trial.label),
			after: after.trials.map((trial) => trial.label),
		});
	}
	flipped.sort((a, b) => a.direction.localeCompare(b.direction) || a.id.localeCompare(b.id));

	return {
		baseMeta: base.meta,
		sharedCases: sharedCurrent.length,
		onlyInResults: current.cases.filter((graded) => !baseById.has(graded.id)).map((c) => c.id),
		onlyInCompare: base.cases.filter((graded) => !currentIds.has(graded.id)).map((c) => c.id),
		base: computeRunMetrics(sharedBase),
		current: computeRunMetrics(sharedCurrent),
		flipped,
	};
}

// ---------------------------------------------------------------------------
// Failure reasons
// ---------------------------------------------------------------------------

function oneLine(text: string, max: number): string {
	const flat = text.replace(/\s+/g, ' ').trim();
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Groups the failing trials of a case into one line, most frequent route first. */
export function failureReason(graded: GradedCase): string {
	const groups = new Map<string, { count: number; detail: string }>();
	for (const trial of graded.trials.filter((candidate) => !candidate.pass)) {
		const { resolution } = trial;
		let detail = resolution.evidence;
		if (resolution.judgeError) detail = `judge error: ${oneLine(resolution.judgeError, 80)}`;
		else if (resolution.judgeReason) detail = `judge: ${oneLine(resolution.judgeReason, 110)}`;
		const key = `${trial.label}\u0000${resolution.evidence}`;
		const group = groups.get(key);
		if (group) group.count++;
		else groups.set(key, { count: 1, detail });
	}
	return [...groups.entries()]
		.sort((a, b) => b[1].count - a[1].count)
		.map(([key, group]) => `${key.split('\u0000')[0]} x${group.count} (${group.detail})`)
		.join('; ');
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function pct(value: number | null): string {
	return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function frac(value: Rate): string {
	return value.rate === null ? 'n/a' : `${pct(value.rate)} (${value.num}/${value.den})`;
}

function pp(after: number | null, before: number | null): string {
	if (after === null || before === null) return 'n/a';
	const delta = (after - before) * 100;
	return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pp`;
}

function cell(text: string): string {
	return text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
}

function table(header: string[], rows: string[][]): string {
	const lines = [
		`| ${header.map(cell).join(' | ')} |`,
		`| ${header.map(() => '---').join(' | ')} |`,
		...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
	];
	return lines.join('\n');
}

function code(text: string): string {
	return `\`${text}\``;
}

function acceptsText(accepts: readonly string[]): string {
	return accepts.length === 0 ? '(none)' : accepts.join(', ');
}

function renderHeadline(metrics: RunMetrics): string {
	const row = (name: string, scope: ScopeMetrics) => [
		name,
		String(scope.cases),
		pct(scope.macroAccuracy),
		frac(scope.casePass),
		frac(scope.trialPass),
		pct(scope.strictMacroAccuracy),
		frac(scope.strictTrialPass),
		frac(scope.overAsking),
		frac(scope.skillLoad),
	];
	return table(
		[
			'Scope',
			'Cases',
			'Macro accuracy',
			'Case pass rate',
			'Trial accuracy',
			'Strict macro',
			'Strict trial accuracy',
			'Over-asking',
			'Skill-load rate',
		],
		[
			row('All cases', metrics.all),
			row('Excluding policyDependent', metrics.excludingPolicyDependent),
		],
	);
}

function renderBuckets(metrics: RunMetrics): string {
	const rows = BUCKETS.flatMap((bucket) => {
		const all = metrics.all.buckets[bucket];
		if (!all) return [];
		const excluded = metrics.excludingPolicyDependent.buckets[bucket];
		return [
			[
				bucket,
				String(all.cases),
				frac(all.casePass),
				frac(all.trialPass),
				frac(all.strictCasePass),
				frac(all.strictTrialPass),
				all.overAsking ? frac(all.overAsking) : '-',
				excluded ? frac(excluded.casePass) : 'n/a (0 cases)',
			],
		];
	});
	return table(
		[
			'Bucket',
			'Cases',
			'Case pass rate',
			'Trial pass rate',
			'Strict case pass rate',
			'Strict trial pass rate',
			'Over-asking',
			'Case pass rate excl. policyDependent',
		],
		rows,
	);
}

function renderSkill(metrics: RunMetrics): string {
	const row = (name: string, scope: BucketMetrics | ScopeMetrics) => [
		name,
		String(scope.skillLoad.den),
		frac(scope.skillLoad),
		frac(scope.passWithSkill),
		frac(scope.passWithoutSkill),
	];
	const rows = [
		row('**All**', metrics.all),
		...BUCKETS.flatMap((bucket) => {
			const scope = metrics.all.buckets[bucket];
			return scope ? [row(bucket, scope)] : [];
		}),
	];
	return table(
		['Bucket', 'Trials', 'Skill-load rate', 'Pass rate with skill', 'Pass rate without skill'],
		rows,
	);
}

function renderConfusion(confusion: Confusion): string {
	const columns = labelColumns(confusion);
	const rows = BUCKETS.flatMap((bucket) => {
		const row = confusion[bucket];
		if (!row) return [];
		const total = Object.values(row).reduce((sum, count) => sum + count, 0);
		return [[bucket, ...columns.map((label) => String(row[label] ?? 0)), String(total)]];
	});
	return table(['Bucket \\ Route', ...columns, 'Total'], rows);
}

function renderSameDirectionOnly(cases: readonly GradedCase[]): string {
	const lenient = cases.filter((graded) => graded.pass && !graded.strictPass);
	if (lenient.length === 0) return 'No case passes only because of a same-direction clarification.';
	const rows = lenient.map((graded) => [
		code(graded.id),
		graded.bucket,
		acceptsText(graded.accepts),
		`${graded.strictPassedTrials} -> ${graded.passedTrials} of ${graded.trials.length}: ${graded.trials.map((trial) => trial.label).join(', ')}`,
	]);
	return table(['Case', 'Bucket', 'Accepts', 'Trials passed (strict -> v2): routes'], rows);
}

function renderPendingRerun(pending: readonly PendingRerunCase[]): string {
	const rows = pending.map((entry) => [
		code(entry.id),
		entry.bucket,
		`${entry.staleTrials.length} of ${entry.trials}`,
		[...new Set(entry.staleTrials.map((stale) => stale.stopCall))].join(', '),
	]);
	return table(['Case', 'Bucket', 'Stale trials', 'Stopped on'], rows);
}

function renderFailing(cases: readonly GradedCase[]): string {
	const failing = cases.filter((graded) => !graded.pass);
	if (failing.length === 0) return 'No failing cases.';
	const rows = failing.map((graded) => [
		code(graded.id) + (graded.policyDependent ? ' (policyDependent)' : ''),
		graded.bucket,
		acceptsText(graded.accepts),
		`${graded.passedTrials}/${graded.trials.length}: ${graded.trials.map((trial) => trial.label).join(', ')}`,
		failureReason(graded),
	]);
	return table(['Case', 'Bucket', 'Accepts', 'Trials passed: routes', 'Reason'], rows);
}

function renderCompare(compare: CompareSummary, currentMeta: RunMeta): string {
	const { base, current } = compare;
	const lines: string[] = [
		`Deltas are ${code(currentMeta.variant)} (\`--results\`) minus ${code(compare.baseMeta.variant)} (\`--compare\`, run ${code(compare.baseMeta.runId)}), over the ${compare.sharedCases} cases present in both runs.`,
	];
	if (compare.onlyInResults.length > 0 || compare.onlyInCompare.length > 0) {
		lines.push(
			`Cases only in \`--results\`: ${compare.onlyInResults.length}. Cases only in \`--compare\`: ${compare.onlyInCompare.length}. They are left out of the deltas.`,
		);
	}

	const headlineRow = (scopeName: string, before: ScopeMetrics, after: ScopeMetrics) => [
		[
			scopeName,
			'Macro accuracy',
			pct(before.macroAccuracy),
			pct(after.macroAccuracy),
			pp(after.macroAccuracy, before.macroAccuracy),
		],
		[
			scopeName,
			'Case pass rate',
			frac(before.casePass),
			frac(after.casePass),
			pp(after.casePass.rate, before.casePass.rate),
		],
		[
			scopeName,
			'Trial accuracy',
			frac(before.trialPass),
			frac(after.trialPass),
			pp(after.trialPass.rate, before.trialPass.rate),
		],
		[
			scopeName,
			'Strict macro',
			pct(before.strictMacroAccuracy),
			pct(after.strictMacroAccuracy),
			pp(after.strictMacroAccuracy, before.strictMacroAccuracy),
		],
		[
			scopeName,
			'Strict trial accuracy',
			frac(before.strictTrialPass),
			frac(after.strictTrialPass),
			pp(after.strictTrialPass.rate, before.strictTrialPass.rate),
		],
		[
			scopeName,
			'Over-asking',
			frac(before.overAsking),
			frac(after.overAsking),
			pp(after.overAsking.rate, before.overAsking.rate),
		],
		[
			scopeName,
			'Skill-load rate',
			frac(before.skillLoad),
			frac(after.skillLoad),
			pp(after.skillLoad.rate, before.skillLoad.rate),
		],
	];
	lines.push(
		'',
		table(
			['Scope', 'Metric', compare.baseMeta.variant, currentMeta.variant, 'Delta'],
			[
				...headlineRow('All cases', base.all, current.all),
				...headlineRow(
					'Excl. policyDependent',
					base.excludingPolicyDependent,
					current.excludingPolicyDependent,
				),
			],
		),
	);

	const bucketRows = BUCKETS.flatMap((bucket) => {
		const before = base.all.buckets[bucket];
		const after = current.all.buckets[bucket];
		if (!before || !after) return [];
		return [
			[
				bucket,
				String(after.cases),
				`${pct(before.casePass.rate)} -> ${pct(after.casePass.rate)}`,
				pp(after.casePass.rate, before.casePass.rate),
				`${pct(before.trialPass.rate)} -> ${pct(after.trialPass.rate)}`,
				pp(after.trialPass.rate, before.trialPass.rate),
				pp(after.strictCasePass.rate, before.strictCasePass.rate),
				before.overAsking && after.overAsking
					? pp(after.overAsking.rate, before.overAsking.rate)
					: '-',
				pp(after.skillLoad.rate, before.skillLoad.rate),
			],
		];
	});
	lines.push(
		'',
		'### Per-bucket deltas',
		'',
		table(
			[
				'Bucket',
				'Cases',
				'Case pass rate',
				'Delta',
				'Trial pass rate',
				'Delta',
				'Strict case pass delta',
				'Over-asking delta',
				'Skill-load delta',
			],
			bucketRows,
		),
		'',
		'### Flipped cases',
		'',
	);

	if (compare.flipped.length === 0) {
		lines.push('No case changed between pass and fail.');
	} else {
		const fixed = compare.flipped.filter((flip) => flip.direction === 'fixed').length;
		lines.push(
			`${fixed} fixed (fail to pass), ${compare.flipped.length - fixed} broken (pass to fail).`,
			'',
			table(
				[
					'Case',
					'Bucket',
					'Change',
					'Accepts',
					`Routes (${compare.baseMeta.variant})`,
					`Routes (${currentMeta.variant})`,
				],
				compare.flipped.map((flip) => [
					code(flip.id),
					flip.bucket,
					flip.direction,
					acceptsText(flip.accepts),
					flip.before.join(', '),
					flip.after.join(', '),
				]),
			),
		);
	}
	return lines.join('\n');
}

export interface HealthSummary {
	streamStatus: Record<string, number>;
	rules: Record<string, number>;
	runErrors: Array<{ caseId: string; trial: number; error: string }>;
	unresolvedTrials: number;
	judgedTrials: number;
	judgeFailedTrials: number;
	judge: JudgeStats;
	warnings: string[];
}

export function computeHealth(
	run: GradedRun,
	judge: JudgeStats,
	warnings: readonly string[],
): HealthSummary {
	const streamStatus: Record<string, number> = {};
	const rules: Record<string, number> = {};
	const runErrors: HealthSummary['runErrors'] = [];
	let unresolvedTrials = 0;
	let judgedTrials = 0;
	let judgeFailedTrials = 0;
	for (const graded of run.cases) {
		for (const trial of graded.trials) {
			streamStatus[trial.streamStatus] = (streamStatus[trial.streamStatus] ?? 0) + 1;
			const rule: ResolutionRule | 'unresolved' = trial.resolution.rule ?? 'unresolved';
			const ruleKey = rule === 'unresolved' ? rule : `rule ${rule}`;
			rules[ruleKey] = (rules[ruleKey] ?? 0) + 1;
			if (trial.runError) {
				runErrors.push({ caseId: graded.id, trial: trial.trial, error: trial.runError });
			}
			if (trial.resolution.route === 'none') unresolvedTrials++;
			if (trial.judged) judgedTrials++;
			if (trial.resolution.judgeError) judgeFailedTrials++;
		}
	}
	return {
		streamStatus,
		rules,
		runErrors,
		unresolvedTrials,
		judgedTrials,
		judgeFailedTrials,
		judge,
		warnings: [...warnings],
	};
}

function renderHealth(run: GradedRun, health: HealthSummary): string {
	const counts = (record: Record<string, number>) =>
		Object.entries(record)
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([key, count]) => `${key} ${count}`)
			.join(', ') || 'none';
	const lines = [
		`- Stream status: ${counts(health.streamStatus)}.`,
		`- Deciding rule: ${counts(health.rules)}.`,
		`- Trials with no resolvable route (\`none\`): ${health.unresolvedTrials}.`,
		`- Judge: ${health.judgedTrials} trials judged, ${health.judge.cacheHits} cache hits, ${health.judge.apiCalls} API requests, ${health.judgeFailedTrials} trials failed to judge, ${health.judge.inputTokens} input and ${health.judge.outputTokens} output tokens.`,
	];
	if (health.runErrors.length > 0) {
		lines.push(`- Trials with a run error: ${health.runErrors.length}.`);
		for (const runError of health.runErrors.slice(0, 10)) {
			lines.push(
				`  - ${code(runError.caseId)} trial ${runError.trial}: ${oneLine(runError.error, 160)}`,
			);
		}
		if (health.runErrors.length > 10) lines.push(`  - and ${health.runErrors.length - 10} more.`);
	}
	if (run.missingCaseIds.length > 0) {
		lines.push(
			`- Case ids in the results with no case file (not graded): ${run.missingCaseIds.map(code).join(', ')}.`,
		);
	}
	if (run.emptyCaseIds.length > 0) {
		lines.push(`- Cases with no trials (not graded): ${run.emptyCaseIds.map(code).join(', ')}.`);
	}
	if (run.pendingRerun.length > 0) {
		lines.push(
			`- Cases pending a re-run (not graded): ${run.pendingRerun.length}. See "Pending re-run".`,
		);
	}
	for (const warning of health.warnings) lines.push(`- Warning: ${warning}`);
	return lines.join('\n');
}

function renderAllCases(cases: readonly GradedCase[]): string {
	const rows = cases.map((graded) => [
		code(graded.id),
		graded.bucket,
		acceptsText(graded.accepts),
		graded.pass ? (graded.strictPass ? 'pass' : 'pass (strict fail)') : 'fail',
		graded.trials
			.map((trial) => `${trial.label} [${trial.resolution.evidence}]${trial.pass ? '' : ' (fail)'}`)
			.join('; '),
	]);
	return table(['Case', 'Bucket', 'Accepts', 'Result', 'Trials'], rows);
}

export interface ReportInput {
	run: GradedRun;
	metrics: RunMetrics;
	confusion: Confusion;
	health: HealthSummary;
	casesDir: string;
	compare?: CompareSummary;
}

export function renderReport(input: ReportInput): string {
	const { run, metrics, confusion, health, compare } = input;
	const { meta } = run;
	const sections: string[] = [
		`# Routing eval report: ${meta.variant}`,
		'',
		`Run ${code(meta.runId)}, variant ${code(meta.variant)}, model ${code(meta.model)}. Started ${meta.startedAt ?? 'unknown'}, finished ${meta.finishedAt ?? 'unknown'}. ${metrics.all.cases} cases, ${metrics.all.trials} trials. Results: ${code(meta.file)}. Cases: ${code(input.casesDir)}.`,
		'',
		'## Headline',
		'',
		renderHeadline(metrics),
		'',
		'Macro accuracy is the unweighted mean of the per-bucket case pass rates. A case passes when at least 2 of 3 trials pass. Trial accuracy is the share of all trials that pass.',
		'',
		'A trial passes when its route matches an accept token of the case. In the agent bucket it also passes on `clarify:agent` or `clarify:both`, and in the workflow bucket on `clarify:workflow` or `clarify:both` (same-direction clarification). The strict scores use the accept tokens only. Over-asking is the share of agent-bucket and workflow-bucket trials that are a same-direction clarification.',
	];
	if (health.judgeFailedTrials > 0 || health.unresolvedTrials > 0) {
		sections.push(
			'',
			`**Note:** trials with no resolvable route: ${health.unresolvedTrials} (judge failures: ${health.judgeFailedTrials}). They count as failures. See "Run health".`,
		);
	}
	if (run.pendingRerun.length > 0) {
		sections.push(
			'',
			`**Note:** ${run.pendingRerun.length} cases are not graded because a trial stopped on a call that no longer commits. See "Pending re-run".`,
		);
	}
	if (compare) sections.push('', '## Compare', '', renderCompare(compare, meta));
	sections.push(
		'',
		'## Per bucket',
		'',
		renderBuckets(metrics),
		'',
		'## Intent-recognition skill',
		'',
		`Share of trials with ${code('intent-recognition')} in ${code('skillsLoaded')}, and the trial pass rate with and without it.`,
		'',
		renderSkill(metrics),
		'',
		'## Confusion (trial counts)',
		'',
		'Rows are the case bucket. Columns are the resolved route; `clarify` is split by steer.',
		'',
		renderConfusion(confusion),
		'',
		'## Failing cases',
		'',
		renderFailing(run.cases),
		'',
		'## Pass only with same-direction clarification',
		'',
		renderSameDirectionOnly(run.cases),
		'',
		'## Run health',
		'',
		renderHealth(run, health),
		'',
	);
	if (run.pendingRerun.length > 0) {
		sections.push(
			'## Pending re-run',
			'',
			'These cases are left out of every metric above. A trial stopped on a call that committed under the old rules but not under the current ones, so the run would have gone on. Re-run them to grade them.',
			'',
			renderPendingRerun(run.pendingRerun),
			'',
		);
	}
	sections.push(
		'<details><summary>All cases</summary>',
		'',
		renderAllCases(run.cases),
		'',
		'</details>',
		'',
	);
	return sections.join('\n');
}
