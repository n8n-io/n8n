import {
	loadPrebakedWorkspaceBundle,
	materializeWorkspaceBundle,
	type VerifiedWorkspaceBundles,
} from '../prebaked-workspace-bundle';
import type { SandboxWorkspace } from '../sandbox-fs';
import { stringifyWorkspaceJson } from '../workspace-file-content';

const ROOT = '/home/daytona/workspace';

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never;

function createSandboxWorkspace(files: Map<string, string>) {
	const writes = new Map<string, string>();
	const writeFile = vi.fn(async (path: string, content: string | Buffer) => {
		writes.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
		await Promise.resolve();
	});
	const executeCommand = vi.fn(async (command: string) => {
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
	});
	const workspace: SandboxWorkspace = {
		filesystem: {
			provider: 'local',
			writeFile,
			mkdir: vi.fn(async () => await Promise.resolve()),
		},
		sandbox: { executeCommand },
	};

	return { workspace, writes, writeFile, executeCommand };
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

	it('trusts a matching manifest without a read of each payload file', async () => {
		const { workspace, executeCommand } = createSandboxWorkspace(
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

		expect(result).toBe(bundle);
		expect(executeCommand).toHaveBeenCalledTimes(1);
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

describe('prebaked bundle checks with verified bundles', () => {
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

	function readPaths(executeCommand: ReturnType<typeof createSandboxWorkspace>['executeCommand']) {
		return executeCommand.mock.calls.flatMap(([command]) => {
			const match = /^cat '([^']+)' 2>\/dev\/null$/.exec(command);
			return match ? [match[1]] : [];
		});
	}

	async function materialize(
		workspace: SandboxWorkspace,
		verifiedBundles: VerifiedWorkspaceBundles,
	) {
		return await materializeWorkspaceBundle({
			logger: mockLogger,
			workspace,
			verifiedBundles,
			resourceLabel: 'Test bundle file',
			loadPrebaked: async () =>
				await loadPrebakedWorkspaceBundle({
					logger: mockLogger,
					workspace,
					verifiedBundles,
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

	it('reads only the manifest when the manifest hash matches', async () => {
		const { workspace, writes, executeCommand } = createSandboxWorkspace(new Map(bundle.files));
		const verifiedBundles: VerifiedWorkspaceBundles = new Map();

		await expect(materialize(workspace, verifiedBundles)).resolves.toBe(bundle);

		expect(readPaths(executeCommand)).toEqual([manifestPath]);
		expect(writes.size).toBe(0);
		expect(verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('makes no sandbox reads after the bundle is verified for the sandbox', async () => {
		const { workspace, executeCommand } = createSandboxWorkspace(new Map(bundle.files));
		const verifiedBundles: VerifiedWorkspaceBundles = new Map();
		await materialize(workspace, verifiedBundles);
		executeCommand.mockClear();

		await expect(materialize(workspace, verifiedBundles)).resolves.toBe(bundle);

		expect(readPaths(executeCommand)).toEqual([]);
	});

	it('checks the sandbox again when the expected hash changes', async () => {
		const { workspace, writes, executeCommand } = createSandboxWorkspace(new Map(bundle.files));
		const verifiedBundles: VerifiedWorkspaceBundles = new Map([[manifestPath, 'older-hash']]);

		await materialize(workspace, verifiedBundles);

		expect(readPaths(executeCommand)).toEqual([manifestPath]);
		expect(writes.size).toBe(0);
		expect(verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('writes the bundle again when the manifest is stale', async () => {
		const { workspace, writes } = createSandboxWorkspace(
			new Map([
				...filePaths.map((path): [string, string] => [path, 'old\n']),
				[manifestPath, stringifyWorkspaceJson({ schemaVersion: 1, contentHash: 'stale' })],
			]),
		);
		const verifiedBundles: VerifiedWorkspaceBundles = new Map();

		await materialize(workspace, verifiedBundles);

		expect([...writes.keys()].sort()).toEqual([manifestPath, ...filePaths].sort());
		expect(verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('writes the bundle again when the manifest is missing', async () => {
		const { workspace, writes } = createSandboxWorkspace(new Map());
		const verifiedBundles: VerifiedWorkspaceBundles = new Map();

		await materialize(workspace, verifiedBundles);

		expect([...writes.keys()].sort()).toEqual([manifestPath, ...filePaths].sort());
		expect(verifiedBundles.get(manifestPath)).toBe(bundle.contentHash);
	});

	it('does not record the bundle when a write fails', async () => {
		const { workspace, writeFile, executeCommand } = createSandboxWorkspace(new Map());
		writeFile.mockRejectedValue(new Error('disk full'));
		executeCommand.mockResolvedValue({
			exitCode: 1,
			stdout: '',
			stderr: 'disk full',
		});
		const verifiedBundles: VerifiedWorkspaceBundles = new Map();

		await expect(materialize(workspace, verifiedBundles)).rejects.toThrow();

		expect(verifiedBundles.size).toBe(0);
	});
});
