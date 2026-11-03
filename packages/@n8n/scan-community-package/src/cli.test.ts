import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { AnalysisResult } from './scanner.js';

vi.mock(import('./scanner.js'), async (importOriginal) => ({
	...(await importOriginal()),
	analyzePackageByName: vi.fn(),
}));

describe('scanner CLI exit status', () => {
	let fixtureDir: string;
	let originalArgv: string[];
	let originalExitCode: typeof process.exitCode;
	let exit: MockInstance<typeof process.exit>;
	let log: MockInstance<typeof console.log>;

	beforeEach(() => {
		vi.resetModules();
		fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-cli-fixture-'));
		fs.writeFileSync(path.join(fixtureDir, 'index.js'), 'export const fixture = true;\n');
		originalArgv = process.argv;
		originalExitCode = process.exitCode;
		process.argv = [...process.argv.slice(0, 2), 'n8n-nodes-fixture@1.0.0'];
		process.exitCode = undefined;
		exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		log = vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		process.argv = originalArgv;
		process.exitCode = originalExitCode;
		vi.restoreAllMocks();
		fs.rmSync(fixtureDir, { recursive: true, force: true });
	});

	async function runCli() {
		const { analyzePackage, analyzePackageByName } = await import('./scanner.js');
		let analysisResult: AnalysisResult | undefined;

		// Keep rule execution real. Replace only the registry and download boundary.
		vi.mocked(analyzePackageByName).mockImplementation(async (packageName, version) => {
			analysisResult = await analyzePackage(fixtureDir);
			return { packageName, version, ...analysisResult };
		});

		await import('./cli.js');

		if (!analysisResult) {
			throw new Error('CLI did not analyze the package');
		}

		return {
			analysisResult,
			exitCode: exit.mock.lastCall?.[0] ?? process.exitCode ?? 0,
		};
	}

	it('exits successfully when the registered rules complete without violations', async () => {
		const { analysisResult, exitCode } = await runCli();

		expect(analysisResult.passed).toBe(true);
		expect(log).toHaveBeenCalledWith(expect.stringContaining('has passed all security checks'));
		expect(exitCode).toBe(0);
	});

	// CE-3548: automation must not receive a successful exit status when a rule cannot run.
	it('exits with a non-zero status when a registered rule cannot start its helper', async () => {
		const { n8nCommunityNodesPlugin } = await import('@n8n/eslint-plugin-community-nodes');
		const rule = n8nCommunityNodesPlugin.rules?.['no-emoji-in-options'];
		if (!rule) {
			throw new Error('The no-emoji-in-options rule is not registered');
		}
		const missingHelper = path.join(fixtureDir, 'missing-rg');
		const createRule = vi.spyOn(rule, 'create').mockImplementation(() => {
			execFileSync(missingHelper, ['--version']);
			return {};
		});

		const { analysisResult, exitCode } = await runCli();

		expect(createRule).toHaveBeenCalled();
		expect(analysisResult).toMatchObject({
			passed: false,
			error: { code: 'ENOENT', path: missingHelper },
			message: expect.stringContaining('no-emoji-in-options'),
		});
		expect(log).toHaveBeenCalledWith(expect.stringContaining('has failed security checks'));
		expect(exitCode).not.toBe(0);
	});
});
