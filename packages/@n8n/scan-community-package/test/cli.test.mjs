import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '../scanner/cli.mjs');

const runCli = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

// Only the paths that fail before any network access are covered here; the
// pass (0) and failed-check (2) mappings are covered by getExitCode's tests.
describe('cli exit codes', () => {
	it.each([
		['no package is given', [], 'Usage:'],
		[
			'the package spec is invalid',
			['bad spec!'],
			'Analysis failed: Error: Invalid package specification',
		],
	])('exits with 1 when %s', (_, args, message) => {
		const { status, stderr } = runCli(...args);

		expect(status).toBe(1);
		expect(stderr).toContain(message);
	});
});
