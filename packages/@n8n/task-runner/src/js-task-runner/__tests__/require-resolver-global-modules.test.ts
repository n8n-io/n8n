import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Regression tests for https://github.com/n8n-io/n8n/issues/24191
 *
 * External npm packages installed globally in Docker (via `npm install -g`)
 * must be resolvable by the task runner's require(). This requires:
 *
 * 1. NODE_PATH must include the global npm modules directory
 * 2. NODE_PATH must not be clobbered by load-nodes-and-credentials.ts
 * 3. Module._initPaths() must be called to pick up NODE_PATH at runtime
 *
 * Tests use child processes because Jest intercepts require() with its own
 * resolver which doesn't respect NODE_PATH changes.
 *
 * IMPORTANT: Scripts are placed in a separate directory from the installed
 * package so that Node's standard module resolution (walking up parent dirs)
 * cannot find the package — only NODE_PATH can.
 */
describe('external npm modules in task runner (issue #24191)', () => {
	const tmpDir = path.join(os.tmpdir(), `n8n-test-global-modules-${Date.now()}`);
	// Install package in an isolated location (simulates /opt/nodejs/.../lib/node_modules)
	const installDir = path.join(tmpDir, 'global-install');
	const nodeModulesPath = path.join(installDir, 'node_modules');
	// Scripts live in a separate tree so require() can't find the package via parent traversal
	const scriptsDir = path.join(tmpDir, 'scripts');
	const packageName = 'cowsay';
	const scriptPath = path.join(scriptsDir, 'test-require.js');
	const scriptNoInitPath = path.join(scriptsDir, 'test-require-no-init.js');

	beforeAll(() => {
		fs.mkdirSync(installDir, { recursive: true });
		fs.mkdirSync(scriptsDir, { recursive: true });
		execSync(`npm install ${packageName} --prefix ${installDir}`, { stdio: 'pipe' });

		fs.writeFileSync(
			scriptPath,
			`const Module = require("module");
if (process.env.NODE_PATH) { Module._initPaths(); }
try {
  require("${packageName}");
  console.log(JSON.stringify({ success: true }));
} catch (e) {
  console.log(JSON.stringify({ success: false, error: e.message }));
}`,
		);

		fs.writeFileSync(
			scriptNoInitPath,
			`process.env.NODE_PATH = "${nodeModulesPath}";
try {
  require("${packageName}");
  console.log(JSON.stringify({ success: true }));
} catch (e) {
  console.log(JSON.stringify({ success: false, error: e.message }));
}`,
		);
	});

	afterAll(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function runRequireTest(env: Record<string, string | undefined>): {
		success: boolean;
		error?: string;
	} {
		const result = execSync(`node ${scriptPath}`, {
			env: { ...process.env, ...env, NODE_PATH: env.NODE_PATH },
			encoding: 'utf-8',
			cwd: scriptsDir,
		});

		return JSON.parse(result.trim()) as { success: boolean; error?: string };
	}

	it('should fail without NODE_PATH pointing to the install location', () => {
		const result = runRequireTest({ NODE_PATH: undefined });

		expect(result.success).toBe(false);
		expect(result.error).toContain('Cannot find module');
	});

	it('should succeed when NODE_PATH includes the install location', () => {
		const result = runRequireTest({ NODE_PATH: nodeModulesPath });

		expect(result.success).toBe(true);
	});

	it('should succeed when install location is appended to other paths', () => {
		// Simulates the fix: load-nodes-and-credentials.ts appends the original
		// NODE_PATH rather than clobbering it, so the task runner receives both
		// the n8n internal paths AND the global modules path.
		const combinedNodePath = `/some/internal/path:/another/path:${nodeModulesPath}`;
		const result = runRequireTest({ NODE_PATH: combinedNodePath });

		expect(result.success).toBe(true);
	});

	it('should fail when NODE_PATH is clobbered without the install location', () => {
		// Simulates the bug: load-nodes-and-credentials.ts overwrites NODE_PATH
		// with only n8n internal paths, losing the global modules path.
		const result = runRequireTest({ NODE_PATH: '/some/internal/path:/another/path' });

		expect(result.success).toBe(false);
	});

	it('should fail when NODE_PATH is set at runtime without _initPaths()', () => {
		const result = execSync(`node ${scriptNoInitPath}`, {
			env: { ...process.env, NODE_PATH: undefined },
			encoding: 'utf-8',
			cwd: scriptsDir,
		});

		const parsed = JSON.parse(result.trim()) as { success: boolean };
		expect(parsed.success).toBe(false);
	});
});
