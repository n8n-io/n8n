// Push selected on-disk eval cases (data/workflows/ + data/agents/ *.json) UP into a
// lang-tracer suite over the REST API, upserting: create missing, update changed,
// leave unchanged, skip unsupported. The inverse of `--source langtracer` (which
// pulls a suite down). Env: LANGTRACER_URL + LANGTRACER_API_KEY (repo-root .env.local).
//
//   dotenvx run -f ../../../.env.local -- pnpm eval:langtracer-push --suite baseline --changed
//   dotenvx run -f ../../../.env.local -- pnpm eval:langtracer-push --suite baseline my-new-case ...
//   ... --dry-run   # plan only, no writes

import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

import { loadAgentEvalTestCasesWithFiles } from '../data/agents';
import { loadWorkflowTestCasesWithFiles, type WorkflowTestCaseWithFile } from '../data/workflows';
import { LangTracerClient } from '../langtracer/client';
import { resolveLangTracerConfig } from '../langtracer/config';
import { comparableDiff, planPush, toUpdatePatch } from '../langtracer/push';
import { diskCaseToLangTracerCreate } from '../langtracer/to-exported';

interface CliArgs {
	suite: string;
	slugs: string[];
	filter?: string;
	exclude?: string;
	tier?: string;
	changed: boolean;
	setKind: 'regression' | 'capability_gap';
	synthetic: boolean;
	dryRun: boolean;
}

const HELP = `Push on-disk eval cases into a curated lang-tracer suite (upsert).

Usage:
  eval:langtracer-push --suite <slug|id> [selectors] [--dry-run]

Selectors (at least one required — no accidental push-all):
  <slugs...>            Exact file slugs to push (e.g. ai-quote-carousel)
  --changed             New/untracked + staged + modified data/{workflows,agents}/*.json
  --filter <csv>        Substring match on file slug
  --tier <name>         Cases whose datasets include <name>
  --exclude <csv>       Substring exclude (modifier, not a selector on its own)

Options:
  --suite <slug|id>     Target suite (required)
  --set-kind <kind>     regression (default) | capability_gap
  --contains-user-data  Mark created cases as containing user data (default: synthetic)
  --dry-run             Print the plan without writing
  -h, --help            Show this help

Env: LANGTRACER_URL, LANGTRACER_API_KEY (an lt_ bearer; one key works for MCP + REST).`;

function parseArgs(
	argv: string[],
): { helpRequested: true } | { helpRequested: false; args: CliArgs } {
	const result: CliArgs = {
		suite: '',
		slugs: [],
		changed: false,
		setKind: 'regression',
		synthetic: true,
		dryRun: false,
	};

	let i = 0;
	while (i < argv.length) {
		const arg = argv[i];
		switch (arg) {
			case '--suite':
				result.suite = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--filter':
				result.filter = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--exclude':
				result.exclude = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--tier':
				result.tier = nextArg(argv, i, arg);
				i += 2;
				break;
			case '--changed':
				result.changed = true;
				i += 1;
				break;
			case '--set-kind': {
				const value = nextArg(argv, i, arg);
				if (value !== 'regression' && value !== 'capability_gap') {
					throw new Error('--set-kind must be "regression" or "capability_gap"');
				}
				result.setKind = value;
				i += 2;
				break;
			}
			case '--contains-user-data':
				result.synthetic = false;
				i += 1;
				break;
			case '--dry-run':
				result.dryRun = true;
				i += 1;
				break;
			case '-h':
			case '--help':
				return { helpRequested: true };
			default:
				if (arg.startsWith('--')) {
					throw new Error(`Unknown flag: ${arg.split('=', 1)[0]} (use --help)`);
				}
				result.slugs.push(arg);
				i += 1;
				break;
		}
	}

	if (!result.suite) throw new Error('--suite <slug|id> is required');
	const hasSelector =
		result.slugs.length > 0 ||
		result.changed ||
		result.filter !== undefined ||
		result.tier !== undefined;
	if (!hasSelector) {
		throw new Error('select cases to push: pass <slugs...>, --changed, --filter, or --tier');
	}

	return { helpRequested: false, args: result };
}

function nextArg(argv: string[], i: number, flag: string): string {
	const value = argv[i + 1];
	if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
	return value;
}

/** New/untracked + staged + modified `data/{workflows,agents}/*.json` slugs, from git. */
function gitChangedSlugs(): string[] {
	const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
		encoding: 'utf-8',
	});
	const slugs: string[] = [];
	for (const line of out.split('\n')) {
		if (!line.trim()) continue;
		const raw = line.slice(3).trim(); // strip the 2-char status + space
		const path = raw.includes(' -> ') ? raw.split(' -> ')[1] : raw; // rename → new path
		if (
			(path.includes('evaluations/data/workflows/') || path.includes('evaluations/data/agents/')) &&
			path.endsWith('.json')
		) {
			slugs.push(basename(path, '.json'));
		}
	}
	return slugs;
}

