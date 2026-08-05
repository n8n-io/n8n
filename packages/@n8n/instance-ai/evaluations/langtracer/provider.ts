// lang-tracer test-case provider; `casesFromExportedFiles` is split from the network
// call so the normalize + validate contract is unit-testable without a server.

import { isRecord } from '@n8n/utils/is-record';

import { LangTracerClient, type ExportedSuite } from './client';
import { resolveLangTracerConfig } from './config';
import { normalizeExportedCase } from './normalize';
import { type WorkflowTestCaseWithFile } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import { EvalTestCaseSchema } from '../harness/schema';
import { parseSubstringList } from '../utils/get-json-files';

export interface LangTracerLoadOptions {
	/** Suite slug or numeric id. */
	suite: string;
	filter?: string;
	exclude?: string;
	tier?: string;
	logger: EvalLogger;
}

/**
 * Seeding keys this schema no longer accepts, and what replaced them. Checked on
 * the RAW export body because `normalizeExportedCase` whitelists to the schema's
 * keys: a removed key is STRIPPED, so a hosted case still carrying one would run
 * UNSEEDED rather than fail — silently grading a seeded case as if it were a
 * build-from-scratch. Every removal needs an entry here (#35074 added the first).
 */
const REMOVED_SEED_KEYS: Record<string, string> = {
	seedFile: 'carry the seed in the case body as `seed: { mode: "inline", … }`',
	conversationSeed: 'now `seed: { mode: "inline", messages, workflows, dataTables }`',
	priorConversation: 'now `seed: { mode: "inline", messages: [{ role, text }, …] }`',
	seedThread: 'now `seed: { mode: "replay", threadId, … }`',
};

/** Normalize + validate an `export_suite` payload into n8n test cases (same
 *  filter/exclude/tier selection as the disk loader); failures are aggregated so
 *  a drift surfaces every bad case at once. */
export function casesFromExportedFiles(
	files: ExportedSuite['files'],
	opts: { suite: string; filter?: string; exclude?: string; tier?: string },
): WorkflowTestCaseWithFile[] {
	const cases: WorkflowTestCaseWithFile[] = [];
	const errors: string[] = [];

	for (const [filename, raw] of Object.entries(files)) {
		const fileSlug = filename.replace(/\.json$/i, '');
		const removed = isRecord(raw)
			? Object.entries(REMOVED_SEED_KEYS).filter(([key]) => raw[key] !== undefined)
			: [];
		if (removed.length > 0) {
			errors.push(
				`${filename}:\n${removed
					.map(([key, hint]) => `  - ${key}: no longer supported — ${hint}`)
					.join('\n')}`,
			);
			continue;
		}
		const parsed = EvalTestCaseSchema.safeParse(normalizeExportedCase(raw));
		if (!parsed.success) {
			const issues = parsed.error.issues
				.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
				.join('\n');
			errors.push(`${filename}:\n${issues}`);
			continue;
		}
		cases.push({ testCase: parsed.data, fileSlug });
	}

	if (errors.length > 0) {
		throw new Error(
			`Invalid test case(s) exported from lang-tracer suite "${opts.suite}":\n${errors.join('\n')}`,
		);
	}

	return applyCaseSelection(cases, opts);
}

/** Mirror the disk loader's `--filter` / `--exclude` / `--tier` semantics. */
function applyCaseSelection(
	cases: WorkflowTestCaseWithFile[],
	opts: { filter?: string; exclude?: string; tier?: string },
): WorkflowTestCaseWithFile[] {
	let selected = cases;

	const includeTokens = parseSubstringList(opts.filter);
	if (includeTokens.length > 0) {
		selected = selected.filter(({ fileSlug }) =>
			includeTokens.some((t) => fileSlug.toLowerCase().includes(t)),
		);
	}

	const excludeTokens = parseSubstringList(opts.exclude);
	if (excludeTokens.length > 0) {
		selected = selected.filter(
			({ fileSlug }) => !excludeTokens.some((t) => fileSlug.toLowerCase().includes(t)),
		);
	}

	const tier = opts.tier;
	if (!tier) return selected;

	const matched = selected.filter(({ testCase }) => testCase.datasets.includes(tier));
	if (matched.length === 0) {
		const known = [...new Set(selected.flatMap(({ testCase }) => testCase.datasets))].sort();
		throw new Error(
			`No test cases match --tier "${tier}". Known tiers: ${known.join(', ') || '(none)'}.`,
		);
	}
	return matched;
}

/** Pull test cases from a lang-tracer suite over its REST API. */
export async function loadTestCasesFromLangTracer(
	opts: LangTracerLoadOptions,
): Promise<WorkflowTestCaseWithFile[]> {
	const client = new LangTracerClient(resolveLangTracerConfig());
	const suites = await client.listSuites();
	const match = suites.find((s) => s.slug === opts.suite || String(s.id) === opts.suite);
	if (!match) {
		const known = suites
			.map((s) => s.slug)
			.sort()
			.join(', ');
		throw new Error(
			`lang-tracer suite "${opts.suite}" not found. Available suites: ${known || '(none)'}.`,
		);
	}

	opts.logger.info(`lang-tracer: exporting suite "${match.slug}" (#${String(match.id)})`);
	const exported = await client.exportSuite(match.id);
	opts.logger.info(
		`lang-tracer: received ${String(Object.keys(exported.files).length)} case file(s)`,
	);

	const cases = casesFromExportedFiles(exported.files, { ...opts, suite: match.slug });
	opts.logger.info(`lang-tracer: ${String(cases.length)} case(s) after selection`);
	return cases;
}
