// ---------------------------------------------------------------------------
// Loader for routing eval cases: one `route-<slug>.json` file per case, in the
// main eval case format that LangTracer exports. The slug is the case id.
//
// The routing labels are tags: `routing`, one `bucket:<route>`, and one
// `accepts:<token>` for each other accepted route. A judge picks the route of
// each trial (see grade.ts).
//
// An optional second user turn holds only [stage directions]: the facts that
// the user proxy uses to answer a question. The proxy answers up to two
// accepted questions. The route after the last answer must be an `after:<route>`
// tag, or else an accepted route without a steer. A further question passes
// when it steers to an `after` artifact.
//
// An inline `seed` and `credentials` set up the stub instance and the thread
// before the turn: earlier messages, an open workflow or Agent, failed runs,
// data tables, and accounts (see ../discovery/seeded-turn.ts).
// ---------------------------------------------------------------------------

import { readFileSync } from 'fs';
import { basename, resolve } from 'path';
import { z } from 'zod';

import type { DiscoveryScenario } from '../discovery/types';
import { EvalTestCaseSchema } from '../harness/schema';
import { normalizeExportedCase } from '../langtracer/normalize';
import { getJsonFiles } from '../utils/get-json-files';

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
export type RoutingBucket = (typeof ROUTING_BUCKETS)[number];

export const ROUTING_ACCEPT_TOKENS = [
	...ROUTING_BUCKETS,
	'clarify:agent',
	'clarify:open',
	'answer:agent',
	'answer:open',
] as const;
export type AcceptToken = (typeof ROUTING_ACCEPT_TOKENS)[number];

const routingTagsSchema = z
	.object({
		/** The main expected route. Reports group cases by it. */
		bucket: z
			.array(z.enum(ROUTING_BUCKETS))
			.length(1, 'needs exactly one bucket:<route> tag')
			.transform((buckets) => buckets[0]),
		/** A trial passes when its route matches one of these tokens. */
		accepts: z.array(z.enum(ROUTING_ACCEPT_TOKENS)),
		/** The routes that pass after the user proxy answers a question. */
		after: z.array(z.enum(ROUTING_BUCKETS).exclude(['clarify'])),
	})
	// The bucket always passes, so case files need not repeat it. A clarify case
	// keeps only its own tokens: most accept only `clarify:open`, and plain
	// `clarify` would also pass a question that only asks about a workflow.
	.transform(({ bucket, accepts: tokens, after }) => {
		const accepts = bucket === 'clarify' || tokens.includes(bucket) ? tokens : [bucket, ...tokens];
		return {
			bucket,
			accepts,
			after: after.length > 0 ? after : accepts.filter((token) => token !== 'clarify' && !token.includes(':')),
		};
	})
	.refine(({ accepts }) => accepts.length > 0, {
		message: 'a bucket:clarify case needs an accepts:<token> tag',
		path: ['accepts'],
	});

export type RoutingCase = z.infer<typeof routingTagsSchema> &
	Pick<DiscoveryScenario, 'seed' | 'attach' | 'credentials'> & {
		id: string;
		userMessage: string;
		/** The [stage directions] for the user proxy. Never sent to the Assistant. */
		direction?: string;
	};

type ParsedFile = { kind: 'case'; routingCase: RoutingCase } | { kind: 'needs-setup'; id: string };

function tagValues(tags: string[], prefix: string): string[] {
	return tags.filter((tag) => tag.startsWith(prefix)).map((tag) => tag.slice(prefix.length));
}

function formatIssues(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
		.join('; ');
}

function parseRoutingCaseFile(filePath: string): ParsedFile {
	const id = basename(filePath, '.json');
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(filePath, 'utf-8'));
	} catch (error) {
		throw new Error(`${filePath}: ${error instanceof Error ? error.message : String(error)}`);
	}
	// Strips export-only keys (id, name, suiteId, ...), as the LangTracer pull does.
	const parsed = EvalTestCaseSchema.safeParse(normalizeExportedCase(raw));
	if (!parsed.success) throw new Error(`${filePath}: ${formatIssues(parsed.error)}`);

	const { tags, conversation = [], seed, credentials, credentialFixture } = parsed.data;
	if (!tags.includes('routing')) throw new Error(`${filePath}: has no "routing" tag`);
	// ponytail: the stub instance has no thread replay, browser sign-in, folders or projects.
	if (
		seed?.mode === 'replay' ||
		credentialFixture ||
		(seed && (seed.folders.length > 0 || seed.projects.length > 0))
	) {
		return { kind: 'needs-setup', id };
	}
	const [opener, directionTurn, ...rest] = conversation;
	if (
		opener?.role !== 'user' ||
		rest.length > 0 ||
		(directionTurn &&
			(directionTurn.role !== 'user' || directionTurn.text.replace(/\[[^\]]*\]/g, '').trim()))
	) {
		throw new Error(
			`${filePath}: needs one user message, then at most one user turn with only [stage directions]`,
		);
	}

	const labels = routingTagsSchema.safeParse({
		bucket: tagValues(tags, 'bucket:'),
		accepts: tagValues(tags, 'accepts:'),
		after: tagValues(tags, 'after:'),
	});
	if (!labels.success) throw new Error(`${filePath}: ${formatIssues(labels.error)}`);
	const direction = directionTurn?.text;
	if (direction && labels.data.after.length === 0) {
		throw new Error(`${filePath}: a case with stage directions needs an after:<route> tag`);
	}
	const { text: userMessage, attach } = opener;
	return {
		kind: 'case',
		routingCase: { id, userMessage, ...labels.data, direction, seed, attach, credentials },
	};
}

/**
 * Loads every `route-*.json` file in `dir`, sorted by name, so notes or
 * results kept next to the cases are not read as cases. `filter` keeps the
 * files whose name contains one of its comma-separated tokens. All invalid
 * files are reported in one error, so an author can fix them in one pass.
 * Cases that need setup are returned by id in `needsSetup` and do not run.
 */
export function loadRoutingCases(
	dir: string,
	filter?: string,
): { cases: RoutingCase[]; needsSetup: string[] } {
	const root = resolve(dir);
	const files = getJsonFiles(root, filter)
		.filter((file) => basename(file).startsWith('route-'))
		.sort();

	const cases: RoutingCase[] = [];
	const needsSetup: string[] = [];
	const errors: string[] = [];
	for (const file of files) {
		try {
			const parsed = parseRoutingCaseFile(file);
			if (parsed.kind === 'case') cases.push(parsed.routingCase);
			else needsSetup.push(parsed.id);
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}
	if (errors.length > 0) {
		throw new Error(
			`Invalid routing case(s) in ${root}:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
		);
	}
	return { cases, needsSetup };
}
