// Prints a stored model output and the entries the parser keeps from it.
// Usage: ./ev.sh show.ts '<variant>|<model>|<scenario>|<size>|<rep>'
import { readFileSync } from 'node:fs';

import { parseObservationLogMarkdown } from '../../src/runtime/memory/observation-log-observer';

const key = process.argv[2];
const output = readFileSync('out/outputs.jsonl', 'utf8')
	.trim()
	.split('\n')
	.map((line) => JSON.parse(line) as { key: string; text: string })
	.find((o) => o.key === key);
if (!output) throw new Error(`No output with key ${key}`);
console.log('--- raw model output ---');
console.log(output.text);
console.log('--- stored entries ---');
for (const entry of parseObservationLogMarkdown(output.text).entries)
	console.log(`[${entry.marker}${entry.parentIndex === null ? '' : ' child'}] ${entry.text}\n`);
