// Push selected on-disk eval cases (data/workflows/*.json) UP into a curated
// lang-tracer suite over the REST API, upserting: create missing, update changed,
// leave unchanged, skip unsupported. The inverse of `--source langtracer` (which
// pulls a suite down). Env: LANGTRACER_URL + LANGTRACER_API_KEY (see .env.eval).
//
//   dotenvx run -f .env.eval -- pnpm eval:langtracer-push --suite workflow-building --changed
//   dotenvx run -f .env.eval -- pnpm eval:langtracer-push --suite workflow-building ai-quote-carousel ...
//   ... --dry-run   # plan only, no writes

import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import { LangTracerClient, type LangTracerUpdateCaseBody } from '../langtracer/client';
import { resolveLangTracerConfig } from '../langtracer/config';
import { planPush } from '../langtracer/push';
import {
	diskCaseToLangTracerCreate,
	type LangTracerCreateCaseBody,
} from '../langtracer/to-exported';

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
  --changed             New/untracked + staged + modified data/workflows/*.json
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

/** New/untracked + staged + modified `data/workflows/*.json` slugs, from git. */
function gitChangedSlugs(): string[] {
	const out = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
		encoding: 'utf-8',
	});
	const slugs: string[] = [];
	for (const line of out.split('\n')) {
		if (!line.trim()) continue;
		const raw = line.slice(3).trim(); // strip the 2-char status + space
		const path = raw.includes(' -> ') ? raw.split(' -> ')[1] : raw; // rename → new path
		if (path.includes('evaluations/data/workflows/') && path.endsWith('.json')) {
			slugs.push(basename(path, '.json'));
		}
	}
	return slugs;
}

/** Drop the create-only fields `PATCH /cases/:id` rejects, leaving the patchable set. */
function toUpdatePatch({
	suiteId,
	synthetic,
	scenarios,
	...patch
}: LangTracerCreateCaseBody): LangTracerUpdateCaseBody {
	return patch;
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

	// Select disk cases: loader applies --filter/--exclude/--tier; then narrow to the
	// exact slugs from positional args + --changed (if either was given).
	const all = loadWorkflowTestCasesWithFiles(args.filter, args.exclude, args.tier);
	const exactSlugs = new Set([...args.slugs, ...(args.changed ? gitChangedSlugs() : [])]);
	const selected = exactSlugs.size > 0 ? all.filter((c) => exactSlugs.has(c.fileSlug)) : all;

	const missing = [...exactSlugs].filter((s) => !all.some((c) => c.fileSlug === s));
	if (missing.length > 0) {
		console.warn(`⚠ no data/workflows case file for: ${missing.join(', ')}`);
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

	console.log(
		`\nDone: ${String(plan.toCreate.length)} created, ${String(plan.toUpdate.length)} updated, ${String(plan.unchanged.length)} unchanged, ${String(plan.skipped.length)} skipped.`,
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
