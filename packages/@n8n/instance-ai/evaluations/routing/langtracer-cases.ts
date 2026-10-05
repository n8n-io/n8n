// ---------------------------------------------------------------------------
// Maps routing cases to LangTracer cases and back.
//
// A LangTracer case has no routing fields, so the routing labels travel as
// tags (see the v2 addendum in the routing spec):
//
//   routing, bucket:<bucket>, accepts:<token> (one per token), policy-dependent,
//   agent-shaped, source:<source>, lang:<ISO 639-3 code>
//
// The full list goes in `evalTags`, which the suite export returns as `tags`,
// so the pull reads it from there. LangTracer's own case `tags` drop every tag
// that is not kebab-case, so they get only the kebab-case subset, for filtering
// in the LangTracer UI.
//
// `name` is the case id, `userPrompt` and the single conversation turn carry
// `userMessage`, `description` carries `rationale`, and `seed` and
// `conversation[0].attach` are LangTracer's own fields. `agent-shaped` is an
// addition to the spec's list, so the pull keeps `agentShaped`.
//
// Each case also carries one process expectation, `routingExpectationText`.
// LangTracer stores it as the case's only expectation and matches a run's
// result to it by text. The pull ignores it: the `accepts:` tags are the
// source of truth, and the text is derived from them.
//
// Pure, no network: the push CLI and the pull loader share it, and the tests
// cover the round trip without a server.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';

import { routingExpectationText } from './expectation';
import {
	DEFAULT_ROUTING_LANGUAGE,
	parseRoutingCase,
	type ROUTING_ACCEPT_TOKENS,
	type RoutingCase,
} from './loader';
import type { LangTracerUpdateCaseBody } from '../langtracer/client';
import type { LangTracerCreateCaseBody, PushableSeed } from '../langtracer/to-exported';

export const ROUTING_TAG = 'routing';
const POLICY_DEPENDENT_TAG = 'policy-dependent';
const AGENT_SHAPED_TAG = 'agent-shaped';
const BUCKET_PREFIX = 'bucket:';
const ACCEPTS_PREFIX = 'accepts:';
const SOURCE_PREFIX = 'source:';
const LANG_PREFIX = 'lang:';

/** Sources whose cases hold no user data (addendum: `synthetic: true` for these only). */
const SYNTHETIC_SOURCE_PREFIXES = ['suite-62:', 'agent-344:', 'discovery:'];

export type RoutingSetKind = 'regression' | 'capability_gap';

/** Fields the routing push sends in addition to the n8n create-case contract. */
interface RoutingCaseFields {
	userPrompt: string;
	expectedBehavior: string;
	/** LangTracer's own case tags: the kebab-case subset of `evalTags`. */
	tags: string[];
	/** Exactly one entry: `routingExpectationText(accepts)`. */
	processExpectations: string[];
}

export type RoutingLangTracerCreateBody = LangTracerCreateCaseBody & RoutingCaseFields;

export type RoutingLangTracerUpdateBody = LangTracerUpdateCaseBody &
	Partial<RoutingCaseFields> & {
		setKind?: RoutingSetKind;
		/** The patchable inverse of the create-only `synthetic` flag. */
		containsUserData?: boolean;
	};

export function isSyntheticSource(source: string): boolean {
	return source === 'synthetic' || SYNTHETIC_SOURCE_PREFIXES.some((p) => source.startsWith(p));
}

export function routingTags(routingCase: RoutingCase): string[] {
	return [
		ROUTING_TAG,
		`${BUCKET_PREFIX}${routingCase.bucket}`,
		...routingCase.accepts.map((token) => `${ACCEPTS_PREFIX}${token}`),
		...(routingCase.policyDependent ? [POLICY_DEPENDENT_TAG] : []),
		...(routingCase.agentShaped ? [AGENT_SHAPED_TAG] : []),
		`${SOURCE_PREFIX}${routingCase.source}`,
		`${LANG_PREFIX}${routingCase.language ?? DEFAULT_ROUTING_LANGUAGE}`,
	];
}

/** LangTracer keeps a case tag only when it is kebab-case. */
const CASE_TAG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The routing tags LangTracer stores as case tags. */
export function langTracerCaseTags(tags: string[]): string[] {
	return tags.filter((tag) => CASE_TAG_PATTERN.test(tag));
}

const ROUTE_PHRASES: Record<(typeof ROUTING_ACCEPT_TOKENS)[number], string> = {
	agent: 'build an Agent',
	workflow: 'build a workflow',
	'one-off': 'do the task once now',
	debug: 'inspect the executions',
	multi: 'plan the work as several tasks',
	answer: 'answer the question',
	decline: 'decline the request',
	clarify: 'ask a clarifying question',
	'clarify:agent': 'ask a clarifying question that points toward an Agent',
	'clarify:open': 'ask an open clarifying question that does not push a workflow only',
};

