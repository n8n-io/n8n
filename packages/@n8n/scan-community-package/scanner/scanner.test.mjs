import fs from 'fs';
import path from 'path';
import os from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	analyzePackage,
	buildScanConfig,
	findPackageRoot,
	parseSourceRepo,
	SOURCE_FILE_PATTERNS,
} from './scanner.mjs';

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

describe('parseSourceRepo', () => {
	const makeAttestation = (predicate) => [
		{
			predicateType: 'https://slsa.dev/provenance/v1',
			bundle: {
				dsseEnvelope: {
					payload: Buffer.from(JSON.stringify({ predicate })).toString('base64'),
				},
			},
		},
	];

	const commit = 'a'.repeat(40);

	it('extracts owner, repo and commit from a GitHub attestation', () => {
		const attestations = makeAttestation({
			buildDefinition: {
				resolvedDependencies: [
					{
						uri: `git+https://github.com/acme/n8n-nodes-foo@refs/heads/main`,
						digest: { gitCommit: commit },
					},
				],
			},
		});

		expect(parseSourceRepo(attestations)).toEqual({
			owner: 'acme',
			repo: 'n8n-nodes-foo',
			gitCommit: commit,
		});
	});

	it('supports repo names containing dots', () => {
		const attestations = makeAttestation({
			buildDefinition: {
				resolvedDependencies: [
					{
						uri: 'git+https://github.com/acme/n8n-nodes-foo.bar@refs/heads/main',
						digest: { gitCommit: commit },
					},
				],
			},
		});

		expect(parseSourceRepo(attestations)).toEqual({
			owner: 'acme',
			repo: 'n8n-nodes-foo.bar',
			gitCommit: commit,
		});
	});

	it('returns null for non-GitHub source hosts', () => {
		const attestations = makeAttestation({
			buildDefinition: {
				resolvedDependencies: [
					{
						uri: `git+https://gitlab.com/acme/n8n-nodes-foo@refs/heads/main`,
						digest: { gitCommit: commit },
					},
				],
			},
		});

		expect(parseSourceRepo(attestations)).toBeNull();
	});

	it('returns null when the commit digest is not a git SHA', () => {
		const attestations = makeAttestation({
			buildDefinition: {
				resolvedDependencies: [
					{
						uri: 'git+https://github.com/acme/n8n-nodes-foo@refs/heads/main',
						digest: { gitCommit: 'not-a-sha' },
					},
				],
			},
		});

		expect(parseSourceRepo(attestations)).toBeNull();
	});

	it('returns null when there is no provenance attestation', () => {
		expect(parseSourceRepo(undefined)).toBeNull();
		expect(parseSourceRepo([])).toBeNull();
		expect(parseSourceRepo([{ predicateType: 'something-else' }])).toBeNull();
	});
});

describe('findPackageRoot', () => {
	let fixtureDir;

	afterEach(() => {
		if (fixtureDir) {
			fs.rmSync(fixtureDir, { recursive: true, force: true });
			fixtureDir = undefined;
		}
	});

	it('finds the package directory in a monorepo by package.json name', () => {
		fixtureDir = makeFixturePackage({
			'package.json': { name: 'monorepo-root', private: true },
			'packages/foo/package.json': { name: 'n8n-nodes-foo', version: '1.0.0' },
		});

		expect(findPackageRoot(fixtureDir, 'n8n-nodes-foo')).toBe(
			path.join(fixtureDir, 'packages', 'foo'),
		);
	});

	it('returns null when no package.json declares the package name', () => {
		fixtureDir = makeFixturePackage({
			'package.json': { name: 'something-else' },
		});

		expect(findPackageRoot(fixtureDir, 'n8n-nodes-foo')).toBeNull();
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

	// A well-formed node package's compiled sources must not trip the external
	// node rules — those rules can't see enough in `.d.ts`/`.js` output to fire,
	// so scanning must not produce false positives on legitimate packages.
	it('does not false-positive on a well-formed node package layout (CE-1606)', async () => {
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
			'dist/nodes/Foo/Foo.node.d.ts': `export declare class Foo {
    description: {
        displayName: string;
        name: string;
        properties: {
            displayName: string;
            name: string;
            type: string;
            default: string;
        }[];
    };
}
`,
			'dist/nodes/Foo/Foo.node.js':
				'"use strict";\nObject.defineProperty(exports, "__esModule", { value: true });\nexports.Foo = void 0;\nclass Foo {}\nexports.Foo = Foo;\n',
		});

		const result = await analyzePackage(fixtureDir);

		expect(result.passed).toBe(true);
	});

	// CE-1713: source checkouts are linted with dev-scoped globs — only the
	// shippable `nodes/**` / `credentials/**` sources and package.json, so repo
	// dev files (gulpfile, test configs) can't produce gate-only violations.
	it('ignores repo dev files when linting with source file patterns', async () => {
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
			'gulpfile.js': "console.log('building');\n",
		});

		const result = await analyzePackage(fixtureDir, SOURCE_FILE_PATTERNS);

		expect(result.passed).toBe(true);
	});

	it('flags violations in node sources when linting with source file patterns', async () => {
		fixtureDir = makeFixturePackage({
			'package.json': {
				name: 'n8n-nodes-fixture',
				version: '1.0.0',
				keywords: ['n8n-community-node-package'],
				peerDependencies: { 'n8n-workflow': '*' },
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Foo/Foo.node.js'] },
			},
			'nodes/Foo/Foo.node.ts': "console.log('debug');\nexport class Foo {}\n",
		});

		const result = await analyzePackage(fixtureDir, SOURCE_FILE_PATTERNS);

		expect(result.passed).toBe(false);
		expect(result.details).toContain('no-console');
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
