// ---------------------------------------------------------------------------
// Loader for routing eval cases: one `route-<slug>.json` file per case.
//
// Routing cases carry no tool expectations. The grader resolves the route from
// the recorded calls after the run (see grade.ts).
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync } from 'fs';
import { basename, join, resolve } from 'path';
import { z } from 'zod';

import { discoveryTestCaseSchema } from '../data/discovery';

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

export const routingCaseSchema = z
	.object({
		id: z
			.string()
			.regex(
				/^route-[a-z0-9-]+$/,
				'id must be route- and then lowercase letters, digits or hyphens',
			),
		/** The main expected route. Reports group cases by it. */
		bucket: z.enum(ROUTING_BUCKETS),
		/** The request reads like a standing role, whatever the bucket. */
		agentShaped: z.boolean().optional(),
		userMessage: z.string().min(1),
		/** A trial passes when its route matches one of these tokens. */
		accepts: z.array(z.enum(ROUTING_ACCEPT_TOKENS)).min(1),
		/** The right route depends on product policy, not only on the prompt. */
		policyDependent: z.boolean().optional(),
		/** Where the prompt came from, for example a real conversation or a spike. */
		source: z.string().min(1),
		rationale: z.string().min(1).optional(),
		instanceState: discoveryTestCaseSchema.shape.instanceState,
		/** ISO 639-3 code of `userMessage`. Absent means English. */
		language: z
			.string()
			.regex(/^[a-z]{3}$/, 'language must be an ISO 639-3 code, e.g. "eng"')
			.optional(),
	})
	// The id does not have to name the bucket: suite ids like `route-prod-agent-*` and
	// `route-v2-agent-*` add a source prefix. Grading reads `bucket`, never the id.
	.strict();

export type RoutingCase = z.infer<typeof routingCaseSchema>;

function parseRoutingCaseFile(filePath: string): RoutingCase {
	let raw: unknown;
	try {
		raw = JSON.parse(readFileSync(filePath, 'utf-8'));
	} catch (error) {
		throw new Error(`${filePath}: ${error instanceof Error ? error.message : String(error)}`);
	}
	const parsed = routingCaseSchema.safeParse(raw);
	if (!parsed.success) {
		const issues = parsed.error.issues.map(
			(issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
		);
		throw new Error(`${filePath}: ${issues.join('; ')}`);
	}
	const slug = basename(filePath, '.json');
	if (parsed.data.id !== slug) {
		throw new Error(`${filePath}: id "${parsed.data.id}" must match the file name "${slug}"`);
	}
	return parsed.data;
}

/**
 * Loads every `route-*.json` file in `dir`, sorted by name, so notes or
 * results kept next to the cases are not read as cases. `filter` keeps the
 * files whose name contains one of its comma-separated tokens. All invalid
 * files are reported in one error, so an author can fix them in one pass.
 */
export function loadRoutingCases(dir: string, filter?: string): RoutingCase[] {
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
	const errors: string[] = [];
	for (const file of files) {
		try {
			cases.push(parseRoutingCaseFile(join(root, file)));
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}
	if (errors.length > 0) {
		throw new Error(
			`Invalid routing case(s) in ${root}:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
		);
	}
	return cases;
}
