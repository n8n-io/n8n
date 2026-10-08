/**
 * Pure view model for the Checks tab: groups eval cases into checks and reads
 * each example's verdict from the latest run. Free of Pinia and the REST client
 * so the grouping and status rules are testable on their own.
 */
import { AGENT_EVAL_VERDICT_METRIC, agentEvalVerdictSchema } from '@n8n/api-types';
import type { AgentEvalVerdict, AgentJsonConfig } from '@n8n/api-types';

import { formatToolNameForDisplay } from './toolDisplayName';
import type {
	AgentEvalCase,
	AgentEvalResultRecord,
	InstanceAiEvalAgentToolCallRecord,
} from '../agentEvals.types';

/** What happened to one example in a run. */
export type AgentCheckExampleState = 'pass' | 'needs_work' | 'failed' | 'running' | 'not_run';

export type AgentCheckExample = {
	rowId: number;
	input: string;
	kind: string | null;
	state: AgentCheckExampleState;
	reply: string | null;
	reason: string | null;
	/** The judge's suggested instruction when the example needs work. */
	suggestedFix?: string | null;
	toolCalls: InstanceAiEvalAgentToolCallRecord[];
	result: AgentEvalResultRecord | null;
};

/** How a check moved between the previous run and the latest one. */
export type AgentCheckChange = 'broke' | 'fixed' | 'none';

export type AgentCheck = {
	/** Stable key: the check name, or the rule when no name is mapped. */
	key: string;
	name: string;
	rule: string;
	examples: AgentCheckExample[];
	needsWork: number;
	change: AgentCheckChange;
	lastRunAt: string | null;
};

/** How many checks are in each state, for the filter buttons. */
export type AgentCheckCounts = { total: number; needsWork: number; pass: number; notRun: number };

/** Fewer checks than this reads as low coverage. */
export const LOW_COVERAGE_THRESHOLD = 3;

export const readVerdict = (result: AgentEvalResultRecord | null): AgentEvalVerdict | null => {
	const raw = result?.metrics?.[AGENT_EVAL_VERDICT_METRIC];
	const parsed = agentEvalVerdictSchema.safeParse(raw);
	return parsed.success ? parsed.data : null;
};

const isToolCallRecord = (value: unknown): value is InstanceAiEvalAgentToolCallRecord =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as { tool?: unknown }).tool === 'string';

export const readToolCalls = (
	result: AgentEvalResultRecord | null,
): InstanceAiEvalAgentToolCallRecord[] => {
	const calls: unknown = result?.toolCalls?.calls;
	return Array.isArray(calls) ? calls.filter(isToolCallRecord) : [];
};

const readReply = (result: AgentEvalResultRecord | null): string | null => {
	const text = result?.output?.finalText;
	return typeof text === 'string' ? text : null;
};

export const exampleState = (
	result: AgentEvalResultRecord | null,
	markedFine = false,
): AgentCheckExampleState => {
	if (!result) return 'not_run';
	if (result.status === 'new' || result.status === 'running') return 'running';
	if (result.status !== 'success') return result.status === 'cancelled' ? 'not_run' : 'failed';
	// "Actually fine" overrides the judge. A result with no judge counts as passing, but
	// one the judge failed on wasn't checked, so it must not look like a pass.
	if (markedFine) return 'pass';
	const verdict = readVerdict(result);
	if (!verdict && result.metrics?.judgeError) return 'failed';
	return verdict?.result === 'needs_work' ? 'needs_work' : 'pass';
};

/** Shortens a rule into a check name when the dataset maps no check column. */
export const nameFromRule = (rule: string): string => {
	const clean = rule.trim().replace(/[.!?]+$/, '');
	const words = clean.split(/\s+/);
	return words.length > 8 ? `${words.slice(0, 8).join(' ')}…` : clean;
};

/**
 * Each row's newest and second-newest result across runs. Runs can cover a
 * subset of rows (one check, one example), so a row's latest result may come
 * from an older run than its neighbour's. `runs` is newest first.
 */
const resultsByRow = (runs: AgentEvalResultRecord[][]) => {
	const latest = new Map<string, AgentEvalResultRecord>();
	const previous = new Map<string, AgentEvalResultRecord>();
	for (const results of runs) {
		for (const result of results) {
			if (!result.sourceRowId) continue;
			if (!latest.has(result.sourceRowId)) latest.set(result.sourceRowId, result);
			else if (!previous.has(result.sourceRowId)) previous.set(result.sourceRowId, result);
		}
	}
	return { latest, previous };
};

/**
 * Groups cases into checks (by check name, else by rule) and attaches each
 * example's newest result. The result before it tells a check that broke from
 * one that got fixed. `fineResultIds` are results someone marked "Actually fine".
 */
