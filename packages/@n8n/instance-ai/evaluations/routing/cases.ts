// ---------------------------------------------------------------------------
// Loader for routing eval cases: one `route-<slug>.json` file per case, in the
// main eval case format that LangTracer exports. The slug is the case id.
//
// The routing labels are tags: `routing`, one `bucket:<route>`, and one
// `accepts:<token>` for each accepted route. The grader resolves the route from
// the recorded calls after the run (see grade.ts).
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync } from 'fs';
import { basename, join, resolve } from 'path';
import { z } from 'zod';

import { EvalTestCaseSchema } from '../harness/schema';
import { normalizeExportedCase } from '../langtracer/normalize';

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
export type AcceptToken = (typeof ROUTING_ACCEPT_TOKENS)[number];

const routingTagsSchema = z.object({
	/** The main expected route. Reports group cases by it. */
	bucket: z
		.array(z.enum(ROUTING_BUCKETS))
		.length(1, 'needs exactly one bucket:<route> tag')
		.transform((buckets) => buckets[0]),
	/** A trial passes when its route matches one of these tokens. */
	accepts: z.array(z.enum(ROUTING_ACCEPT_TOKENS)).min(1, 'needs an accepts:<route> tag'),
});

export type RoutingCase = z.infer<typeof routingTagsSchema> & { id: string; userMessage: string };

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
	// ponytail: the runner cannot create earlier messages, an open workflow or Agent, or accounts yet.
	if (seed || credentials?.length || credentialFixture) {
		return { kind: 'needs-setup', id };
	}
	if (conversation.length !== 1 || conversation[0].role !== 'user') {
		throw new Error(`${filePath}: needs exactly one user message`);
	}

	const labels = routingTagsSchema.safeParse({
		bucket: tagValues(tags, 'bucket:'),
		accepts: tagValues(tags, 'accepts:'),
	});
	if (!labels.success) throw new Error(`${filePath}: ${formatIssues(labels.error)}`);
	return { kind: 'case', routingCase: { id, userMessage: conversation[0].text, ...labels.data } };
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
	const tokens = (filter ?? '')
		.split(',')
		.map((token) => token.trim().toLowerCase())
		.filter((token) => token.length > 0);
	const files = readdirSync(root)
		.filter((file) => file.startsWith('route-') && file.endsWith('.json'))
		.filter((file) => tokens.length === 0 || tokens.some((token) => file.includes(token)))
		.sort();

	const cases: RoutingCase[] = [];
	const needsSetup: string[] = [];
	const errors: string[] = [];
	for (const file of files) {
		try {
			const parsed = parseRoutingCaseFile(join(root, file));
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