async function main() {
	const parsed = parseArgs(process.argv.slice(2));
	if (parsed.helpRequested) {
		console.log(HELP);
		return;
	}
	const args = parsed.args;

	const client = new LangTracerClient(resolveLangTracerConfig());

	const suites = await client.listSuites();
	const suite = suites.find((s) => s.slug === args.suite || String(s.id) === args.suite);
	if (!suite) {
		const known = suites
			.map((s) => s.slug)
			.sort()
			.join(', ');
		throw new Error(`suite "${args.suite}" not found. Available: ${known || '(none)'}.`);
	}

	// Select disk cases: loader applies --filter/--exclude, --tier narrows by the
	// case's datasets (mirrors data/source.ts); then narrow to the exact slugs
	// from positional args + --changed (if either was given).
	const loaded = [
		...loadWorkflowTestCasesWithFiles(args.filter, args.exclude),
		...loadAgentEvalTestCasesWithFiles(args.filter, args.exclude),
	];
	const dupes = loaded.filter((c, i) => loaded.findIndex((o) => o.fileSlug === c.fileSlug) !== i);
	if (dupes.length > 0) {
		throw new Error(
			`duplicate case slug(s) across data/workflows and data/agents: ${dupes.map((d) => d.fileSlug).join(', ')}`,
		);
	}
	const tier = args.tier;
	const all = tier ? loaded.filter((c) => c.testCase.datasets.includes(tier)) : loaded;
	const exactSlugs = new Set([...args.slugs, ...(args.changed ? gitChangedSlugs() : [])]);
	const selected = exactSlugs.size > 0 ? all.filter((c) => exactSlugs.has(c.fileSlug)) : all;

	const missing = [...exactSlugs].filter((s) => !all.some((c) => c.fileSlug === s));
	if (missing.length > 0) {
		console.warn(`⚠ no data/workflows or data/agents case file for: ${missing.join(', ')}`);
	}
	if (selected.length === 0) {
		console.log('No cases selected — nothing to push.');
		return;
	}

	const [{ cases }, exported] = await Promise.all([
		client.getSuite(suite.id),
		client.exportSuite(suite.id),
	]);
	const idsByName: Record<string, number> = {};
	for (const c of cases) idsByName[c.name] = c.id;

	const plan = planPush(selected, exported.files, idsByName);

	console.log(
		`\nSuite "${suite.slug}" (#${String(suite.id)}) — ${args.dryRun ? 'DRY RUN' : 'push'}`,
	);
	printBucket(
		'create',
		plan.toCreate.map((c) => c.fileSlug),
	);
	printBucket(
		'update',
		plan.toUpdate.map((u) => u.item.fileSlug),
	);
	printBucket(
		'unchanged',
		plan.unchanged.map((c) => c.fileSlug),
	);
	if (plan.skipped.length > 0) {
		console.log(`  skipped:   ${String(plan.skipped.length)}`);
		for (const s of plan.skipped) console.log(`    - ${s.fileSlug}: ${s.reason}`);
	}

	if (args.dryRun) return;

	for (const item of plan.toCreate) {
		const body = diskCaseToLangTracerCreate(item.testCase, item.fileSlug, {
			suiteId: suite.id,
			setKind: args.setKind,
			synthetic: args.synthetic,
		});
		const res = await client.createCase(body);
		console.log(`  + created ${item.fileSlug} (#${String(res.case.id)})`);
	}
	for (const { id, item } of plan.toUpdate) {
		const body = diskCaseToLangTracerCreate(item.testCase, item.fileSlug, {
			suiteId: suite.id,
			setKind: args.setKind,
			synthetic: args.synthetic,
		});
		const res = await client.updateCase(id, toUpdatePatch(body));
		console.log(`  ~ updated ${item.fileSlug} (#${String(id)}, rev ${String(res.revision)})`);
	}

	await verifyWrites(client, suite.id, [...plan.toCreate, ...plan.toUpdate.map((u) => u.item)]);

	console.log(
		`\nDone: ${String(plan.toCreate.length)} created, ${String(plan.toUpdate.length)} updated, ${String(plan.unchanged.length)} unchanged, ${String(plan.skipped.length)} skipped.`,
	);
}

/**
 * Re-read the suite and confirm the server stored what we sent.
 *
 * A lang-tracer deployment predating a field's support ignores that key and still
 * answers 200 — `seed` before #113, `attach` before #119. Without this the push
 * reports success while the suite holds a quietly different case: a seeded case
 * that will run unseeded, or a hand-off that became a find-it test. Both are
 * deploy-ordering hazards no local check can catch, so ask the server.
 */
async function verifyWrites(
	client: LangTracerClient,
	suiteId: number,
	written: WorkflowTestCaseWithFile[],
): Promise<void> {
	if (written.length === 0) return;

	const after = await client.exportSuite(suiteId);
	const dropped = written
		.map((item) => ({
			fileSlug: item.fileSlug,
			keys: comparableDiff(after.files[`${item.fileSlug}.json`], item.testCase),
		}))
		.filter((result) => result.keys.length > 0);

	if (dropped.length === 0) {
		console.log(`  verified ${String(written.length)} case(s) round-trip intact`);
		return;
	}

	for (const result of dropped) {
		console.error(`  ! ${result.fileSlug}: server did not store ${result.keys.join(', ')}`);
	}
	throw new Error(
		`${String(dropped.length)} case(s) did not round-trip: the fields above were sent but are absent from the suite export. ` +
			'A lang-tracer deployment can silently ignore a key it predates (`seed` needs #113, `attach` needs #119) — ' +
			'upgrade it, then re-push. The cases in the suite are NOT what you authored until you do.',
	);
}

function printBucket(label: string, slugs: string[]): void {
	const pad = label.padEnd(9);
	console.log(`  ${pad} ${String(slugs.length)}${slugs.length ? `  (${slugs.join(', ')})` : ''}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
