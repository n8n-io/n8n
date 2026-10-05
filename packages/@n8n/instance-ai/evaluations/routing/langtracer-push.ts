#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Push routing cases (one `<id>.json` per case) into a LangTracer suite.
// Create-or-update by case name, so a re-push converges and leaves unchanged
// cases alone. The mapping is in langtracer-cases.ts.
//
//   pnpm tsx evaluations/routing/langtracer-push.ts --suite intent-routing \
//     --cases-dir <dir> --passing-ids <file> --dry-run
//
// Credentials: LANGTRACER_URL and LANGTRACER_API_KEY, else the lang-tracer MCP
// entry in ~/.claude.json (see langtracer-config.ts).
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

import {
	exportedExpectations,
	parsePassingIds,
	routingCaseDiff,
	routingCasesFromExport,
	routingTags,
	toLangTracerCreateBody,
	toLangTracerUpdateBody,
	unsupportedRoutingPushReason,
	type RoutingLangTracerCreateBody,
	type RoutingSetKind,
} from './langtracer-cases';
import { resolveRoutingLangTracerConfig } from './langtracer-config';
import { loadRoutingCases, type RoutingCase, type RoutingCaseSelection } from './loader';
import { findLangTracerSuite, LangTracerClient } from '../langtracer/client';
import type { LangTracerConfig } from '../langtracer/config';

const HELP = `Push routing cases into a LangTracer suite (create or update by case name).

Usage:
  tsx evaluations/routing/langtracer-push.ts --suite <slug|id> --cases-dir <dir> --passing-ids <file> [options]

Options:
  --suite <slug|id>         Target suite (required; it must exist)
  --cases-dir <dir>         Directory with one routing case per <id>.json (required)
  --passing-ids <file>      JSON list of ids that pass on the baseline: they get
                            setKind "regression", every other case "capability_gap" (required)
  --filter <csv>            Keep ids that contain any token
  --exclude <csv>           Drop ids that contain any token
  --exclude-prefix <csv>    Drop ids that start with any prefix (e.g. route-v2-)
  --dry-run                 Print the plan and the payloads without writing
  -h, --help                Show this help`;

export interface RoutingPushArgs {
	suite: string;
	passingIdsFile: string;
	casesDir: string;
	selection: RoutingCaseSelection;
	dryRun: boolean;
}

export function parseRoutingPushArgs(argv: string[]): RoutingPushArgs | 'help' {
	const args: RoutingPushArgs = {
		suite: '',
		passingIdsFile: '',
		casesDir: '',
		selection: {},
		dryRun: false,
	};
	const value = (i: number, flag: string): string => {
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) throw new Error(`Missing value for ${flag}`);
		return next;
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--suite':
				args.suite = value(i++, arg);
				break;
			case '--passing-ids':
				args.passingIdsFile = value(i++, arg);
				break;
			case '--cases-dir':
				args.casesDir = value(i++, arg);
				break;
			case '--filter':
				args.selection.filter = value(i++, arg);
				break;
			case '--exclude':
				args.selection.exclude = value(i++, arg);
				break;
			case '--exclude-prefix':
				args.selection.excludePrefix = value(i++, arg);
				break;
			case '--dry-run':
				args.dryRun = true;
				break;
			case '-h':
			case '--help':
				return 'help';
			default:
				throw new Error(`Unknown argument: ${arg} (use --help)`);
		}
	}
	if (!args.suite) throw new Error('--suite <slug|id> is required');
	if (!args.casesDir) throw new Error('--cases-dir <dir> is required');
	if (!args.passingIdsFile) throw new Error('--passing-ids <file> is required');
	return args;
}

// The client's suite read keeps only id + name. The push also needs the stored
// setKind, flags, and prompt fields to tell an unchanged case from a changed one.
const suiteRowSchema = z.object({
	id: z.number(),
	name: z.string(),
	setKind: z.string(),
	containsUserData: z.boolean().optional(),
	userPrompt: z.string().nullable().optional(),
	expectedBehavior: z.string().nullable().optional(),
	tags: z.array(z.string()).nullable().optional(),
	processExpectations: z.array(z.string()).nullable().optional(),
	outcomeExpectations: z.array(z.string()).nullable().optional(),
});
type SuiteRow = z.infer<typeof suiteRowSchema>;

