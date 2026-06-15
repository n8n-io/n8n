import {
	loadPrebakedWorkspaceBundle,
	materializeWorkspaceBundle,
} from '../prebaked-workspace-bundle';
import type { SandboxWorkspace } from '../sandbox-fs';
import { stringifyWorkspaceJson } from '../workspace-file-content';

const ROOT = '/home/daytona/workspace';

function createSandboxWorkspace(files: Map<string, string>): {
	workspace: SandboxWorkspace;
	writes: Map<string, string>;
} {
	const writes = new Map<string, string>();
	const workspace: SandboxWorkspace = {
		filesystem: {
			provider: 'local',
			writeFile: vi.fn(async (path: string, content: string | Buffer) => {
				writes.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
				await Promise.resolve();
			}),
			mkdir: vi.fn(async () => await Promise.resolve()),
		},
		sandbox: {
			executeCommand: vi.fn(async (command: string) => {
				const readMatch = /^cat '([^']+)' 2>\/dev\/null$/.exec(command);
				if (readMatch) {
					const content = files.get(readMatch[1]);
					return await Promise.resolve(
						content === undefined
							? { exitCode: 1, stdout: '', stderr: 'missing' }
							: { exitCode: 0, stdout: content, stderr: '' },
					);
				}

				return await Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
			}),
		},
	};

	return { workspace, writes };
}

describe('loadPrebakedWorkspaceBundle', () => {
	const manifestPath = `${ROOT}/bundle/.manifest.json`;
	const filePath = `${ROOT}/bundle/file.txt`;
	const bundle = {
		rootDir: `${ROOT}/bundle`,
		files: new Map([[filePath, 'content\n']]),
		contentHash: 'abc123',
	};

	it('returns the bundle when the manifest hash matches', async () => {
		const { workspace } = createSandboxWorkspace(
			new Map([
				[
					manifestPath,
					stringifyWorkspaceJson({ schemaVersion: 1, contentHash: bundle.contentHash }),
				],
				[filePath, 'content\n'],
			]),
		);

		const result = await loadPrebakedWorkspaceBundle({
			workspace,
			manifestPath,
			expectedHash: bundle.contentHash,
			hashField: 'contentHash',
			schemaVersion: 1,
			resourceLabel: 'Test bundle file',
			invalidManifestLogMessage: 'invalid',
			staleManifestLogMessage: 'stale',
			staleManifestLogKeys: { expected: 'expectedHash', actual: 'actualHash' },
			successLogMessage: 'success',
			successLogContext: () => ({ root: ROOT }),
			buildBundle: () => bundle,
		});

		expect(result).toBe(bundle);
	});

	it('returns undefined when the manifest hash is stale', async () => {
		const { workspace } = createSandboxWorkspace(
			new Map([[manifestPath, stringifyWorkspaceJson({ schemaVersion: 1, contentHash: 'stale' })]]),
		);

		const result = await loadPrebakedWorkspaceBundle({
			workspace,
			manifestPath,
			expectedHash: bundle.contentHash,
			hashField: 'contentHash',
			schemaVersion: 1,
			resourceLabel: 'Test bundle file',
			invalidManifestLogMessage: 'invalid',
			staleManifestLogMessage: 'stale',
			staleManifestLogKeys: { expected: 'expectedHash', actual: 'actualHash' },
			successLogMessage: 'success',
			successLogContext: () => ({ root: ROOT }),
			buildBundle: () => bundle,
		});

		expect(result).toBeUndefined();
	});

	it('returns undefined when the manifest hash matches but a payload file is missing', async () => {
		const { workspace } = createSandboxWorkspace(
			new Map([
				[
					manifestPath,
					stringifyWorkspaceJson({ schemaVersion: 1, contentHash: bundle.contentHash }),
				],
			]),
		);

		const result = await loadPrebakedWorkspaceBundle({
			workspace,
			manifestPath,
			expectedHash: bundle.contentHash,
			hashField: 'contentHash',
			schemaVersion: 1,
			resourceLabel: 'Test bundle file',
			invalidManifestLogMessage: 'invalid',
			staleManifestLogMessage: 'stale',
			staleManifestLogKeys: { expected: 'expectedHash', actual: 'actualHash' },
			successLogMessage: 'success',
			successLogContext: () => ({ root: ROOT }),
			buildBundle: () => bundle,
		});

		expect(result).toBeUndefined();
	});
});

describe('materializeWorkspaceBundle', () => {
	const manifestPath = `${ROOT}/bundle/.manifest.json`;
	const filePath = `${ROOT}/bundle/file.txt`;
	const bundle = {
		rootDir: `${ROOT}/bundle`,
		manifestPath,
		files: new Map([
			[filePath, 'content\n'],
			[manifestPath, stringifyWorkspaceJson({ schemaVersion: 1, contentHash: 'abc123' })],
		]),
		contentHash: 'abc123',
	};

	it('writes files when no prebaked manifest exists', async () => {
		const { workspace, writes } = createSandboxWorkspace(new Map());

		const result = await materializeWorkspaceBundle({
			workspace,
			resourceLabel: 'Test bundle file',
			loadPrebaked: async () => await Promise.resolve(undefined),
			buildBundle: () => bundle,
			materializedLogMessage: 'materialized',
			materializedLogContext: () => ({ root: ROOT }),
		});

		expect(result).toBe(bundle);
		expect(writes.has(manifestPath)).toBe(true);
	});

	it('writes manifest after payload files', async () => {
		const writeOrder: string[] = [];
		const writes = new Map<string, string>();
		const workspace: SandboxWorkspace = {
			filesystem: {
				provider: 'local',
				writeFile: vi.fn(async (path: string, content: string | Buffer) => {
					writeOrder.push(path);
					writes.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
					await Promise.resolve();
				}),
				mkdir: vi.fn(async () => await Promise.resolve()),
			},
		};

		await materializeWorkspaceBundle({
			workspace,
			resourceLabel: 'Test bundle file',
			loadPrebaked: async () => await Promise.resolve(undefined),
			buildBundle: () => bundle,
			materializedLogMessage: 'materialized',
			materializedLogContext: () => ({ root: ROOT }),
		});

		expect(writeOrder.at(-1)).toBe(manifestPath);
	});

	it('skips writes when a valid prebaked manifest exists', async () => {
		const { workspace, writes } = createSandboxWorkspace(
			new Map([
				[manifestPath, bundle.files.get(manifestPath) ?? ''],
				[filePath, 'content\n'],
			]),
		);

		const result = await materializeWorkspaceBundle({
			workspace,
			resourceLabel: 'Test bundle file',
			loadPrebaked: async () =>
				await loadPrebakedWorkspaceBundle({
					workspace,
					manifestPath,
					expectedHash: bundle.contentHash,
					hashField: 'contentHash',
					schemaVersion: 1,
					resourceLabel: 'Test bundle file',
					invalidManifestLogMessage: 'invalid',
					staleManifestLogMessage: 'stale',
					staleManifestLogKeys: { expected: 'expectedHash', actual: 'actualHash' },
					successLogMessage: 'success',
					successLogContext: () => ({ root: ROOT }),
					buildBundle: () => bundle,
				}),
			buildBundle: () => bundle,
			materializedLogMessage: 'materialized',
			materializedLogContext: () => ({ root: ROOT }),
		});

		expect(result).toBe(bundle);
		expect(writes.size).toBe(0);
	});
});
