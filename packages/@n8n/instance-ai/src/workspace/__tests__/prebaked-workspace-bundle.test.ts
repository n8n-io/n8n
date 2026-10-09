import {
	loadPrebakedWorkspaceBundle,
	materializeWorkspaceBundle,
	type WorkspaceBundleState,
} from '../prebaked-workspace-bundle';
import type { SandboxWorkspace } from '../sandbox-fs';
import { stringifyWorkspaceJson } from '../workspace-file-content';

const ROOT = '/home/daytona/workspace';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never;

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
			logger: mockLogger,
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
			logger: mockLogger,
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
			logger: mockLogger,
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
			logger: mockLogger,
			workspace,
			resourceLabel: 'Test bundle file',
			loadPrebaked: async () => await Promise.resolve(undefined),
			buildBundle: () => bundle,
			bundleHash: (built) => built.contentHash,
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
			logger: mockLogger,
			workspace,
			resourceLabel: 'Test bundle file',
			loadPrebaked: async () => await Promise.resolve(undefined),
			buildBundle: () => bundle,
			bundleHash: (built) => built.contentHash,
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
			logger: mockLogger,
			workspace,
			resourceLabel: 'Test bundle file',
			loadPrebaked: async () =>
				await loadPrebakedWorkspaceBundle({
					logger: mockLogger,
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
			bundleHash: (built) => built.contentHash,
			materializedLogMessage: 'materialized',
			materializedLogContext: () => ({ root: ROOT }),
		});

		expect(result).toBe(bundle);
		expect(writes.size).toBe(0);
	});
});

describe('prebaked bundle checks with sandbox bundle state', () => {
	const manifestPath = `${ROOT}/bundle/.manifest.json`;
	const filePaths = [`${ROOT}/bundle/a.txt`, `${ROOT}/bundle/b.txt`];
	const manifest = stringifyWorkspaceJson({ schemaVersion: 1, contentHash: 'abc123' });
	const bundle = {
		rootDir: `${ROOT}/bundle`,
		manifestPath,
		files: new Map([
			...filePaths.map((path): [string, string] => [path, 'content\n']),
			[manifestPath, manifest],
		]),
		contentHash: 'abc123',
	};

	function createBundleState(trustManifest: boolean): WorkspaceBundleState {
		return { trustManifest, verifiedBundles: new Map() };
	}

	function readPaths(workspace: SandboxWorkspace): string[] {
		const executeCommand = workspace.sandbox?.executeCommand as ReturnType<typeof vi.fn>;
		return executeCommand.mock.calls.flatMap(([command]) => {
			const match = /^cat '([^']+)' 2>\/dev\/null$/.exec(String(command));
			return match ? [match[1]] : [];
		});
	}

	async function materialize(workspace: SandboxWorkspace, bundleState: WorkspaceBundleState) {
		return await materializeWorkspaceBundle({
			logger: mockLogger,
			workspace,
			bundleState,
			resourceLabel: 'Test bundle file',
			loadPrebaked: async () =>
				await loadPrebakedWorkspaceBundle({
					logger: mockLogger,
					workspace,
					bundleState,
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
			bundleHash: (built) => built.contentHash,
			materializedLogMessage: 'materialized',
			materializedLogContext: () => ({ root: ROOT }),
		});
	}

	it('reads only the manifest when the sandbox trusts a matching manifest', async () => {
		const { workspace, writes } = createSandboxWorkspace(new Map(bundle.files));
		const bundleState = createBundleState(true);

		await expect(materialize(workspace, bundleState)).resolves.toBe(bundle);

		expect(readPaths(workspace)).toEqual([manifestPath]);
		expect(writes.size).toBe(0);
		expect(bundleState.verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('reads every bundle file when the sandbox does not trust the manifest', async () => {
		const { workspace, writes } = createSandboxWorkspace(new Map(bundle.files));
		const bundleState = createBundleState(false);

		await expect(materialize(workspace, bundleState)).resolves.toBe(bundle);

		expect(readPaths(workspace).sort()).toEqual([manifestPath, ...filePaths].sort());
		expect(writes.size).toBe(0);
	});

	it('makes no sandbox reads after the bundle is verified for the sandbox', async () => {
		const { workspace } = createSandboxWorkspace(new Map(bundle.files));
		const bundleState = createBundleState(false);
		await materialize(workspace, bundleState);
		(workspace.sandbox?.executeCommand as ReturnType<typeof vi.fn>).mockClear();

		await expect(materialize(workspace, bundleState)).resolves.toBe(bundle);

		expect(readPaths(workspace)).toEqual([]);
	});

	it('checks the sandbox again when the expected hash changes', async () => {
		const { workspace, writes } = createSandboxWorkspace(new Map(bundle.files));
		const bundleState = createBundleState(true);
		bundleState.verifiedBundles.set(manifestPath, 'older-hash');

		await materialize(workspace, bundleState);

		expect(readPaths(workspace)).toEqual([manifestPath]);
		expect(writes.size).toBe(0);
		expect(bundleState.verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('writes the bundle again when a trusted sandbox has a stale manifest', async () => {
		const { workspace, writes } = createSandboxWorkspace(
			new Map([
				...filePaths.map((path): [string, string] => [path, 'old\n']),
				[manifestPath, stringifyWorkspaceJson({ schemaVersion: 1, contentHash: 'stale' })],
			]),
		);
		const bundleState = createBundleState(true);

		await materialize(workspace, bundleState);

		expect([...writes.keys()].sort()).toEqual([manifestPath, ...filePaths].sort());
		expect(bundleState.verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('writes the bundle again when a trusted sandbox has no manifest', async () => {
		const { workspace, writes } = createSandboxWorkspace(new Map());
		const bundleState = createBundleState(true);

		await materialize(workspace, bundleState);

		expect([...writes.keys()].sort()).toEqual([manifestPath, ...filePaths].sort());
		expect(bundleState.verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('restores a missing file when the sandbox does not trust the manifest', async () => {
		const { workspace, writes } = createSandboxWorkspace(
			new Map([
				[filePaths[0], 'content\n'],
				[manifestPath, manifest],
			]),
		);
		const bundleState = createBundleState(false);

		await materialize(workspace, bundleState);

		expect(writes.get(filePaths[1])).toBe('content\n');
		expect(bundleState.verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('does not record the bundle when a write fails', async () => {
		const { workspace } = createSandboxWorkspace(new Map());
		const writeFile = workspace.filesystem?.writeFile as ReturnType<typeof vi.fn>;
		writeFile.mockRejectedValue(new Error('disk full'));
		(workspace.sandbox?.executeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
			exitCode: 1,
			stdout: '',
			stderr: 'disk full',
		});
		const bundleState = createBundleState(true);

		await expect(materialize(workspace, bundleState)).rejects.toThrow();

		expect(bundleState.verifiedBundles.size).toBe(0);
	});
});