async function fetchSuiteRows(config: LangTracerConfig, suiteId: number): Promise<SuiteRow[]> {
	const path = `/api/v1/suites/${String(suiteId)}`;
	const response = await fetch(new URL(path, config.baseUrl), {
		headers: { Authorization: `Bearer ${config.apiKey}` },
	});
	if (!response.ok) throw new Error(`lang-tracer GET ${path} returned ${String(response.status)}`);
	const body: unknown = await response.json();
	const data = isRecord(body) && 'data' in body ? body.data : body;
	return z.object({ cases: z.array(suiteRowSchema) }).parse(data).cases;
}

/** Which stored row fields differ from the body the push would send. */
function rowDiff(row: SuiteRow, body: RoutingLangTracerCreateBody): string[] {
	const diff: string[] = [];
	if (row.setKind !== body.setKind) diff.push('setKind');
	if (row.containsUserData !== !body.synthetic) diff.push('containsUserData');
	if ((row.userPrompt ?? '') !== body.userPrompt) diff.push('userPrompt');
	if ((row.expectedBehavior ?? '') !== body.expectedBehavior) diff.push('expectedBehavior');
	if ((row.tags ?? []).join(' ') !== body.tags.join(' ')) diff.push('tags');
	diff.push(
		...expectationDiff(
			{ process: row.processExpectations ?? [], outcome: row.outcomeExpectations ?? [] },
			body,
		),
	);
	return diff;
}

/** A routing case stores exactly the body's process expectation and no outcome expectation. */
function expectationDiff(
	stored: { process: string[]; outcome: string[] },
	body: RoutingLangTracerCreateBody,
): string[] {
	const diff: string[] = [];
	if (stored.process.join('\n') !== body.processExpectations.join('\n')) {
		diff.push('processExpectations');
	}
	if (stored.outcome.length > 0) diff.push('outcomeExpectations');
	return diff;
}

interface PlannedCase {
	routingCase: RoutingCase;
	setKind: RoutingSetKind;
	body: RoutingLangTracerCreateBody;
}

async function main(): Promise<void> {
	const parsed = parseRoutingPushArgs(process.argv.slice(2));
	if (parsed === 'help') {
		console.log(HELP);
		return;
	}
	const args = parsed;

	const passing = parsePassingIds(
		jsonParse<unknown>(readFileSync(resolve(args.passingIdsFile), 'utf-8')),
	);
	const loaded = loadRoutingCases(args.casesDir, args.selection).map((c) => c.routingCase);
	const unknownPassing = [...passing].filter((id) => !loaded.some((c) => c.id === id));

	const config = resolveRoutingLangTracerConfig();
	const client = new LangTracerClient(config);
	const suite = findLangTracerSuite(await client.listSuites(), args.suite);
	if (!suite) throw new Error(`LangTracer suite "${args.suite}" not found; create it first.`);

	const skipped: Array<{ id: string; reason: string }> = [];
	const planned: PlannedCase[] = [];
	for (const routingCase of loaded) {
		const reason = unsupportedRoutingPushReason(routingCase);
		if (reason) {
			skipped.push({ id: routingCase.id, reason });
			continue;
		}
		const setKind: RoutingSetKind = passing.has(routingCase.id) ? 'regression' : 'capability_gap';
		planned.push({
			routingCase,
			setKind,
			body: toLangTracerCreateBody(routingCase, { suiteId: suite.id, setKind }),
		});
	}

	const [rows, exported] = await Promise.all([
		fetchSuiteRows(config, suite.id),
		client.exportSuite(suite.id),
	]);
	const rowsByName = new Map(rows.map((row) => [row.name, row]));
	const stored = new Map(
		routingCasesFromExport(exported.files).cases.map((routingCase) => [
			routingCase.id,
			routingCase,
		]),
	);

	const toCreate: PlannedCase[] = [];
	const toUpdate: Array<PlannedCase & { id: number; changed: string[] }> = [];
	const unchanged: PlannedCase[] = [];
	for (const item of planned) {
		const row = rowsByName.get(item.routingCase.id);
		if (!row) {
			toCreate.push(item);
			continue;
		}
		const storedCase = stored.get(item.routingCase.id);
		const changed = [
			...rowDiff(row, item.body),
			...(storedCase ? routingCaseDiff(storedCase, item.routingCase) : ['export']),
		];
		if (changed.length > 0) toUpdate.push({ ...item, id: row.id, changed });
		else unchanged.push(item);
	}

	const count = (items: PlannedCase[], pred: (item: PlannedCase) => boolean) =>
		items.filter(pred).length;
	console.log(
		`Suite "${suite.slug}" (#${String(suite.id)}), ${args.dryRun ? 'DRY RUN' : 'push'}: ${String(planned.length)} case(s) from ${args.casesDir}`,
	);
	console.log(
		`  setKind: regression=${String(count(planned, (c) => c.setKind === 'regression'))}, capability_gap=${String(count(planned, (c) => c.setKind === 'capability_gap'))}`,
	);
	console.log(
		`  synthetic: true=${String(count(planned, (c) => c.body.synthetic))}, false=${String(count(planned, (c) => !c.body.synthetic))}`,
	);
	console.log(`  create: ${String(toCreate.length)}`);
	console.log(`  update: ${String(toUpdate.length)}`);
	for (const item of toUpdate)
		console.log(`    ~ ${item.routingCase.id}: ${item.changed.join(', ')}`);
	console.log(`  unchanged: ${String(unchanged.length)}`);
	for (const s of skipped) console.log(`  skipped ${s.id}: ${s.reason}`);
	if (unknownPassing.length > 0) {
		console.warn(
			`  warning: ${String(unknownPassing.length)} passing id(s) are not among the selected cases: ${unknownPassing.join(', ')}`,
		);
	}
	const remote = [...rowsByName.keys()].filter((name) => !loaded.some((c) => c.id === name));
	if (remote.length > 0) {
		console.log(`  in the suite but not selected (left as they are): ${String(remote.length)}`);
	}

	if (args.dryRun) {
		const [created] = toCreate;
		const [updated] = toUpdate;
		if (created) {
			console.log(`\nSample create payload (${created.routingCase.id}):`);
			console.log(JSON.stringify(created.body, null, 2));
		}
		if (updated) {
			console.log(`\nSample update payload (${updated.routingCase.id}, #${String(updated.id)}):`);
			console.log(JSON.stringify(toLangTracerUpdateBody(updated.body), null, 2));
		}
		return;
	}

	for (const item of toCreate) {
		const res = await client.createCase(item.body);
		console.log(
			`  + ${res.alreadyExisted ? 'found' : 'created'} ${item.routingCase.id} (#${String(res.case.id)})`,
		);
	}
	for (const item of toUpdate) {
		const res = await client.updateCase(item.id, toLangTracerUpdateBody(item.body));
		console.log(
			`  ~ updated ${item.routingCase.id} (#${String(item.id)}, rev ${String(res.revision)})`,
		);
	}

	await verifyRoundTrip(config, client, suite.id, planned);
	console.log(
		`\nDone: ${String(toCreate.length)} created, ${String(toUpdate.length)} updated, ${String(unchanged.length)} unchanged, ${String(skipped.length)} skipped.`,
	);
}

