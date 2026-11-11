// ---------------------------------------------------------------------------
// First-build latency benchmark for n8n Assistant
//
//   pnpm eval:latency --label baseline [--out dir] [--repeat 4] [--base-url url]
//   pnpm eval:latency --compare <dir>/baseline.jsonl <dir>/prewarm.jsonl
//
// Run one arm per server build, then compare the two run files.
// ---------------------------------------------------------------------------

import { readFile } from 'node:fs/promises';

import { parseLatencyArgs } from './args';
import { formatComparison } from './compare';
import { latencyRunRecordSchema, type LatencyRunRecord } from './metrics';
import { runLatencyArm } from './run';

async function readRunFile(path: string): Promise<LatencyRunRecord[]> {
	const lines = (await readFile(path, 'utf8')).split('\n').filter((line) => line.trim() !== '');
	return lines.map((line) => latencyRunRecordSchema.parse(JSON.parse(line)));
}

async function main(): Promise<void> {
	const args = parseLatencyArgs(process.argv.slice(2));
	if (args.mode === 'compare') {
		const [a, b] = await Promise.all([readRunFile(args.fileA), readRunFile(args.fileB)]);
		console.log(formatComparison(a, b));
		return;
	}
	const file = await runLatencyArm(args);
	console.log(`Wrote ${file}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
