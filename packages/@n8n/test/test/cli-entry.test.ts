import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test.each(['commonjs', 'module'])(
	'imports the backend entry from %s without starting an instance',
	(mode) => {
		const directory = mkdtempSync(path.join(tmpdir(), 'n8n-test-entry-'));
		const entry = require.resolve('n8n/dist/testing.js');
		const script =
			mode === 'commonjs'
				? 'const entry = require(process.argv[1]); console.log(typeof entry.startPreparedWorkflow);'
				: "const { pathToFileURL } = await import('node:url'); const entry = await import(pathToFileURL(process.argv[1])); console.log(typeof entry.startPreparedWorkflow);";
		try {
			const result = spawnSync(process.execPath, [`--input-type=${mode}`, '-e', script, entry], {
				cwd: directory,
				env: { ...process.env, N8N_USER_FOLDER: directory },
				encoding: 'utf8',
				timeout: 15_000,
			});
			expect(result.stderr).toBe('');
			expect(result.status).toBe(0);
			expect(result.stdout.trim()).toBe('function');
			expect(readdirSync(directory)).toEqual([]);
		} finally {
			rmSync(directory, { recursive: true });
		}
	},
);
