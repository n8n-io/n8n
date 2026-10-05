// ---------------------------------------------------------------------------
// Types and tolerant parsers for the routing grader's inputs: the results JSON
// that the runner writes and the routing case files.
//
// The parsers accept missing optional fields so an older or partial results
// file still grades. They reject only what the grader cannot work without.
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ROUTES = [
	'agent',
	'workflow',
	'one-off',
	'debug',
	'multi',
	'clarify',
	'answer',
	'decline',
	'none',
] as const;
export type Route = (typeof ROUTES)[number];

export const BUCKETS = [
	'agent',
	'workflow',
	'one-off',
	'debug',
	'answer',
	'clarify',
	'multi',
	'decline',
] as const;
export type Bucket = (typeof BUCKETS)[number];

export const STEERS = ['agent', 'workflow', 'both', 'none'] as const;
export type Steer = (typeof STEERS)[number];

export const ACCEPT_TOKENS = [
	'agent',
	'workflow',
	'one-off',
	'debug',
	'multi',
	'answer',
	'decline',
	'clarify',
	'clarify:agent',
	'clarify:open',
] as const;
export type AcceptToken = (typeof ACCEPT_TOKENS)[number];

export interface RoutingCase {
	id: string;
	bucket: Bucket;
	userMessage: string;
	accepts: AcceptToken[];
	policyDependent: boolean;
	agentShaped?: boolean;
	source?: string;
	rationale?: string;
}

export interface TrialToolCall {
	toolName: string;
	args: Record<string, unknown>;
	status?: string;
}

export interface AskUserQuestion {
	question: string;
	options: string[];
}

export interface TrialResult {
	trial: number;
	durationMs?: number;
	streamStatus: string;
	toolCalls: TrialToolCall[];
	spawnedAgents: string[];
	skillsLoaded: string[];
	askUserQuestions: AskUserQuestion[];
	finalText: string;
	runError?: string;
}

export interface CaseResult {
	id: string;
	trials: TrialResult[];
}

export interface RoutingResults {
	runId: string;
	variant: string;
	model: string;
	startedAt?: string;
	finishedAt?: string;
	cases: CaseResult[];
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
	return typeof value === 'string' && values.some((candidate) => candidate === value);
}

export const isRoute = (value: unknown): value is Route => isOneOf(ROUTES, value);
export const isBucket = (value: unknown): value is Bucket => isOneOf(BUCKETS, value);
export const isSteer = (value: unknown): value is Steer => isOneOf(STEERS, value);
export const isAcceptToken = (value: unknown): value is AcceptToken =>
	isOneOf(ACCEPT_TOKENS, value);

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function stringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function parseToolCall(raw: unknown): TrialToolCall | undefined {
	if (!isRecord(raw) || typeof raw.toolName !== 'string') return undefined;
	return {
		toolName: raw.toolName,
		args: isRecord(raw.args) ? raw.args : {},
		status: optionalString(raw.status),
	};
}

export function parseAskUserQuestion(raw: unknown): AskUserQuestion | undefined {
	if (!isRecord(raw) || typeof raw.question !== 'string') return undefined;
	return { question: raw.question, options: stringArray(raw.options) };
}

function parseTrial(raw: unknown, index: number, where: string): TrialResult {
	if (!isRecord(raw)) throw new Error(`${where}: trial ${index + 1} is not an object`);
	const toolCalls = Array.isArray(raw.toolCalls)
		? raw.toolCalls.map(parseToolCall).filter((call): call is TrialToolCall => call !== undefined)
		: [];
	const askUserQuestions = Array.isArray(raw.askUserQuestions)
		? raw.askUserQuestions
				.map(parseAskUserQuestion)
				.filter((question): question is AskUserQuestion => question !== undefined)
		: [];
	return {
		trial: typeof raw.trial === 'number' ? raw.trial : index + 1,
		durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : undefined,
		streamStatus: optionalString(raw.streamStatus) ?? 'unknown',
		toolCalls,
		spawnedAgents: stringArray(raw.spawnedAgents),
		skillsLoaded: stringArray(raw.skillsLoaded),
		askUserQuestions,
		finalText: optionalString(raw.finalText) ?? '',
		runError: optionalString(raw.runError),
	};
}