/**
 * Re-reads the suite and checks that every pushed case rebuilds to the local
 * case with the same tags, setKind, user-data flag, and expectation, in both
 * the stored row and the export the dispatcher sends. A server that ignores a
 * key still answers 200, so only a read-back proves the write.
 */
async function verifyRoundTrip(
	config: LangTracerConfig,
	client: LangTracerClient,
	suiteId: number,
	planned: PlannedCase[],
): Promise<void> {
	const [rows, exported] = await Promise.all([
		fetchSuiteRows(config, suiteId),
		client.exportSuite(suiteId),
	]);
	const rowsByName = new Map(rows.map((row) => [row.name, row]));
	const { cases, errors } = routingCasesFromExport(exported.files);
	const stored = new Map(cases.map((routingCase) => [routingCase.id, routingCase]));
	const problems = [...errors];
	for (const item of planned) {
		const id = item.routingCase.id;
		const row = rowsByName.get(id);
		const storedCase = stored.get(id);
		if (!row || !storedCase) {
			problems.push(`${id}: missing from the suite`);
			continue;
		}
		const changed = [...rowDiff(row, item.body), ...routingCaseDiff(storedCase, item.routingCase)];
		if (routingTags(storedCase).join(' ') !== item.body.evalTags.join(' ')) {
			changed.push('export tags');
		}
		const exportedDiff = expectationDiff(
			exportedExpectations(exported.files[`${id}.json`]),
			item.body,
		);
		changed.push(...exportedDiff.map((field) => `export ${field}`));
		if (changed.length > 0) problems.push(`${id}: ${[...new Set(changed)].join(', ')}`);
	}
	if (problems.length > 0) {
		for (const problem of problems) console.error(`  ! ${problem}`);
		throw new Error(`${String(problems.length)} case(s) did not round-trip.`);
	}
	console.log(`  verified ${String(planned.length)} case(s) round-trip intact`);
}

if (require.main === module) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}
