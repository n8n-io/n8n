import fs from 'fs';
import path from 'path';
import os from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { analyzePackage, buildScanConfig, collectLintFiles } from './scanner.mjs';

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

describe('buildScanConfig', () => {
	// CE-1606: the scan gate must register the external eslint-plugin-n8n-nodes-base
	// and apply all three rulesets, mirroring `n8n-node lint`. Assert on the
	// resolved config rather than on rule execution: under vitest the external
	// plugin resolves a different @typescript-eslint parser instance than the one
	// it was compiled against, so its AST-walking rules silently no-op in-process
	// (they run correctly when the scanner is invoked via `node`, as the CLI does).
	it('registers the external n8n-nodes-base plugin', async () => {
		const config = await buildScanConfig();
		const pluginBlock = config.find((block) => block.plugins?.['n8n-nodes-base']);

		expect(pluginBlock).toBeDefined();
		expect(pluginBlock.plugins['n8n-nodes-base'].configs).toHaveProperty('community');
		expect(pluginBlock.plugins['n8n-nodes-base'].configs).toHaveProperty('credentials');
		expect(pluginBlock.plugins['n8n-nodes-base'].configs).toHaveProperty('nodes');
	});

	it('applies each external ruleset with the correct file scoping', async () => {
		const config = await buildScanConfig();
		const ruleBlockFor = (glob) =>
			config.find(
				(block) =>
					block.files?.includes(glob) &&
					Object.keys(block.rules ?? {}).some((r) => r.startsWith('n8n-nodes-base/')),
			);

		// community ruleset → package.json
		expect(ruleBlockFor('package.json')).toBeDefined();
		// credentials ruleset → credentials dir at any depth (incl. dist/)
		expect(ruleBlockFor('**/credentials/**/*.ts')).toBeDefined();
		// nodes ruleset → nodes dir at any depth (incl. dist/)
		expect(ruleBlockFor('**/nodes/**/*.ts')).toBeDefined();
	});

	it('carries over the same off-overrides node-cli applies', async () => {
		const config = await buildScanConfig();
		const rules = Object.assign({}, ...config.map((block) => block.rules ?? {}));

		for (const rule of [
			'n8n-nodes-base/cred-class-field-documentation-url-miscased',
			'n8n-nodes-base/cred-class-field-type-options-password-missing',
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node',
			'n8n-nodes-base/node-class-description-outputs-wrong',
			'n8n-nodes-base/node-param-type-options-max-value-present',
		]) {
			expect(rules[rule]).toBe('off');
		}
	});
});

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
			'index.js': 'module.exports = {};\n',
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
				description: 'A fixture community node package',
				license: 'MIT',
				author: { name: 'Test Author', email: 'test@example.com' },
				keywords: ['n8n-community-node-package'],
				peerDependencies: { 'n8n-workflow': '*' },
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Foo/Foo.node.js'] },
			},
			'index.js': 'module.exports = {};\n',
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
			'index.js': 'module.exports = {};\n',
		});

		const result = await analyzePackage(fixtureDir);

		expect(result.passed).toBe(false);
		expect(result.details).toContain('no-forbidden-lifecycle-scripts');
	});

	// CE-1713: the gate lints the package SOURCE (cloned from the provenance-
	// attested git commit), not compiled `dist/` output. `collectLintFiles`
	// selects authored `.ts` + `.json` and excludes `dist/`, `.git/`, `node_modules/`
	// and lockfiles — mirroring `n8n-node lint`'s `globalIgnores(['dist'])`. `.js`
	// is excluded too (compiled output + build scripts like gulpfile.js trip rules
	// that are meaningless there). Asserted at the glob level because the external
	// `n8n-nodes-base` AST-walking rules no-op under vitest (see `buildScanConfig`);
	// full TS rule execution is verified by the end-to-end `node` scan on a real
	// package (CE-1713 reproduction).
	describe('collectLintFiles', () => {
		it('selects authored .ts and .json, excludes dist/, .git/, .js and lockfiles', () => {
			fixtureDir = makeFixturePackage({
				'package.json': {
					name: 'n8n-nodes-fixture',
					version: '1.0.0',
					description: 'A fixture community node package',
					license: 'MIT',
					author: { name: 'Test Author', email: 'test@example.com' },
					keywords: ['n8n-community-node-package'],
					peerDependencies: { 'n8n-workflow': '*' },
					n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Foo/Foo.node.js'] },
				},
				'nodes/Foo/Foo.node.ts': 'export class Foo {}\n',
				'credentials/FooApi.credentials.ts': 'export class FooApi {}\n',
				'gulpfile.js': "require('gulp');\n",
				'package-lock.json': '{}',
				'dist/nodes/Foo/Foo.node.js': '"use strict";\n',
				'dist/nodes/Foo/Foo.node.d.ts': 'export declare class Foo {}\n',
				'.git/config': '[core]\n',
			});

			const selected = collectLintFiles(fixtureDir)
				.map((p) => path.relative(fixtureDir, p))
				.sort();

			expect(selected).toEqual(
				['credentials/FooApi.credentials.ts', 'nodes/Foo/Foo.node.ts', 'package.json'].sort(),
			);
		});
	});

	// `dist/` build output in the cloned source repo must be ignored end-to-end:
	// a file in `dist/` that would produce a parse error if linted must not be
	// reached. This is robust under vitest (JSON parsing works regardless of the
	// external plugin's parser instance).
	it('ignores committed dist/ build output in the source tree', async () => {
		fixtureDir = makeFixturePackage({
			'package.json': {
				name: 'n8n-nodes-fixture',
				version: '1.0.0',
				description: 'A fixture community node package',
				license: 'MIT',
				author: { name: 'Test Author', email: 'test@example.com' },
				keywords: ['n8n-community-node-package'],
				peerDependencies: { 'n8n-workflow': '*' },
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Foo/Foo.node.js'] },
			},
			// Malformed JSON that would parse-error if `dist/` were not ignored.
			'dist/broken.json': '{ this is not valid json }',
		});

		const result = await analyzePackage(fixtureDir);

		expect(result.passed).toBe(true);
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