export function parseResults(raw: unknown, file: string): RoutingResults {
	if (!isRecord(raw)) throw new Error(`${file}: results must be a JSON object`);
	if (!Array.isArray(raw.cases)) throw new Error(`${file}: "cases" must be an array`);

	// Merge entries that share an id, so a resumed run that appends trials still grades.
	const byId = new Map<string, CaseResult>();
	for (const [caseIndex, rawCase] of raw.cases.entries()) {
		if (!isRecord(rawCase) || typeof rawCase.id !== 'string') {
			throw new Error(`${file}: case ${caseIndex + 1} has no string "id"`);
		}
		const where = `${file}: case ${rawCase.id}`;
		const trials = Array.isArray(rawCase.trials)
			? rawCase.trials.map((trial, index) => parseTrial(trial, index, where))
			: [];
		const existing = byId.get(rawCase.id);
		if (existing) existing.trials.push(...trials);
		else byId.set(rawCase.id, { id: rawCase.id, trials });
	}

	return {
		runId: optionalString(raw.runId) ?? 'unknown',
		variant: optionalString(raw.variant) ?? 'unknown',
		model: optionalString(raw.model) ?? 'unknown',
		startedAt: optionalString(raw.startedAt),
		finishedAt: optionalString(raw.finishedAt),
		cases: [...byId.values()],
	};
}

export function readResultsFile(file: string): RoutingResults {
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
	return parseResults(parsed, file);
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export interface LoadedCases {
	byId: Map<string, RoutingCase>;
	warnings: string[];
}

function parseCase(raw: unknown, file: string, warnings: string[]): RoutingCase | undefined {
	if (!isRecord(raw)) {
		warnings.push(`${file}: not a JSON object, skipped`);
		return undefined;
	}
	if (typeof raw.id !== 'string' || typeof raw.userMessage !== 'string') {
		warnings.push(`${file}: missing "id" or "userMessage", skipped`);
		return undefined;
	}
	if (!isBucket(raw.bucket)) {
		warnings.push(`${raw.id}: unknown bucket ${JSON.stringify(raw.bucket)}, skipped`);
		return undefined;
	}
	const rawAccepts = stringArray(raw.accepts);
	const accepts = rawAccepts.filter(isAcceptToken);
	for (const token of rawAccepts) {
		if (!isAcceptToken(token)) warnings.push(`${raw.id}: unknown accept token "${token}" ignored`);
	}
	if (accepts.length === 0) {
		warnings.push(`${raw.id}: no valid accept tokens, so every trial fails`);
	}
	return {
		id: raw.id,
		bucket: raw.bucket,
		userMessage: raw.userMessage,
		accepts,
		policyDependent: raw.policyDependent === true,
		agentShaped: typeof raw.agentShaped === 'boolean' ? raw.agentShaped : undefined,
		source: optionalString(raw.source),
		rationale: optionalString(raw.rationale),
	};
}

/** Reads every `*.json` file in the directory and indexes the cases by `id`. */
export function loadRoutingCases(dir: string): LoadedCases {
	const warnings: string[] = [];
	const byId = new Map<string, RoutingCase>();
	const files = readdirSync(dir)
		.filter((name) => name.endsWith('.json'))
		.sort();
	for (const name of files) {
		const file = join(dir, name);
		let parsed: unknown;
		try {
			parsed = JSON.parse(readFileSync(file, 'utf8'));
		} catch (error) {
			warnings.push(
				`${name}: invalid JSON (${error instanceof Error ? error.message : 'unknown'})`,
			);
			continue;
		}
		const routingCase = parseCase(parsed, name, warnings);
		if (!routingCase) continue;
		if (`${routingCase.id}.json` !== name) {
			warnings.push(`${name}: file name does not match id "${routingCase.id}"`);
		}
		if (byId.has(routingCase.id)) {
			warnings.push(`${name}: duplicate id "${routingCase.id}", later file ignored`);
			continue;
		}
		byId.set(routingCase.id, routingCase);
	}
	return { byId, warnings };
}
