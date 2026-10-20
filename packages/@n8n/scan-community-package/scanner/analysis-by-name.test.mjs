import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'child_process';
import axios from 'axios';
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

it('keeps source credential names in the combined package scan result', async () => {
	const packageName = 'n8n-nodes-fixture';
	const version = '1.0.0';
	const commit = 'a'.repeat(40);
	const { analyzePackageByName } = await import('./scanner.mjs');
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
			fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(manifest));
			if (target === path.join(fixtureDir, `source-${commit}`)) {
				fs.mkdirSync(path.join(target, 'credentials'));
				fs.writeFileSync(
					path.join(target, 'credentials/GithubApi.credentials.ts'),
					`export class GithubApi implements ICredentialType {
	name = 'githubApi';
	displayName = 'Community API';
	documentationUrl = 'https://example.com/credentials';
	icon = 'file:fixture.svg';
	properties = [];
	test = { request: { baseURL: 'https://example.com', url: '/' } };
}`,
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
			}
		}
		return { status: 0 };
	});

	const result = await analyzePackageByName(packageName, version);

	expect(result.passed, result.details ?? result.message).toBe(true);
	expect(result).toMatchObject({
		packageName,
		version,
		passed: true,
		credentialNames: ['githubApi'],
	});
});
