import fs from 'fs';
import path from 'path';
import os from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { analyzePackage } from './scanner.mjs';

/**
 * Build a temporary package directory on disk so we can hand it to
 * `analyzePackage` exactly the way the scanner would after extracting a
 * tarball from npm.
 */
function makeFixturePackage(files) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-fixture-'));
	for (const [relativePath, contents] of Object.entries(files)) {
		const fullPath = path.join(dir, relativePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(
			fullPath,
			typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2),
		);
	}
	return dir;
}

describe('analyzePackage', () => {
	let fixtureDir;

	afterEach(() => {
		if (fixtureDir) {
			fs.rmSync(fixtureDir, { recursive: true, force: true });
			fixtureDir = undefined;
		}
	});

	it('lints package.json and flags forbidden `overrides` field (regression for CE-1023)', async () => {
		fixtureDir = makeFixturePackage({
			'package.json': {
				name: 'n8n-nodes-fixture',
				version: '1.0.0',
				keywords: ['n8n-community-node-package'],
				peerDependencies: { 'n8n-workflow': '*' },
				overrides: { 'change-case': '4.1.2' },
			},
			'index.js': "module.exports = {};\n",
		});

		const result = await analyzePackage(fixtureDir);

		expect(result.passed).toBe(false);
		expect(result.details).toContain('no-overrides-field');
	});

	it('passes a clean package that does not violate any error-level rules', async () => {
		fixtureDir = makeFixturePackage({
			'package.json': {
				name: 'n8n-nodes-fixture',
				version: '1.0.0',
				keywords: ['n8n-community-node-package'],
				peerDependencies: { 'n8n-workflow': '*' },
			},
			'index.js': "module.exports = {};\n",
		});

		const result = await analyzePackage(fixtureDir);

		expect(result.passed).toBe(true);
	});

	it('flags forbidden lifecycle scripts in package.json', async () => {
		fixtureDir = makeFixturePackage({
			'package.json': {
				name: 'n8n-nodes-fixture',
				version: '1.0.0',
				keywords: ['n8n-community-node-package'],
				peerDependencies: { 'n8n-workflow': '*' },
				scripts: { postinstall: 'node ./malicious.js' },
			},
			'index.js': "module.exports = {};\n",
		});

		const result = await analyzePackage(fixtureDir);

		expect(result.passed).toBe(false);
		expect(result.details).toContain('no-forbidden-lifecycle-scripts');
	});

	it('returns passed when the package contains no lintable files', async () => {
		fixtureDir = makeFixturePackage({
			'README.md': '# empty package\n',
		});

		const result = await analyzePackage(fixtureDir);

		expect(result.passed).toBe(true);
		expect(result.message).toBe('No files found to analyze');
	});
});
