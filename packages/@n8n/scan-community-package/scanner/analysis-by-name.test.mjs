import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'child_process';
import axios from 'axios';
import { ESLint } from 'eslint';
import tmp from 'tmp';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({ spawnSync: vi.fn() }));
vi.mock('tmp', () => ({ default: { dirSync: vi.fn() } }));

let fixtureDir;

beforeEach(() => {
	vi.resetModules();
	fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-by-name-fixture-'));
	vi.mocked(tmp.dirSync).mockReturnValue({ name: fixtureDir });
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.clearAllMocks();
	fs.rmSync(fixtureDir, { recursive: true, force: true });
});

it.each([
	'complete',
	'missing credential',
	'lint exception',
	'published-only credential',
	'source-only credential',
	'different credential path',
	'reordered credentials',
	'duplicate registration',
	'no credentials',
])(
	'returns credential metadata only for matching registrations and complete source analysis (%s)',
	async (scenario) => {
		const packageName = 'n8n-nodes-fixture';
		const version = '1.0.0';
		const commit = 'a'.repeat(40);
		const { analyzePackageByName } = await import('./scanner.mjs');
		if (scenario === 'lint exception') {
			vi.spyOn(ESLint.prototype, 'lintFiles').mockRejectedValue(new Error('Fixture lint failure'));
			vi.spyOn(console, 'error').mockImplementation(() => {});
		}
		const manifest = {
			name: packageName,
			version,
			description: 'A fixture community node package',
			license: 'MIT',
			author: { name: 'Test Author', email: 'test@example.com' },
			keywords: ['n8n-community-node-package'],
			peerDependencies: { 'n8n-workflow': '*' },
			n8n: {
				n8nNodesApiVersion: 1,
				nodes: ['dist/nodes/Foo/Foo.node.js'],
				credentials: ['dist/credentials/GithubApi.credentials.js'],
			},
		};
		const sourceManifest = structuredClone(manifest);
		const publishedManifest = structuredClone(manifest);
		const otherCredentialPath = 'dist/credentials/OtherApi.credentials.js';
		if (['source-only credential', 'reordered credentials'].includes(scenario)) {
			sourceManifest.n8n.credentials.push(otherCredentialPath);
		}
		if (['published-only credential', 'reordered credentials'].includes(scenario)) {
			publishedManifest.n8n.credentials.unshift(otherCredentialPath);
		}
		if (scenario === 'different credential path') {
			publishedManifest.n8n.credentials = [otherCredentialPath];
		}
		if (scenario === 'duplicate registration') {
			publishedManifest.n8n.credentials.push(...publishedManifest.n8n.credentials);
		}
		if (scenario === 'no credentials') {
			delete sourceManifest.n8n.credentials;
			publishedManifest.n8n.credentials = [];
		}
		vi.spyOn(axios, 'get')
			.mockResolvedValueOnce({
				data: {
					versions: {
						[version]: {
							dist: {
								attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } },
							},
						},
					},
				},
			})
			.mockResolvedValueOnce({
				data: {
					attestations: [
						{
							predicateType: 'https://slsa.dev/provenance/v1',
							bundle: {
								dsseEnvelope: {
									payload: Buffer.from(
										JSON.stringify({
											predicate: {
												buildDefinition: {
													resolvedDependencies: [
														{
															uri: `git+https://github.com/acme/${packageName}@refs/heads/main`,
															digest: { gitCommit: commit },
														},
													],
												},
											},
										}),
									).toString('base64'),
								},
							},
						},
					],
				},
			})
			.mockResolvedValueOnce({ data: Buffer.from('fixture archive') });

		vi.mocked(spawnSync).mockImplementation((command, args, options) => {
			if (command === 'npm') {
				fs.writeFileSync(path.join(options.cwd, 'fixture.tgz'), 'fixture archive');
			} else if (command === 'tar') {
				const target = args[args.indexOf('-C') + 1];
				const isSource = target === path.join(fixtureDir, `source-${commit}`);
				fs.writeFileSync(
					path.join(target, 'package.json'),
					JSON.stringify(isSource ? sourceManifest : publishedManifest),
				);
				if (isSource) {
					if (scenario === 'missing credential') return { status: 0 };
					fs.mkdirSync(path.join(target, 'credentials'));
					const credentialSource = `export class GithubApi implements ICredentialType {
	name = 'githubApi';
	displayName = 'Community API';
	documentationUrl = 'https://example.com/credentials';
	icon = 'file:fixture.svg';
	properties = [];
	test = { request: { baseURL: 'https://example.com', url: '/' } };
}`;
					fs.writeFileSync(
						path.join(target, 'credentials/GithubApi.credentials.ts'),
						credentialSource,
					);
					fs.writeFileSync(
						path.join(target, 'credentials/OtherApi.credentials.ts'),
						credentialSource
							.replaceAll('GithubApi', 'OtherApi')
							.replaceAll('githubApi', 'otherApi'),
					);
					fs.writeFileSync(
						path.join(target, 'credentials/fixture.svg'),
						'<svg xmlns="http://www.w3.org/2000/svg"/>',
					);
				} else {
					fs.mkdirSync(path.join(target, 'dist/credentials'), { recursive: true });
					fs.writeFileSync(
						path.join(target, 'dist/credentials/GithubApi.credentials.js'),
						"exports.GithubApi = class GithubApi { constructor() { this.name = 'githubApi'; } };",
					);
					fs.writeFileSync(
						path.join(target, otherCredentialPath),
						"exports.OtherApi = class OtherApi { constructor() { this.name = 'otherApi'; } };",
					);
				}
			}
			return { status: 0 };
		});

		const result = await analyzePackageByName(packageName, version);

		if (
			['published-only credential', 'source-only credential', 'different credential path'].includes(
				scenario,
			)
		) {
			expect(result.passed).toBe(false);
			expect(result.message).toContain('Credential registrations differ');
			expect(result).not.toHaveProperty('credentialNames');
			return;
		}

		if (['missing credential', 'lint exception'].includes(scenario)) {
			expect(result.passed).toBe(false);
			expect(result).not.toHaveProperty('credentialNames');
			expect(result.message).toContain(
				scenario === 'missing credential'
					? 'Could not read the credential name for dist/credentials/GithubApi.credentials.js'
					: 'Fixture lint failure',
			);
			return;
		}

		expect(result.passed, result.details ?? result.message).toBe(true);
		expect(result).toMatchObject({
			packageName,
			version,
			passed: true,
			credentialNames:
				scenario === 'no credentials'
					? []
					: scenario === 'reordered credentials'
						? ['githubApi', 'otherApi']
						: ['githubApi'],
		});
	},
);