export const buildChecks = (
	cases: AgentEvalCase[],
	runs: AgentEvalResultRecord[][],
	fineResultIds: ReadonlySet<string> = new Set(),
): AgentCheck[] => {
	const { latest: latestByRow, previous: previousByRow } = resultsByRow(runs);
	const groups = new Map<string, AgentCheck>();

	for (const evalCase of cases) {
		// Prepared rows aren't checks until the user adds them.
		if (evalCase.suggested) continue;
		const rule = evalCase.whatToCheck.trim();
		const named = evalCase.check?.trim();
		const key = named || rule || `row-${evalCase.rowId}`;
		let check = groups.get(key);
		if (!check) {
			check = {
				key,
				name: named || nameFromRule(rule || evalCase.input),
				rule,
				examples: [],
				needsWork: 0,
				change: 'none',
				lastRunAt: null,
			};
			groups.set(key, check);
		}

		const result = latestByRow.get(String(evalCase.rowId)) ?? null;
		const state = exampleState(result, result ? fineResultIds.has(result.id) : false);
		check.examples.push({
			rowId: evalCase.rowId,
			input: evalCase.input,
			kind: evalCase.kind?.trim() || null,
			state,
			reply: readReply(result),
			reason: readVerdict(result)?.reason ?? null,
			suggestedFix: readVerdict(result)?.suggestedFix ?? null,
			toolCalls: readToolCalls(result),
			result,
		});
		if (state === 'needs_work') check.needsWork++;
		const ranAt = result?.completedAt ?? null;
		if (ranAt && (!check.lastRunAt || ranAt > check.lastRunAt)) check.lastRunAt = ranAt;

		const prior = previousByRow.get(String(evalCase.rowId)) ?? null;
		const before = exampleState(prior, prior ? fineResultIds.has(prior.id) : false);
		if (state === 'needs_work' && before === 'pass') check.change = 'broke';
		else if (state === 'pass' && before === 'needs_work' && check.change !== 'broke') {
			check.change = 'fixed';
		}
	}

	// Checks that need work first, then in dataset order.
	return [...groups.values()].sort((a, b) => Number(b.needsWork > 0) - Number(a.needsWork > 0));
};

// Still running counts as not run: nothing is judged yet, so it can't count as a pass.
const isUnrun = (check: AgentCheck) =>
	check.examples.every((ex) => ex.state === 'not_run' || ex.state === 'running');

/** Counts for the filter buttons: a check needs work if any example does; one never run (or still running) counts as not run. */
export const checkCounts = (checks: AgentCheck[]): AgentCheckCounts => {
	const needsWork = checks.filter((check) => check.needsWork > 0).length;
	const notRun = checks.filter((check) => check.needsWork === 0 && isUnrun(check)).length;
	return { total: checks.length, needsWork, notRun, pass: checks.length - needsWork - notRun };
};

export type AgentCheckFilter = 'all' | 'needs_work' | 'pass' | 'not_run';

export const matchesFilter = (check: AgentCheck, filter: AgentCheckFilter): boolean => {
	if (filter === 'needs_work') return check.needsWork > 0;
	if (filter === 'not_run') return check.needsWork === 0 && isUnrun(check);
	if (filter === 'pass') return check.needsWork === 0 && !isUnrun(check);
	return true;
};

/** With every check in one state, the filter shows a single button that only reports it. */
export const singleState = (counts: AgentCheckCounts): Exclude<AgentCheckFilter, 'all'> | null => {
	const states = (['needs_work', 'pass', 'not_run'] as const).filter((state) =>
		state === 'needs_work' ? counts.needsWork : state === 'pass' ? counts.pass : counts.notRun,
	);
	return counts.total > 0 && states.length === 1 ? states[0] : null;
};

/** Prepared cases waiting under the table, in dataset order. */
export const suggestionsOf = (cases: AgentEvalCase[]): AgentEvalCase[] =>
	cases.filter((evalCase) => evalCase.suggested);

/** A tool call as the practice thread shows it: the tool's display name and its first text input. */
export const toolCallParts = (
	call: InstanceAiEvalAgentToolCallRecord,
): { tool: string; detail: string | null } => {
	const input = call.input;
	const detail =
		input && typeof input === 'object' && !Array.isArray(input)
			? Object.values(input as Record<string, unknown>).find((v) => typeof v === 'string')
			: undefined;
	return {
		tool: formatToolNameForDisplay(call.tool),
		detail: typeof detail === 'string' && detail.length > 0 ? detail : null,
	};
};

const CHANNEL_NAMES: Record<string, string> = {
	slack: 'Slack',
	telegram: 'Telegram',
	linear: 'Linear',
	discord: 'Discord',
};

/**
 * What a practice run keeps the agent from really using, by the names people know:
 * channels first, then node tools by their node's display name. Unique, in order.
 */
export const connectedNames = (
	config: Pick<AgentJsonConfig, 'integrations' | 'tools'>,
	nodeDisplayName: (nodeType: string) => string | undefined,
): string[] => {
	const channels = (config.integrations ?? []).map(
		(integration) => CHANNEL_NAMES[integration.type] ?? integration.type,
	);
	const tools = (config.tools ?? []).flatMap((tool) => {
		if (tool.type !== 'node') return [];
		const name = nodeDisplayName(tool.node.nodeType)?.replace(/\s+Tool$/, '');
		return name ? [name] : [];
	});
	return [...new Set([...channels, ...tools])];
};