/** One sentence that names the accepted routes, for LangTracer's `expectedBehavior`. */
export function expectedBehaviorSentence(accepts: RoutingCase['accepts']): string {
	const phrases = accepts.map((token) => ROUTE_PHRASES[token]);
	const list =
		phrases.length <= 1
			? (phrases[0] ?? '')
			: `${phrases.slice(0, -1).join(', ')}${phrases.length > 2 ? ',' : ''} or ${phrases[phrases.length - 1]}`;
	return `The Assistant should ${list} (accepted routes: ${accepts.join(', ')}).`;
}

/** Why a routing case cannot be stored in LangTracer, or null when it can. */
export function unsupportedRoutingPushReason(routingCase: RoutingCase): string | null {
	if (routingCase.instanceState !== undefined) {
		return 'sets instanceState, which a LangTracer case cannot store';
	}
	return null;
}

function pushableSeedOf(routingCase: RoutingCase): PushableSeed | undefined {
	const seed = routingCase.seed;
	if (seed?.mode !== 'inline') return undefined;
	const { folders: _folders, ...rest } = seed;
	return rest;
}

export function toLangTracerCreateBody(
	routingCase: RoutingCase,
	opts: { suiteId: number; setKind: RoutingSetKind },
): RoutingLangTracerCreateBody {
	const tags = routingTags(routingCase);
	const seed = pushableSeedOf(routingCase);
	return {
		name: routingCase.id,
		setKind: opts.setKind,
		synthetic: isSyntheticSource(routingCase.source),
		suiteId: opts.suiteId,
		...(routingCase.rationale !== undefined ? { description: routingCase.rationale } : {}),
		userPrompt: routingCase.userMessage,
		expectedBehavior: expectedBehaviorSentence(routingCase.accepts),
		conversation: [
			{
				role: 'user',
				text: routingCase.userMessage,
				...(routingCase.attach ? { attach: routingCase.attach } : {}),
			},
		],
		// A routing case is one message; the build fields are required by the contract only.
		evalComplexity: 'simple',
		evalTags: tags,
		tags: langTracerCaseTags(tags),
		processExpectations: [routingExpectationText(routingCase.accepts)],
		...(seed ? { seed } : {}),
	};
}

/** The PATCH for an existing case: every routing field, so a re-push converges. */
export function toLangTracerUpdateBody(
	body: RoutingLangTracerCreateBody,
): RoutingLangTracerUpdateBody {
	const { suiteId: _suiteId, synthetic, seed, ...rest } = body;
	// An absent seed is sent as null and the outcome list as empty: a partial
	// PATCH would keep a stored seed or a second expectation alive.
	return { ...rest, outcomeExpectations: [], seed: seed ?? null, containsUserData: !synthetic };
}

/** The expectation lists of one suite-export body, trimmed like LangTracer stores them. */
export function exportedExpectations(raw: unknown): { process: string[]; outcome: string[] } {
	const list = (value: unknown) =>
		stringList(value)
			.map((text) => text.trim())
			.filter((text) => text.length > 0);
	return isRecord(raw)
		? { process: list(raw.processExpectations), outcome: list(raw.outcomeExpectations) }
		: { process: [], outcome: [] };
}

// ---------------------------------------------------------------------------
// LangTracer export → routing case
// ---------------------------------------------------------------------------

function stringList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function tagValues(tags: string[], prefix: string): string[] {
	return tags.filter((tag) => tag.startsWith(prefix)).map((tag) => tag.slice(prefix.length));
}

/**
 * Rebuilds the routing-case JSON from one suite-export body (`<name>.json`).
 * Returns the raw case for `parseRoutingCase`, or the reasons it cannot be
 * rebuilt. The export carries the case tags as `tags`. Its expectations and
 * scenarios are not read: `accepts` comes from the tags only.
 */
