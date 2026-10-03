// ---------------------------------------------------------------------------
// Loader for routing eval cases (one JSON file per case, `<id>.json`).
//
// Routing cases carry no tool expectations: the grader resolves the route
// from the recorded calls afterwards. The loader validates the authoring
// format and maps each case to the scenario shape the discovery runner needs.
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync } from 'fs';
import { basename, join, resolve } from 'path';
import { z } from 'zod';

import { discoveryTestCaseSchema } from '../data/discovery';
import type { DiscoveryScenario, RoutingAttachment, RoutingSeed } from '../discovery/types';
import { CaseSeedSchema } from '../harness/schema';

export const ROUTING_BUCKETS = [
	'agent',
	'workflow',
	'one-off',
	'debug',
	'answer',
	'clarify',
	'multi',
	'decline',
] as const;

export const ROUTING_ACCEPT_TOKENS = [
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

export const DEFAULT_ROUTING_LANGUAGE = 'eng';

/** The seed id rule LangTracer and the n8n restore path apply to every artifact. */
const MIN_SEED_ID_LENGTH = 8;

/**
 * The inline seed shape of the main eval harness (and LangTracer's
 * `create_test_case`). The in-process stub instance can serve workflows,
 * Agents, data tables, prior messages, and prior runs. It has no folders or
 * projects, so a seed that declares them is refused instead of run without them.
 */
const routingSeedSchema = CaseSeedSchema.superRefine((seed, ctx) => {
	if (seed.mode !== 'inline') {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['mode'],
			message: 'routing cases support only `mode: "inline"` seeds',
		});
		return;
	}
	if (seed.folders.length > 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['folders'],
			message: 'the in-process stub instance has no folders, so routing cases cannot seed them',
		});
	}
	if (seed.projects.length > 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['projects'],
			message: 'the in-process stub instance has one project, so routing cases cannot seed more',
		});
	}
	for (const [index, workflow] of seed.workflows.entries()) {
		if (workflow.id.length < MIN_SEED_ID_LENGTH) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['workflows', index, 'id'],
				message: `seed workflow ids need at least ${String(MIN_SEED_ID_LENGTH)} characters`,
			});
		}
	}
	const empty =
		seed.messages.length === 0 &&
		seed.workflows.length === 0 &&
		seed.agents.length === 0 &&
		seed.dataTables.length === 0;
	if (empty) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'an inline seed must carry messages, workflows, agents, or dataTables',
		});
	}
});

const routingAttachmentSchema = z.union([
	z.object({ workflow: z.string().min(1) }).strict(),
	z.object({ agent: z.string().min(1) }).strict(),
]);

/** Authored case ids, which name the case file. */
const AUTHORED_ID_PATTERN = /^route-[a-z0-9-]+$/;

/**
 * Ids of imported cases. A LangTracer export body has no id, so the id is its
 * file name, which only has to be safe as a file name (the dispatcher writes
 * `lt-<case>-<run>.json`, for example).
 */
const IMPORTED_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function routingCaseObject(id: z.ZodString) {
	return z
		.object({
			id,
			bucket: z.enum(ROUTING_BUCKETS),
			agentShaped: z.boolean().optional(),
			userMessage: z.string().min(1),
			accepts: z.array(z.enum(ROUTING_ACCEPT_TOKENS)).min(1),
			policyDependent: z.boolean().optional(),
			source: z.string().min(1),
			rationale: z.string().min(1).optional(),
			instanceState: discoveryTestCaseSchema.shape.instanceState,
			seed: routingSeedSchema.optional(),
			/** The workflow or Agent the user had open when they sent the message. */
			attach: routingAttachmentSchema.optional(),
			/** ISO 639-3 code of `userMessage`. Absent means English. */
			language: z
				.string()
				.regex(/^[a-z]{3}$/, 'language must be an ISO 639-3 code, e.g. "eng"')
				.optional(),
		})
		.strict();
}

/** Every attachment and prior run must name a seeded resource. */
function checkSeedReferences(
	routingCase: z.infer<ReturnType<typeof routingCaseObject>>,
	ctx: z.RefinementCtx,
): void {
	const seed = inlineSeedOf(routingCase.seed);
	const workflowIds = new Set(seed?.workflows.map((workflow) => workflow.id));
	const agentIds = new Set(seed?.agents.map((agent) => agent.id));
	const { attach } = routingCase;
	if (attach && 'workflow' in attach && !workflowIds.has(attach.workflow)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['attach', 'workflow'],
			message: 'must be the id of a workflow in `seed.workflows`',
		});
	}
	if (attach && 'agent' in attach && !agentIds.has(attach.agent)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['attach', 'agent'],
			message: 'must be the id of an Agent in `seed.agents`',
		});
	}
	for (const [index, priorRun] of (seed?.priorRuns ?? []).entries()) {
		if (!workflowIds.has(priorRun.workflow)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['seed', 'priorRuns', index, 'workflow'],
				message: 'must be the id of a workflow in `seed.workflows`',
			});
		}
	}
}

export const routingCaseSchema = routingCaseObject(
	z.string().regex(AUTHORED_ID_PATTERN, 'id must look like route-<bucket>-<slug>'),
).superRefine(checkSeedReferences);

