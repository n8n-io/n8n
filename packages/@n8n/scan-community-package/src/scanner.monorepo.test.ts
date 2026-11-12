import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { analyzePackageByName, EXIT_CODES, getExitCode, toJsonReport } from './scanner.js';

vi.mock('node:child_process', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:child_process')>();
	return { ...actual, spawnSync: vi.fn(actual.spawnSync) };
});

describe('analyzePackageByName monorepo policy', () => {
	let fixtureDir: string;

	beforeEach(() => {
		fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-monorepo-'));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		fs.rmSync(fixtureDir, { recursive: true, force: true });
	});

	it.each([
		['2026-09-23T12:00:00Z', '2027-03-23T23:59:59Z', true, 'packages/foo'],
		['2026-09-23T12:00:00Z', '2027-03-24T00:00:00Z', false, 'packages/foo'],
		['2026-09-24T00:00:00Z', '2026-10-01T00:00:00Z', false, 'packages/foo'],
		['2026-09-23T12:00:00Z', '2027-03-23T23:59:59Z', true, undefined],
		['2026-09-24T00:00:00Z', '2026-10-01T00:00:00Z', false, undefined],
	])(
		'scans a package created at %s on %s (passed: %s, directory: %s)',
		async (created, now, passed, directory) => {
			vi.spyOn(Date, 'now').mockReturnValue(Date.parse(now));
			const packageName = 'n8n-nodes-fixture';
			const manifest = {
				name: packageName,
				version: '1.0.0',
				description: 'A fixture community node package',
				license: 'MIT',
				author: { name: 'Test Author', email: 'test@example.com' },
				keywords: ['n8n-community-node-package'],
				peerDependencies: { 'n8n-workflow': '*' },
				repository: {
					type: 'git',
					url: 'https://github.com/example/packages.git',
					...(directory ? { directory } : {}),
				},
				n8n: { n8nNodesApiVersion: 1, nodes: ['dist/nodes/Foo/Foo.node.js'] },
			};
			const sourcePackage = path.join(fixtureDir, 'repository', 'packages', 'foo');
			fs.mkdirSync(sourcePackage, { recursive: true });
			fs.writeFileSync(path.join(sourcePackage, 'package.json'), JSON.stringify(manifest));
			fs.writeFileSync(
				path.join(fixtureDir, 'repository', 'package.json'),
				JSON.stringify({ private: true, workspaces: ['packages/*'] }),
			);
			const distPackage = path.join(fixtureDir, 'package');
			fs.mkdirSync(distPackage);
			fs.writeFileSync(path.join(distPackage, 'package.json'), JSON.stringify(manifest));
			const sourceArchive = execFileSync('tar', ['-czf', '-', '-C', fixtureDir, 'repository']);
			const distArchive = execFileSync('tar', ['-czf', '-', '-C', fixtureDir, 'package']);
			const commit = 'a'.repeat(40);
			const predicateType = 'https://slsa.dev/provenance/v1';
			vi.spyOn(axios, 'get')
				.mockResolvedValueOnce({
					data: {
						'dist-tags': { latest: '1.0.0' },
						time: { created },
						versions: { '1.0.0': { dist: { attestations: { provenance: { predicateType } } } } },
					},
				})
				.mockResolvedValueOnce({
					data: {
						attestations: [
							{
								predicateType,
								bundle: {
									dsseEnvelope: {
										payload: Buffer.from(
											JSON.stringify({
												predicate: {
													buildDefinition: {
														resolvedDependencies: [
															{
																uri: 'git+https://github.com/example/packages@refs/heads/main',
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
				.mockResolvedValueOnce({ data: sourceArchive });
			const actual =
				await vi.importActual<typeof import('node:child_process')>('node:child_process');
			vi.mocked(spawnSync).mockImplementation((command, args, options) => {
				if (command === 'npm') {
					if (typeof options?.cwd !== 'string') throw new Error('Expected a package directory');
					fs.writeFileSync(path.join(options.cwd, 'fixture.tgz'), distArchive);
					return {
						pid: 0,
						output: [],
						stdout: Buffer.alloc(0),
						stderr: Buffer.alloc(0),
						status: 0,
						signal: null,
					};
				}
				return actual.spawnSync(command, args, options);
			});

			const result = await analyzePackageByName(packageName, null);

			expect(result).toMatchObject({ packageName, version: '1.0.0', passed });
			expect(getExitCode(result)).toBe(passed ? EXIT_CODES.SCAN_SUCCEEDED : EXIT_CODES.SCAN_FAILED);
			if (!passed) {
				expect(result.message).toMatch(/single-package repository|monorepo/i);
				expect(toJsonReport(result)).toMatchObject({ status: 'failed', check: 'source' });
			}
		},
	);
});