export function routingCaseJsonFromExport(
	name: string,
	raw: unknown,
): { success: true; json: Record<string, unknown> } | { success: false; issues: string[] } {
	if (!isRecord(raw)) return { success: false, issues: ['export body is not an object'] };
	const tags = stringList(raw.tags);
	if (!tags.includes(ROUTING_TAG)) {
		return { success: false, issues: [`no "${ROUTING_TAG}" tag, so it is not a routing case`] };
	}

	const issues: string[] = [];
	const single = (prefix: string): string | undefined => {
		const values = tagValues(tags, prefix);
		if (values.length > 1) issues.push(`more than one "${prefix}" tag`);
		return values[0];
	};
	const bucket = single(BUCKET_PREFIX);
	const source = single(SOURCE_PREFIX);
	const language = single(LANG_PREFIX);
	if (bucket === undefined) issues.push(`no "${BUCKET_PREFIX}" tag`);
	if (source === undefined) issues.push(`no "${SOURCE_PREFIX}" tag`);

	const conversation = Array.isArray(raw.conversation) ? raw.conversation : [];
	const [turn] = conversation;
	if (conversation.length !== 1 || !isRecord(turn) || turn.role !== 'user') {
		issues.push('conversation must be exactly one user turn');
	}
	if (issues.length > 0) return { success: false, issues };

	const opening = isRecord(turn) ? turn : {};
	return {
		success: true,
		json: {
			id: name,
			bucket,
			agentShaped: tags.includes(AGENT_SHAPED_TAG),
			userMessage: opening.text,
			accepts: tagValues(tags, ACCEPTS_PREFIX),
			policyDependent: tags.includes(POLICY_DEPENDENT_TAG),
			source,
			...(typeof raw.description === 'string' && raw.description.length > 0
				? { rationale: raw.description }
				: {}),
			...(raw.seed !== undefined && raw.seed !== null ? { seed: raw.seed } : {}),
			...(opening.attach !== undefined ? { attach: opening.attach } : {}),
			...(language !== undefined && language !== DEFAULT_ROUTING_LANGUAGE ? { language } : {}),
		},
	};
}

/** Rebuilds and validates every routing case of a suite export, reporting all failures at once. */
export function routingCasesFromExport(files: Record<string, unknown>): {
	cases: RoutingCase[];
	errors: string[];
} {
	const cases: RoutingCase[] = [];
	const errors: string[] = [];
	for (const [fileName, raw] of Object.entries(files)) {
		const name = fileName.replace(/\.json$/i, '');
		const rebuilt = routingCaseJsonFromExport(name, raw);
		if (!rebuilt.success) {
			errors.push(`${name}: ${rebuilt.issues.join('; ')}`);
			continue;
		}
		const parsed = parseRoutingCase(rebuilt.json);
		if (!parsed.success) {
			errors.push(`${name}: ${parsed.issues.join('; ')}`);
			continue;
		}
		cases.push(parsed.data);
	}
	cases.sort((a, b) => a.id.localeCompare(b.id));
	return { cases, errors };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

const COMPARED_FIELDS = [
	'bucket',
	'agentShaped',
	'userMessage',
	'accepts',
	'policyDependent',
	'source',
	'rationale',
	'instanceState',
	'seed',
	'attach',
	'language',
] as const satisfies ReadonlyArray<keyof RoutingCase>;

/** Folds the defaults both sides may omit, so only a real difference counts. */
function comparable(routingCase: RoutingCase): Record<string, unknown> {
	return {
		...routingCase,
		agentShaped: routingCase.agentShaped ?? false,
		policyDependent: routingCase.policyDependent ?? false,
		language: routingCase.language ?? DEFAULT_ROUTING_LANGUAGE,
		seed: comparableSeed(routingCase.seed),
	};
}

/**
 * Empty seed slots and message ids are dropped: the loader defaults every slot
 * to `[]`, and `{role, text}` shorthand mints a new message id on each parse.
 */
function comparableSeed(seed: RoutingCase['seed']): unknown {
	if (!seed) return undefined;
	const out: Record<string, unknown> = {};
	for (const [key, slot] of Object.entries(seed)) {
		if (slot === undefined || (Array.isArray(slot) && slot.length === 0)) continue;
		out[key] =
			key === 'messages' && Array.isArray(slot)
				? slot.map((message: unknown) => {
						if (!isRecord(message)) return message;
						const { id: _id, ...rest } = message;
						return rest;
					})
				: slot;
	}
	return out;
}

/** The routing fields that differ between two versions of one case. */
export function routingCaseDiff(a: RoutingCase, b: RoutingCase): string[] {
	const left = comparable(a);
	const right = comparable(b);
	return COMPARED_FIELDS.filter((field) => canonical(left[field]) !== canonical(right[field]));
}

function canonical(value: unknown): string {
	return value === undefined ? 'undefined' : JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeysDeep);
	if (isRecord(value)) {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(value).sort()) sorted[key] = sortKeysDeep(value[key]);
		return sorted;
	}
	return value;
}

// ---------------------------------------------------------------------------
// Passing ids (setKind)
// ---------------------------------------------------------------------------

/**
 * Reads the grader's list of case ids that pass on the baseline: a JSON array
 * of ids, or an object with one array under `ids`, `passingIds`, or `passing`.
 */
export function parsePassingIds(raw: unknown): Set<string> {
	const list = Array.isArray(raw)
		? raw
		: isRecord(raw)
			? (raw.ids ?? raw.passingIds ?? raw.passing)
			: undefined;
	if (!Array.isArray(list) || !list.every((id): id is string => typeof id === 'string')) {
		throw new Error(
			'passing ids must be a JSON array of case ids, or an object with that array under "ids", "passingIds", or "passing"',
		);
	}
	return new Set(list);
}