const importedRoutingCaseSchema = routingCaseObject(
	z.string().regex(IMPORTED_ID_PATTERN, 'id must be safe as a file name'),
).superRefine(checkSeedReferences);

export type RoutingCase = z.infer<typeof routingCaseSchema>;

export interface LoadedRoutingCase {
	routingCase: RoutingCase;
	scenario: DiscoveryScenario;
	/** The case file name without `.json`, when the case came from a file. */
	fileName?: string;
}

/** Narrows a parsed seed to its inline arm; the schema refuses every other arm. */
function inlineSeedOf(seed: RoutingCase['seed']): RoutingSeed | undefined {
	return seed?.mode === 'inline' ? seed : undefined;
}

export function toDiscoveryScenario(routingCase: RoutingCase): DiscoveryScenario {
	const seed = inlineSeedOf(routingCase.seed);
	const attach: RoutingAttachment | undefined = routingCase.attach;
	return {
		id: routingCase.id,
		userMessage: routingCase.userMessage,
		...(routingCase.instanceState ? { instanceState: routingCase.instanceState } : {}),
		...(routingCase.rationale ? { rationale: routingCase.rationale } : {}),
		...(seed ? { seed } : {}),
		...(attach ? { attach } : {}),
	};
}

/**
 * Validates one parsed case body. Returns the issues as `path: message` strings.
 * `imported` accepts any file-name-safe id instead of `route-<bucket>-<slug>`.
 */
export function parseRoutingCase(
	raw: unknown,
	options: { imported?: boolean } = {},
): { success: true; data: RoutingCase } | { success: false; issues: string[] } {
	const schema = options.imported ? importedRoutingCaseSchema : routingCaseSchema;
	const parsed = schema.safeParse(raw);
	if (parsed.success) return { success: true, data: parsed.data };
	return {
		success: false,
		issues: parsed.error.issues.map(
			(issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
		),
	};
}

function parseRoutingCaseFile(filePath: string): RoutingCase {
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(filePath, 'utf-8'));
	} catch (error) {
		throw new Error(`${filePath}: ${error instanceof Error ? error.message : String(error)}`);
	}
	const parsed = parseRoutingCase(raw);
	if (!parsed.success) throw new Error(`${filePath}: ${parsed.issues.join('; ')}`);
	const slug = basename(filePath, '.json');
	if (parsed.data.id !== slug) {
		throw new Error(`${filePath}: id "${parsed.data.id}" must match the file name "${slug}"`);
	}
	return parsed.data;
}

function csvTokens(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((token) => token.trim().toLowerCase())
		.filter((token) => token.length > 0);
}

export interface RoutingCaseSelection {
	/**
	 * Keep ids that contain any comma-separated token. A single token that is
	 * exactly the id or file name of a case selects only that case.
	 */
	filter?: string;
	/** Drop ids that contain any comma-separated token. */
	exclude?: string;
	/** Drop ids that start with any comma-separated prefix. */
	excludePrefix?: string;
}

/** Applies `filter`, `exclude`, and `excludePrefix` to one case id or file name. */
export function isRoutingCaseSelected(name: string, selection: RoutingCaseSelection = {}): boolean {
	const lower = name.toLowerCase();
	const include = csvTokens(selection.filter);
	if (include.length > 0 && !include.some((token) => lower.includes(token))) return false;
	if (csvTokens(selection.exclude).some((token) => lower.includes(token))) return false;
	if (csvTokens(selection.excludePrefix).some((prefix) => lower.startsWith(prefix))) return false;
	return true;
}

/**
 * Keeps only the cases whose id or file name is exactly `filter`, when there
 * are any. So `--filter route-agent-x` does not also run `route-agent-x-2`.
 */
export function narrowToExactMatch(
	cases: LoadedRoutingCase[],
	filter: string | undefined,
): LoadedRoutingCase[] {
	const tokens = csvTokens(filter);
	if (tokens.length !== 1) return cases;
	const [token] = tokens;
	const exact = cases.filter(
		({ routingCase, fileName }) =>
			routingCase.id.toLowerCase() === token || fileName?.toLowerCase() === token,
	);
	return exact.length > 0 ? exact : cases;
}

/**
 * Loads every `route-*.json` case in `dir` (sorted by file name), so results
 * or notes kept next to the cases are not read as cases. A string `selection`
 * is a `filter`. All invalid files are reported in one error, so an author can
 * fix them in one pass.
 */
export function loadRoutingCases(
	dir: string,
	selection?: string | RoutingCaseSelection,
): LoadedRoutingCase[] {
	const select: RoutingCaseSelection =
		typeof selection === 'string' ? { filter: selection } : (selection ?? {});
	const root = resolve(dir);
	const files = readdirSync(root)
		.filter(
			(f) => f.startsWith('route-') && f.endsWith('.json') && isRoutingCaseSelected(f, select),
		)
		.sort();

	const loaded: LoadedRoutingCase[] = [];
	const errors: string[] = [];
	for (const file of files) {
		try {
			const routingCase = parseRoutingCaseFile(join(root, file));
			loaded.push({
				routingCase,
				scenario: toDiscoveryScenario(routingCase),
				fileName: basename(file, '.json'),
			});
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`Invalid routing case(s) in ${root}:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
		);
	}
	return narrowToExactMatch(loaded, select.filter);
}
