/**
 * Records the HTTP requests and outputs of v1 nodes for the request-equivalence
 * test. It runs each case of `src/nodes/__tests__/equivalence-cases.ts` through
 * n8n's real node code with the network replaced, and writes
 * `src/nodes/__tests__/v1-requests.json`.
 *
 * Run: `node scripts/record-v1-requests.ts [filter]` (needs the built n8n
 * packages). With a filter, it records only the cases whose name contains it
 * and keeps the other recordings.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EQUIVALENCE_CASES } from '../src/nodes/__tests__/equivalence-cases.ts';
import type { Recording } from '../src/nodes/__tests__/equivalence.ts';
import {
	disposeRecorder,
	recordV1,
	recorderAvailable,
} from '../src/nodes/__tests__/v1-recorder.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!recorderAvailable()) {
	console.error('Build n8n-core, n8n-nodes-base and @n8n/node-engine-compatibility first.');
	process.exit(1);
}
const only = process.argv[2];
const file = join(root, 'src/nodes/__tests__/v1-requests.json');
// With a filter, record only the matching cases and keep the other recordings.
const out: Record<string, Recording> = only ? JSON.parse(readFileSync(file, 'utf8')) : {};
for (const testCase of EQUIVALENCE_CASES) {
	if (only && !testCase.name.includes(only)) continue;
	const recording = await recordV1(testCase);
	out[testCase.name] = recording;
	const status = recording.error
		? `error: ${recording.error}`
		: `${recording.requests.length} request(s)`;
	console.log(`${testCase.name}: ${status}`);
}
await disposeRecorder();
// The order of the cases, then recordings of cases that no longer exist.
const ordered: Record<string, Recording> = {};
for (const testCase of EQUIVALENCE_CASES) {
	if (testCase.name in out) ordered[testCase.name] = out[testCase.name];
}
if (only)
	for (const [name, rec] of Object.entries(out)) if (!(name in ordered)) ordered[name] = rec;
writeFileSync(file, `${JSON.stringify(ordered, null, '\t')}\n`);
