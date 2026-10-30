import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), '../scanner/cli.mjs');

const runCli = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });

// Only the paths that fail before any network access are covered here; the
// pass (0) and failed-check (2) mappings are covered by getExitCode's tests.
describe('cli exit codes', () => {
	it('exits with 1 and prints usage when no package is given', () => {
		const { status, stderr } = runCli();

		expect(status).toBe(1);
		expect(stderr).toContain('Usage:');
	});

	it('exits with 1 for an invalid package specification instead of crashing', () => {
		const { status, stderr } = runCli('bad spec!');

		expect(status).toBe(1);
		expect(stderr).toContain('Analysis failed: Error: Invalid package specification');
	});
});
