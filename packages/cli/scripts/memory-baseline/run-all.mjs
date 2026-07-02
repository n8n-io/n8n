/**
 * Runs every memory-baseline scenario in its own process (so scenarios cannot
 * pollute each other's heap) and aggregates the results.
 *
 *   node scripts/memory-baseline/run-all.mjs [--out=<results.json>]
 *
 * Prints a markdown table to stdout; writes raw rows to --out if given.
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const harness = path.join(__dirname, 'memory-baseline.mjs');

const outArg = process.argv.find((a) => a.startsWith('--out='));
const scenarios = ['baseline', 'copyA', 'copyB', 'copyC', 'release-defeat', 'all'];

const allRows = [];
for (const scenario of scenarios) {
	console.error(`\n=== scenario: ${scenario} ===`);
	const result = spawnSync(
		process.execPath,
		['--expose-gc', '--max-old-space-size=3072', harness, scenario],
		{ encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 },
	);
	if (result.status !== 0) {
		console.error(`Scenario ${scenario} failed (exit ${result.status})`);
		process.exitCode = 1;
		continue;
	}
	const line = result.stdout.split('\n').find((l) => l.startsWith('RESULT_JSON:'));
	if (!line) {
		console.error(`Scenario ${scenario} produced no RESULT_JSON`);
		process.exitCode = 1;
		continue;
	}
	allRows.push(...JSON.parse(line.slice('RESULT_JSON:'.length)));
}

if (outArg) {
	writeFileSync(outArg.slice('--out='.length), JSON.stringify(allRows, null, 2));
}

// markdown summary, with per-scenario deltas against that scenario's steady state
let currentScenario;
let steadyHeap;
console.log('| Scenario | Checkpoint | heapUsed (MB) | Δ vs steady (MB) | rss (MB) | notes |');
console.log('|---|---|---:|---:|---:|---|');
for (const row of allRows) {
	if (row.scenario !== currentScenario) {
		currentScenario = row.scenario;
		steadyHeap = undefined;
	}
	if (row.name.startsWith('steady-state')) steadyHeap = row.heapUsedMB;
	const delta =
		steadyHeap !== undefined && !row.name.startsWith('steady-state')
			? (row.heapUsedMB - steadyHeap).toFixed(1)
			: '';
	const notes = Object.entries(row)
		.filter(([k]) => !['scenario', 'name', 'heapUsedMB', 'externalMB', 'rssMB'].includes(k))
		.map(([k, v]) => `${k}=${v}`)
		.join(', ');
	console.log(
		`| ${row.scenario} | ${row.name} | ${row.heapUsedMB} | ${delta} | ${row.rssMB} | ${notes} |`,
	);
}