it('omits credential metadata when provenance checks fail', async () => {
	const { analyzePackageByName } = await import('./scanner.mjs');
	vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { versions: { '1.0.0': {} } } });

	const result = await analyzePackageByName('n8n-nodes-fixture', '1.0.0');

	expect(result.passed).toBe(false);
	expect(result.message).toContain('Package was not published with npm provenance');
	expect(result).not.toHaveProperty('credentialNames');
});

it('omits credential metadata when the source fetch fails', async () => {
	const { analyzePackageByName } = await import('./scanner.mjs');
	vi.spyOn(axios, 'get')
		.mockResolvedValueOnce({
			data: {
				versions: {
					'1.0.0': {
						dist: {
							attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } },
						},
					},
				},
			},
		})
		.mockRejectedValueOnce(new Error('Fixture source fetch failure'));

	const result = await analyzePackageByName('n8n-nodes-fixture', '1.0.0');

	expect(result.passed).toBe(false);
	expect(result.message).toContain('Fixture source fetch failure');
	expect(result).not.toHaveProperty('credentialNames');
});

it('omits credential metadata when the registry request fails', async () => {
	const { analyzePackageByName } = await import('./scanner.mjs');
	vi.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Fixture registry failure'));
	vi.spyOn(console, 'error').mockImplementation(() => {});

	const result = await analyzePackageByName('n8n-nodes-fixture', '1.0.0');

	expect(result.passed).toBe(false);
	expect(result.message).toContain('Fixture registry failure');
	expect(result).not.toHaveProperty('credentialNames');
});
