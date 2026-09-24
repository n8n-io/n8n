// Fake executables for tests. Each shim is a Node script. It receives `args`, `root`,
// `file(name)` under the root, and `log(event)`, which appends to calls.jsonl in the root.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COMMON = `
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const root = process.env.TEST_ROOT;
const file = (name) => path.join(root, name);
const log = (event) => fs.appendFileSync(file('calls.jsonl'), JSON.stringify(event) + '\\n');
`;

export function fakeBinaries(prefix) {
	const root = mkdtempSync(join(tmpdir(), prefix));
	const binDir = join(root, 'bin');
	mkdirSync(binDir);
	const logFile = join(root, 'calls.jsonl');
	writeFileSync(logFile, '');
	return {
		root,
		env: { PATH: `${binDir}:${process.env.PATH}`, TEST_ROOT: root },
		bin: (name, body) =>
			writeFileSync(join(binDir, name), `#!${process.execPath}\n${COMMON}\n${body}`, {
				mode: 0o755,
			}),
		calls: () =>
			readFileSync(logFile, 'utf8')
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((line) => JSON.parse(line)),
	};
}
