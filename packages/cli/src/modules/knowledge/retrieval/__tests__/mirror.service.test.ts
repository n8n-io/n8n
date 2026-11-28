import type {
	CommandResult,
	SandboxProvider,
	WorkspaceFilesystem,
	WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentFile } from '../../entities';
import type { KnowledgeFileStore } from '../../files/knowledge-file-store';
import { getKnowledgeMirrorPaths } from '../../files/storage-naming';
import type { KnowledgeConsumerScope } from '../../knowledge-consumer-scope';
import type { KnowledgeSandboxHandle } from '../../knowledge-sandbox-provider';
import type { KnowledgeSandboxProviderProxy } from '../../knowledge-sandbox-provider-proxy';
import type { KnowledgeFileRepository } from '../../repositories/knowledge-file.repository';
import type {
	KnowledgeCollectionSource,
	KnowledgeCollectionSourceService,
} from '../collection-source.service';
import { KnowledgeMirrorService } from '../mirror.service';
import type { KnowledgeFileReference } from '../retrieval-schemas';

const projectId = 'project-1';
const agentId = 'agent-1';
const scope: KnowledgeConsumerScope = { kind: 'agent', projectId, agentId };
const knowledgePaths = getKnowledgeMirrorPaths('daytona');
const n8nKnowledgePaths = getKnowledgeMirrorPaths('n8n-sandbox');

type TestWorkspaceSandbox = WorkspaceSandbox & { provider: SandboxProvider } & Required<
		Pick<WorkspaceSandbox, 'executeCommand'>
	>;

function makeAgentFile(overrides: Partial<AgentFile> = {}): AgentFile {
	const id = overrides.id ?? 'file-id';
	const fileName = overrides.fileName ?? 'file.txt';
	return {
		id,
		agentId,
		storedAt: 'fs',
		storageKey: `agents/${agentId}/knowledge-files/${id}/content`,
		fileName,
		mimeType: 'text/plain',
		fileSizeBytes: 100,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	} as AgentFile;
}

function makeKnowledgeFileStore(): ReturnType<typeof mock<KnowledgeFileStore>> {
	const store = mock<KnowledgeFileStore>();
	store.readAsBuffer.mockResolvedValue(Buffer.from('mock file content'));
	return store;
}

function makeCommandResult(stdout = '', stderr = '', exitCode = 0): CommandResult {
	return {
		success: exitCode === 0,
		exitCode,
		stdout,
		stderr,
		executionTimeMs: 1,
	};
}

function makeSandbox(
	provider: SandboxProvider = 'daytona',
	id = 'sandbox-id',
): ReturnType<typeof mock<TestWorkspaceSandbox>> {
	const sandbox = mock<TestWorkspaceSandbox>({
		id,
		name: provider === 'daytona' ? 'DaytonaSandbox' : 'N8nSandboxServiceSandbox',
		provider,
		status: 'running',
	});
	sandbox.executeCommand.mockResolvedValue(makeCommandResult());
	return sandbox;
}

function makeSandboxHandle(
	sandbox: TestWorkspaceSandbox,
	filesystem: WorkspaceFilesystem,
): KnowledgeSandboxHandle {
	return {
		provider: sandbox.provider,
		sandbox,
		filesystem,
		cacheKey: `${sandbox.provider}:agent:${sandbox.id}`,
	};
}

function makeSandboxProviderProxy(
	runtime: KnowledgeSandboxHandle,
): ReturnType<typeof mock<KnowledgeSandboxProviderProxy>> {
	const provider = mock<KnowledgeSandboxProviderProxy>();
	provider.acquire.mockResolvedValue(runtime);
	provider.executeCommand.mockImplementation(
		async (sandbox, command, timeout) =>
			await (sandbox.executeCommand?.(command, [], { timeout }) ??
				Promise.reject(new Error('Command execution unavailable'))),
	);
	return provider;
}

/** Defaults to no collections, as while collections are off. */
function makeCollectionSourceService(
	source: KnowledgeCollectionSource = { collections: [], files: [] },
): ReturnType<typeof mock<KnowledgeCollectionSourceService>> {
	const service = mock<KnowledgeCollectionSourceService>();
	service.loadSearchableCollections.mockResolvedValue(source);
	return service;
}

function makeCollectionFile(
	dir: string,
	name: string,
	id: string,
	overrides: Partial<KnowledgeFileReference> = {},
): KnowledgeFileReference {
	return {
		file: `${dir}/${name}`,
		fileId: id,
		storedAt: 'fs',
		storageKey: `knowledge-collections/${dir}/files/${id}/content`,
		displayName: name,
		mimeType: 'text/plain',
		fileSizeBytes: 100,
		createdAt: '2024-02-01T00:00:00.000Z',
		...overrides,
	};
}

function makeService({
	sandboxProviderProxy,
	logger = mock<Logger>(),
	fileRepository = mock<KnowledgeFileRepository>(),
	fileStore = makeKnowledgeFileStore(),
	collectionSourceService = makeCollectionSourceService(),
}: {
	sandboxProviderProxy: KnowledgeSandboxProviderProxy;
	logger?: ReturnType<typeof mock<Logger>>;
	fileRepository?: KnowledgeFileRepository;
	fileStore?: KnowledgeFileStore;
	collectionSourceService?: KnowledgeCollectionSourceService;
}): KnowledgeMirrorService {
	logger.scoped.mockReturnValue(logger);
	return new KnowledgeMirrorService(
		{ sandboxTimeout: 300_000 } as AgentsConfig,
		logger,
		sandboxProviderProxy,
		fileRepository,
		fileStore,
		collectionSourceService,
	);
}

function isMirrorSyncCommand(command: string): boolean {
	return command.includes(`mkdir -p ${knowledgePaths.filesDir}`);
}

describe('KnowledgeMirrorService', () => {
	let sandbox: ReturnType<typeof mock<TestWorkspaceSandbox>>;
	let filesystem: ReturnType<typeof mock<WorkspaceFilesystem>>;
	let sandboxProviderProxy: ReturnType<typeof mock<KnowledgeSandboxProviderProxy>>;

	beforeEach(() => {
		vi.clearAllMocks();
		sandbox = makeSandbox();
		filesystem = mock<WorkspaceFilesystem>();
		sandboxProviderProxy = makeSandboxProviderProxy(makeSandboxHandle(sandbox, filesystem));
	});

	it('does not start a mirror sync when the consumer rejects writes', async () => {
		const assertWritable = vi.fn().mockRejectedValue(new Error('project is being deleted'));
		const logger = mock<Logger>();
		const service = makeService({ sandboxProviderProxy, logger });
		service.syncMirrorInBackground(scope, assertWritable);
		await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
		expect(sandboxProviderProxy.acquire).not.toHaveBeenCalled();
	});

	it('removes a mirror that finishes after the consumer starts to reject writes', async () => {
		const assertWritable = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('project is being deleted'));
		const fileRepository = mock<KnowledgeFileRepository>();
		fileRepository.findByAgentId.mockResolvedValue([makeAgentFile()]);
		const service = makeService({ sandboxProviderProxy, fileRepository });
		service.syncMirrorInBackground(scope, assertWritable);
		await vi.waitFor(() => expect(sandboxProviderProxy.destroy).toHaveBeenCalledWith(scope));
		expect(assertWritable).toHaveBeenCalledTimes(2);
		const syncIndex = sandbox.executeCommand.mock.calls.findIndex(([command]) =>
			isMirrorSyncCommand(command),
		);
		expect(syncIndex).toBeGreaterThanOrEqual(0);
		expect(sandbox.executeCommand.mock.invocationCallOrder[syncIndex]).toBeLessThan(
			sandboxProviderProxy.destroy.mock.invocationCallOrder[0],
		);
	});

	describe('findFiles', () => {
		const fixtureFiles = [
			makeAgentFile({ id: 'file-alpha', fileName: 'alpha.pdf' }),
			makeAgentFile({ id: 'file-bravo', fileName: 'bravo.pdf' }),
			makeAgentFile({ id: 'file-charlie', fileName: 'charlie.txt' }),
			makeAgentFile({ id: 'file-delta', fileName: 'delta.md' }),
		];

		function makeGlobService(files: AgentFile[] = fixtureFiles): KnowledgeMirrorService {
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue(files);
			return makeService({ sandboxProviderProxy, fileRepository });
		}

		it('lists all files with a catch-all pattern, sorted by display name', async () => {
			const service = makeGlobService();

			const result = await service.findFiles(scope, { pattern: '*' });

			expect(result.files.map((file) => file.displayName)).toEqual([
				'alpha.pdf',
				'bravo.pdf',
				'charlie.txt',
				'delta.md',
			]);
			expect(result.hasMore).toBe(false);
		});

		it('skips a file whose stored name cannot be a file name, with a warning, and lists the others', async () => {
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue([
				makeAgentFile({ id: 'file-bad', fileName: '..' }),
				makeAgentFile({ id: 'file-alpha', fileName: 'alpha.pdf' }),
			]);
			const logger = mock<Logger>();
			const service = makeService({ sandboxProviderProxy, fileRepository, logger });

			const result = await service.findFiles(scope, { pattern: '*' });

			expect(result.files.map((file) => file.fileId)).toEqual(['file-alpha']);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped an agent knowledge file whose name cannot be a file name',
				{ agentId: 'agent-1', fileId: 'file-bad' },
			);
		});

		it('filters by extension pattern', async () => {
			const service = makeGlobService();

			const result = await service.findFiles(scope, { pattern: '*.pdf' });

			expect(result.files.map((file) => file.displayName)).toEqual(['alpha.pdf', 'bravo.pdf']);
		});

		it('pages with offset', async () => {
			const service = makeGlobService();

			const firstPage = await service.findFiles(scope, {
				pattern: '*',
				limit: 2,
				offset: 0,
			});
			expect(firstPage.files.map((file) => file.displayName)).toEqual(['alpha.pdf', 'bravo.pdf']);
			expect(firstPage.offset).toBe(0);
			expect(firstPage.hasMore).toBe(true);

			const secondPage = await service.findFiles(scope, {
				pattern: '*',
				limit: 2,
				offset: 2,
			});
			expect(secondPage.files.map((file) => file.displayName)).toEqual(['charlie.txt', 'delta.md']);
			expect(secondPage.offset).toBe(2);
			expect(secondPage.hasMore).toBe(false);
		});

		it('matches regex metacharacters in the pattern literally', async () => {
			const service = makeGlobService([
				makeAgentFile({ id: 'file-grouped', fileName: 'report(v1).pdf' }),
				makeAgentFile({ id: 'file-plain', fileName: 'reportv1-pdf' }),
			]);

			const result = await service.findFiles(scope, {
				pattern: 'report(v1).pdf',
			});

			expect(result.files.map((file) => file.displayName)).toEqual(['report(v1).pdf']);
		});

		it('rejects unsafe patterns', async () => {
			const service = makeGlobService();

			await expect(service.findFiles(scope, { pattern: '../secrets' })).rejects.toThrow(
				'Invalid knowledge file pattern',
			);
		});

		it('propagates glob matching timeouts', async () => {
			const service = makeGlobService(
				Array.from({ length: 200 }, (_, index) =>
					makeAgentFile({
						id: `file-quarterly-${index}`,
						fileName: `quarterly-knowledge-${index}.pdf`,
					}),
				),
			);

			await expect(service.findFiles(scope, { pattern: '******Z' })).rejects.toThrow(
				'Regular expression execution timed out',
			);
		});
	});

	it('returns an empty search without acquiring a sandbox when no files exist', async () => {
		const fileRepository = mock<KnowledgeFileRepository>();
		fileRepository.findByAgentId.mockResolvedValue([]);
		const service = makeService({ sandboxProviderProxy, fileRepository });

		const result = await service.searchText(scope, { pattern: 'anything' });

		expect(result).toEqual(expect.objectContaining({ matches: [], hasMore: false }));
		expect(sandboxProviderProxy.acquire).not.toHaveBeenCalled();
	});

	describe('mirror sync', () => {
		function isManifestReadCommand(command: string): boolean {
			return command.startsWith('cat ') && command.includes('/manifest');
		}

		function makeMirrorFile(id: string, fileName: string): AgentFile {
			return makeAgentFile({ id, fileName });
		}

		function makeMirrorService({
			fileRepository,
			fileStore = makeKnowledgeFileStore(),
			logger = mock<Logger>(),
		}: {
			fileRepository: KnowledgeFileRepository;
			fileStore?: KnowledgeFileStore;
			logger?: ReturnType<typeof mock<Logger>>;
		}): KnowledgeMirrorService {
			return makeService({
				sandboxProviderProxy,
				logger,
				fileRepository,
				fileStore,
			});
		}

		it('syncs once, checks an unchanged repeat, and recopies a replaced file', async () => {
			let manifestState = '';
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(isManifestReadCommand(command) ? manifestState : ''),
			);
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			const fileStore = makeKnowledgeFileStore();
			const service = makeMirrorService({
				fileRepository,
				fileStore,
			});

			await service.searchText(scope, { pattern: 'foo' });
			let commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(1);
			// The sandbox id is derived from the project and agent ids of the scope, so the scope must arrive unchanged.
			expect(sandboxProviderProxy.acquire).toHaveBeenCalledWith({
				kind: 'agent',
				projectId,
				agentId,
			});
			expect(fileStore.readAsBuffer).toHaveBeenCalledTimes(2);
			const stagingDir = filesystem.mkdir.mock.calls[0][0];
			expect(stagingDir).toContain(`${knowledgePaths.stagingDir}/`);
			expect(filesystem.mkdir).toHaveBeenCalledWith(stagingDir, { recursive: true });
			expect(filesystem.writeFile).toHaveBeenCalledTimes(2);
			expect(filesystem.writeFile.mock.calls[0][0]).toBe(`${stagingDir}/doc1.txt`);
			expect(filesystem.writeFile.mock.calls[1][0]).toBe(`${stagingDir}/doc2.txt`);
			expect(filesystem.rmdir).toHaveBeenCalledWith(stagingDir, {
				recursive: true,
				force: true,
			});
			manifestState = 'file-1\tdoc1.txt\nfile-2\tdoc2.txt\n';

			sandbox.executeCommand.mockClear();
			fileStore.readAsBuffer.mockClear();
			filesystem.writeFile.mockClear();
			await service.searchText(scope, { pattern: 'bar' });
			commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(0);
			expect(fileStore.readAsBuffer).not.toHaveBeenCalled();
			expect(filesystem.writeFile).not.toHaveBeenCalled();

			sandbox.executeCommand.mockClear();
			fileStore.readAsBuffer.mockClear();
			filesystem.writeFile.mockClear();
			fileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1-replacement', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			await service.searchText(scope, { pattern: 'baz' });
			commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			const syncCommands = commands.filter(isMirrorSyncCommand);
			expect(syncCommands).toHaveLength(1);
			expect(fileStore.readAsBuffer).toHaveBeenCalledTimes(1);
			expect(syncCommands[0]).toContain(`${knowledgePaths.stagingDir}/`);
			expect(syncCommands[0]).toContain('/doc1.txt');
			expect(syncCommands[0]).toContain('file-1-replacement\tdoc1.txt');
		});

		it('reads mirrored knowledge through the knowledge sandbox', async () => {
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(isManifestReadCommand(command) ? 'file-id\tfile.txt\n' : '0\t1\thello\n'),
			);
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue([makeAgentFile()]);
			const service = makeMirrorService({ fileRepository });

			const result = await service.readFile(scope, { file: 'file.txt' });

			expect(result.ranges[0].text).toBe('1|hello');
			expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
		});

		it('runs a queued mirror sync with a newer file snapshot after an in-flight sync', async () => {
			let releaseFirstManifestRead!: () => void;
			const firstManifestRead = new Promise<void>((resolve) => {
				releaseFirstManifestRead = resolve;
			});
			let blockManifestRead = true;
			sandbox.executeCommand.mockImplementation(async (command) => {
				if (isManifestReadCommand(command) && blockManifestRead) {
					blockManifestRead = false;
					await firstManifestRead;
				}
				return makeCommandResult();
			});
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId
				.mockResolvedValueOnce([makeMirrorFile('file-1', 'doc1.txt')])
				.mockResolvedValueOnce([
					makeMirrorFile('file-1', 'doc1.txt'),
					makeMirrorFile('file-2', 'doc2.txt'),
				]);
			const service = makeMirrorService({ fileRepository });

			const firstSearch = service.searchText(scope, { pattern: 'first' });
			await vi.waitFor(() =>
				expect(
					sandbox.executeCommand.mock.calls.filter(([command]) => isManifestReadCommand(command)),
				).toHaveLength(1),
			);

			const secondSearch = service.searchText(scope, { pattern: 'second' });
			await new Promise((resolve) => setTimeout(resolve, 0));
			releaseFirstManifestRead();

			await Promise.all([firstSearch, secondSearch]);

			expect(filesystem.writeFile.mock.calls.map(([filePath]) => filePath)).toContainEqual(
				expect.stringMatching(/\/doc2\.txt$/),
			);
		});

		it('uses the n8n sandbox home for the knowledge mirror', async () => {
			sandbox = makeSandbox('n8n-sandbox', 'n8n-sandbox-id');
			filesystem = mock<WorkspaceFilesystem>();
			sandboxProviderProxy = makeSandboxProviderProxy(makeSandboxHandle(sandbox, filesystem));
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository });

			await service.searchText(scope, { pattern: 'foo' });

			expect(filesystem.mkdir.mock.calls[0][0]).toContain(`${n8nKnowledgePaths.stagingDir}/`);
			const searchCall = sandbox.executeCommand.mock.calls.find(([command]) =>
				command.includes(' rg '),
			);
			expect(searchCall?.[0]).toContain(`cd '\\''${n8nKnowledgePaths.filesDir}'\\''`);
		});

		it.each([
			{ provider: 'daytona', deterministicId: 'agent-kb-a54b9053-9f50-51e5-b971-e02942ff7b6b' },
			{
				provider: 'n8n-sandbox',
				deterministicId: 'a54b9053-9f50-51e5-b971-e02942ff7b6b',
			},
		] satisfies Array<{ provider: SandboxProvider; deterministicId: string }>)(
			'resyncs the mirror when a $provider sandbox is recreated under the same ID',
			async ({ provider, deterministicId }) => {
				const staleSandbox = makeSandbox(provider, deterministicId);
				const replacementSandbox = makeSandbox(provider, deterministicId);
				const staleFilesystem = mock<WorkspaceFilesystem>();
				const replacementFilesystem = mock<WorkspaceFilesystem>();
				sandboxProviderProxy.acquire
					.mockResolvedValueOnce(makeSandboxHandle(staleSandbox, staleFilesystem))
					.mockResolvedValueOnce(makeSandboxHandle(replacementSandbox, replacementFilesystem));
				const fileRepository = mock<KnowledgeFileRepository>();
				fileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
				const service = makeMirrorService({ fileRepository });

				await service.searchText(scope, { pattern: 'first' });
				await service.searchText(scope, { pattern: 'second' });

				expect(staleFilesystem.writeFile).toHaveBeenCalledOnce();
				expect(replacementFilesystem.writeFile).toHaveBeenCalledOnce();
			},
		);

		it('redacts command stderr before reporting a failed knowledge operation', async () => {
			const secret = 'Authorization: Bearer abc.def-ghi_jkl/mno=012345678901234567890123456789';
			sandbox.executeCommand.mockImplementation(async (command) =>
				command.includes(' rg ')
					? makeCommandResult('', `failed with ${secret}`, 2)
					: makeCommandResult(),
			);
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository });

			const error = await service
				.searchText(scope, { pattern: 'foo' })
				.then(() => undefined)
				.catch((cause: Error) => cause);

			expect(error?.message).toContain('[REDACTED]');
			expect(error?.message).not.toContain('abc.def');
		});

		it('propagates filesystem write failures instead of finalizing a partial mirror', async () => {
			const providerError = new Error('provider write failed');
			filesystem.writeFile.mockRejectedValue(providerError);
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository });

			await expect(service.searchText(scope, { pattern: 'foo' })).rejects.toBe(providerError);
			expect(
				sandbox.executeCommand.mock.calls.some(([command]) => isMirrorSyncCommand(command)),
			).toBe(false);
			expect(filesystem.rmdir).toHaveBeenCalledWith(filesystem.mkdir.mock.calls[0][0], {
				recursive: true,
				force: true,
			});
		});

		it('fails the operation instead of returning stale results when the sync command errors', async () => {
			sandbox.executeCommand.mockImplementation(async (command) =>
				isMirrorSyncCommand(command) ? makeCommandResult('', 'disk full', 1) : makeCommandResult(),
			);
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository });

			await expect(service.searchText(scope, { pattern: 'foo' })).rejects.toThrow(
				/Agent knowledge mirror sync failed/,
			);
		});

		it('retries a knowledge file on the next sync after its first load fails', async () => {
			sandbox.executeCommand.mockResolvedValue(makeCommandResult());
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const fileStore = makeKnowledgeFileStore();
			fileStore.readAsBuffer.mockRejectedValueOnce(new Error('missing on disk'));
			const logger = mock<Logger>();
			const service = makeMirrorService({
				fileRepository,
				fileStore,
				logger,
			});

			await expect(service.searchText(scope, { pattern: 'foo' })).resolves.toBeDefined();
			expect(filesystem.writeFile).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load agent knowledge file for mirror sync',
				expect.objectContaining({ file: 'doc1.txt' }),
			);

			await expect(service.searchText(scope, { pattern: 'bar' })).resolves.toBeDefined();
			expect(fileStore.readAsBuffer).toHaveBeenCalledTimes(2);
			expect(filesystem.writeFile).toHaveBeenCalledTimes(1);
		});

		describe('waiting times to prepare the sandbox and the mirror', () => {
			const SANDBOX_START_MS = 3000;
			const MANIFEST_READ_MS = 100;
			const MIRROR_COPY_MS = 750;
			const fullManifest = 'file-1\tdoc1.txt\n';

			let now: number;
			let manifestState: string;

			function makeWaitService(files = [makeMirrorFile('file-1', 'doc1.txt')]) {
				const agentFileRepository = mock<KnowledgeFileRepository>();
				agentFileRepository.findByAgentId.mockResolvedValue(files);
				return makeMirrorService({ fileRepository: agentFileRepository });
			}

			beforeEach(() => {
				now = 0;
				manifestState = '';
				vi.spyOn(Date, 'now').mockImplementation(() => now);
				const runtime = makeSandboxHandle(sandbox, filesystem);
				sandboxProviderProxy.acquire.mockImplementation(async () => {
					now += SANDBOX_START_MS;
					return runtime;
				});
				sandbox.executeCommand.mockImplementation(async (command) => {
					if (isManifestReadCommand(command)) {
						now += MANIFEST_READ_MS;
						return makeCommandResult(manifestState);
					}

					if (isMirrorSyncCommand(command)) {
						now += MIRROR_COPY_MS;
						manifestState = fullManifest;
					}

					return makeCommandResult();
				});
			});

			afterEach(() => {
				vi.restoreAllMocks();
			});

			it('reports the sandbox wait and the full mirror wait when files are copied', async () => {
				const onPreparationWait = vi.fn();
				const service = makeWaitService();

				await service.searchText(scope, { pattern: 'foo' }, { onPreparationWait });

				expect(onPreparationWait).toHaveBeenCalledExactlyOnceWith({
					sandboxWaitMs: SANDBOX_START_MS,
					mirrorWaitMs: MANIFEST_READ_MS + MIRROR_COPY_MS,
				});
			});

			it('reports a mirror wait of 0 when the mirror is already up to date', async () => {
				manifestState = fullManifest;
				const onPreparationWait = vi.fn();
				const service = makeWaitService();

				await service.readFile(scope, { file: 'doc1.txt' }, { onPreparationWait });

				expect(onPreparationWait).toHaveBeenCalledExactlyOnceWith({
					sandboxWaitMs: SANDBOX_START_MS,
					mirrorWaitMs: 0,
				});
			});

			it('counts a sync that only deletes files as a mirror wait', async () => {
				manifestState = `${fullManifest}file-2\told.txt\n`;
				const onPreparationWait = vi.fn();
				const service = makeWaitService();

				await service.searchText(scope, { pattern: 'foo' }, { onPreparationWait });

				expect(onPreparationWait).toHaveBeenCalledExactlyOnceWith({
					sandboxWaitMs: SANDBOX_START_MS,
					mirrorWaitMs: MANIFEST_READ_MS + MIRROR_COPY_MS,
				});
			});

			it('reports only the rest of a background copy that is in progress', async () => {
				sandboxProviderProxy.acquire.mockResolvedValue(makeSandboxHandle(sandbox, filesystem));
				let releaseManifestRead!: () => void;
				const blockedManifestRead = new Promise<void>((resolve) => {
					releaseManifestRead = resolve;
				});
				let blockNextManifestRead = true;
				sandbox.executeCommand.mockImplementation(async (command) => {
					if (isManifestReadCommand(command)) {
						now += MANIFEST_READ_MS;
						if (blockNextManifestRead) {
							blockNextManifestRead = false;
							await blockedManifestRead;
						}

						return makeCommandResult(manifestState);
					}

					if (isMirrorSyncCommand(command)) {
						now += MIRROR_COPY_MS;
						manifestState = fullManifest;
					}

					return makeCommandResult();
				});
				const onPreparationWait = vi.fn();
				const service = makeWaitService();

				service.syncMirrorInBackground(scope, async () => {});
				await vi.waitFor(() => expect(sandbox.executeCommand).toHaveBeenCalledOnce());
				// The background copy has run for a while before the search starts.
				now += 400;
				const search = service.searchText(scope, { pattern: 'foo' }, { onPreparationWait });
				await vi.waitFor(() => expect(sandboxProviderProxy.acquire).toHaveBeenCalledTimes(2));
				await new Promise((resolve) => setTimeout(resolve, 0));
				now += 200;
				releaseManifestRead();
				await search;

				// The search waits 200 ms, then the background copy, then its own manifest check.
				expect(onPreparationWait).toHaveBeenCalledExactlyOnceWith({
					sandboxWaitMs: 0,
					mirrorWaitMs: 200 + MIRROR_COPY_MS + MANIFEST_READ_MS,
				});
			});

			it('reports the sandbox wait when the sandbox does not start', async () => {
				const startError = new Error('sandbox unavailable');
				sandboxProviderProxy.acquire.mockImplementation(async () => {
					now += SANDBOX_START_MS;
					throw startError;
				});
				const onPreparationWait = vi.fn();
				const service = makeWaitService();

				await expect(
					service.searchText(scope, { pattern: 'foo' }, { onPreparationWait }),
				).rejects.toBe(startError);

				expect(onPreparationWait).toHaveBeenCalledExactlyOnceWith({
					sandboxWaitMs: SANDBOX_START_MS,
					mirrorWaitMs: 0,
				});
			});

			it('reports the mirror wait when the copy fails', async () => {
				sandbox.executeCommand.mockImplementation(async (command) => {
					if (isManifestReadCommand(command)) {
						now += MANIFEST_READ_MS;
						return makeCommandResult();
					}

					if (isMirrorSyncCommand(command)) {
						now += MIRROR_COPY_MS;
						return makeCommandResult('', 'disk full', 1);
					}

					return makeCommandResult();
				});
				const onPreparationWait = vi.fn();
				const service = makeWaitService();

				await expect(
					service.searchText(scope, { pattern: 'foo' }, { onPreparationWait }),
				).rejects.toThrow(/Agent knowledge mirror sync failed/);

				expect(onPreparationWait).toHaveBeenCalledExactlyOnceWith({
					sandboxWaitMs: SANDBOX_START_MS,
					mirrorWaitMs: MANIFEST_READ_MS + MIRROR_COPY_MS,
				});
			});

			it('does not report a wait when the call ends before the sandbox step', async () => {
				const onPreparationWait = vi.fn();

				await makeWaitService([]).searchText(scope, { pattern: 'foo' }, { onPreparationWait });
				await expect(
					makeWaitService().readFile(scope, { file: 'missing.txt' }, { onPreparationWait }),
				).rejects.toThrow();

				expect(onPreparationWait).not.toHaveBeenCalled();
			});
		});
	});

	describe('collections', () => {
		const handbook = {
			dir: 'handbook',
			name: 'Employee handbook',
			description: 'Company policies',
			fileCount: 2,
		};
		const docs = { dir: 'docs', name: 'Product docs', description: null, fileCount: 1 };
		const collectionFiles = [
			makeCollectionFile('handbook', 'leave.txt', 'file-leave'),
			makeCollectionFile('handbook', 'expenses.txt', 'file-expenses'),
			makeCollectionFile('docs', 'api.txt', 'file-api'),
		];

		function isManifestReadCommand(command: string): boolean {
			return command.startsWith('cat ') && command.includes('/manifest');
		}

		function makeCollectionService({
			ownFiles = [makeAgentFile({ id: 'file-own', fileName: 'own.txt' })],
			source = { collections: [handbook, docs], files: collectionFiles },
			fileStore = makeKnowledgeFileStore(),
		}: {
			ownFiles?: AgentFile[];
			source?: KnowledgeCollectionSource;
			fileStore?: KnowledgeFileStore;
		} = {}): KnowledgeMirrorService {
			const fileRepository = mock<KnowledgeFileRepository>();
			fileRepository.findByAgentId.mockResolvedValue(ownFiles);
			return makeService({
				sandboxProviderProxy,
				fileRepository,
				fileStore,
				collectionSourceService: makeCollectionSourceService(source),
			});
		}

		it('lists the files of the collections next to the own files, with the catalog', async () => {
			const service = makeCollectionService();

			const result = await service.findFiles(scope, { pattern: '*' });

			expect(result.files.map((file) => file.file)).toEqual([
				'docs/api.txt',
				'handbook/expenses.txt',
				'handbook/leave.txt',
				'own.txt',
			]);
			expect(result.collections).toEqual([handbook, docs]);
		});

		it('lists the catalog on the first page only', async () => {
			const service = makeCollectionService();

			const secondPage = await service.findFiles(scope, { pattern: '*', limit: 2, offset: 2 });

			expect(secondPage.files.map((file) => file.file)).toEqual(['handbook/leave.txt', 'own.txt']);
			expect(secondPage).not.toHaveProperty('collections');
		});

		it('lists the files of one collection with a directory pattern', async () => {
			const service = makeCollectionService();

			const result = await service.findFiles(scope, { pattern: 'handbook/*' });

			expect(result.files.map((file) => file.file)).toEqual([
				'handbook/expenses.txt',
				'handbook/leave.txt',
			]);
		});

		it('lists the catalog of an agent whose only collection has no files', async () => {
			const service = makeCollectionService({
				ownFiles: [],
				source: { collections: [{ ...docs, fileCount: 0 }], files: [] },
			});

			const result = await service.findFiles(scope, { pattern: '*' });

			expect(result).toEqual({
				files: [],
				limit: 20,
				offset: 0,
				hasMore: false,
				collections: [{ ...docs, fileCount: 0 }],
			});
		});

		it('leaves the catalog out of the result of an agent without collections', async () => {
			const service = makeCollectionService({ source: { collections: [], files: [] } });

			const result = await service.findFiles(scope, { pattern: '*' });

			expect(result).not.toHaveProperty('collections');
		});

		it('mirrors the files of a collection in the directory of the collection', async () => {
			let manifestState = '';
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(isManifestReadCommand(command) ? manifestState : ''),
			);
			const fileStore = makeKnowledgeFileStore();
			const service = makeCollectionService({ fileStore });

			await service.searchText(scope, { pattern: 'foo' });

			const stagingDir = filesystem.mkdir.mock.calls[0][0];
			expect(filesystem.mkdir.mock.calls.map(([path]) => path)).toEqual([
				stagingDir,
				`${stagingDir}/handbook`,
				`${stagingDir}/docs`,
			]);
			expect(filesystem.writeFile.mock.calls.map(([path]) => path)).toEqual([
				`${stagingDir}/own.txt`,
				`${stagingDir}/handbook/leave.txt`,
				`${stagingDir}/handbook/expenses.txt`,
				`${stagingDir}/docs/api.txt`,
			]);
			expect(fileStore.readAsBuffer).toHaveBeenCalledWith({
				storedAt: 'fs',
				storageKey: 'knowledge-collections/handbook/files/file-leave/content',
			});
			const syncCommand = sandbox.executeCommand.mock.calls
				.map(([command]) => command)
				.find(isMirrorSyncCommand);
			expect(syncCommand).toContain(`${knowledgePaths.filesDir}/handbook`);
			expect(syncCommand).toContain(`${knowledgePaths.filesDir}/docs`);
			expect(syncCommand).toContain('file-leave\thandbook/leave.txt');
			expect(syncCommand).toContain('file-own\town.txt');

			// An unchanged repeat reads the manifest and copies nothing.
			manifestState =
				'file-own\town.txt\nfile-leave\thandbook/leave.txt\nfile-expenses\thandbook/expenses.txt\nfile-api\tdocs/api.txt\n';
			filesystem.writeFile.mockClear();
			sandbox.executeCommand.mockClear();

			await service.searchText(scope, { pattern: 'foo' });

			expect(filesystem.writeFile).not.toHaveBeenCalled();
			expect(sandbox.executeCommand.mock.calls.map(([command]) => command)).not.toContainEqual(
				expect.stringContaining(`mkdir -p ${knowledgePaths.filesDir}`),
			);
		});

		it('removes the files of a collection that the agent no longer uses on the next sync', async () => {
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(
					isManifestReadCommand(command)
						? 'file-own\town.txt\nfile-leave\thandbook/leave.txt\nfile-api\tdocs/api.txt\n'
						: '',
				),
			);
			const service = makeCollectionService({
				source: { collections: [docs], files: [makeCollectionFile('docs', 'api.txt', 'file-api')] },
			});

			await service.searchText(scope, { pattern: 'foo' });

			expect(filesystem.writeFile).not.toHaveBeenCalled();
			const syncCommand = sandbox.executeCommand.mock.calls
				.map(([command]) => command)
				.find(isMirrorSyncCommand);
			expect(syncCommand).toContain(
				`rm -f '\\''${knowledgePaths.filesDir}/handbook/leave.txt'\\''`,
			);
			expect(syncCommand).toContain(`rmdir '\\''${knowledgePaths.filesDir}/handbook'\\''`);
			expect(syncCommand).not.toContain('handbook/leave.txt\n');
			expect(syncCommand).toContain('file-api\tdocs/api.txt');
		});

		it('searches and reads a collection file by its directory path, and maps the result back to it', async () => {
			const rgMatch = JSON.stringify({
				type: 'match',
				data: {
					path: { text: './handbook/leave.txt' },
					lines: { text: 'ten days of leave\n' },
					line_number: 3,
				},
			});
			sandbox.executeCommand.mockImplementation(async (command) => {
				if (isManifestReadCommand(command)) return makeCommandResult('');
				if (command.includes(' rg ')) return makeCommandResult(`${rgMatch}\n`);
				if (command.includes('awk ')) return makeCommandResult('0\t3\tten days of leave\n');
				return makeCommandResult();
			});
			const service = makeCollectionService();

			const searchResult = await service.searchText(scope, {
				pattern: 'leave',
				path: ['handbook/leave.txt'],
			});
			const readResult = await service.readFile(scope, { file: 'handbook/leave.txt' });
			const readByIdResult = await service.readFile(scope, { fileId: 'file-leave' });

			const searchCommand = sandbox.executeCommand.mock.calls
				.map(([command]) => command)
				.find((command) => command.includes(' rg '));
			expect(searchCommand).toContain("-- '\\''./handbook/leave.txt'\\''");
			expect(searchResult).toEqual(
				expect.objectContaining({
					matches: [
						expect.objectContaining({
							file: 'handbook/leave.txt',
							fileId: 'file-leave',
							displayName: 'leave.txt',
							lineNumber: 3,
						}),
					],
				}),
			);
			expect(readResult).toEqual(
				expect.objectContaining({ file: 'handbook/leave.txt', fileId: 'file-leave' }),
			);
			expect(readByIdResult.file).toBe('handbook/leave.txt');
		});

		it('searches one collection when its directory is a path value, next to file paths', async () => {
			const service = makeCollectionService();

			await service.searchText(scope, { pattern: 'leave', path: ['handbook', 'own.txt'] });

			const searchCommand = sandbox.executeCommand.mock.calls
				.map(([command]) => command)
				.find((command) => command.includes(' rg '));
			expect(searchCommand).toContain("-- '\\''./handbook'\\'' '\\''./own.txt'\\''");
		});

		it('accepts a collection directory with a trailing slash', async () => {
			const service = makeCollectionService();

			await service.searchText(scope, { pattern: 'leave', path: ['handbook/'] });

			const searchCommand = sandbox.executeCommand.mock.calls
				.map(([command]) => command)
				.find((command) => command.includes(' rg '));
			expect(searchCommand).toContain("-- '\\''./handbook'\\''");
		});

		it('searches a file once when its collection directory is also a path value', async () => {
			const service = makeCollectionService();

			await service.searchText(scope, {
				pattern: 'leave',
				path: ['handbook/leave.txt', 'handbook', 'own.txt'],
			});

			const searchCommand = sandbox.executeCommand.mock.calls
				.map(([command]) => command)
				.find((command) => command.includes(' rg '));
			expect(searchCommand).toContain("-- '\\''./handbook'\\'' '\\''./own.txt'\\''");
			expect(searchCommand).not.toContain('./handbook/leave.txt');
		});

		it('finds nothing in a collection without files, without a sandbox command', async () => {
			const service = makeCollectionService({
				source: { collections: [{ ...docs, fileCount: 0 }], files: [] },
			});

			const result = await service.searchText(scope, { pattern: 'leave', path: ['docs'] });

			expect(result).toEqual(expect.objectContaining({ matches: [], hasMore: false }));
			expect(sandboxProviderProxy.acquire).not.toHaveBeenCalled();
		});

		it('rejects a path that is neither a file nor a collection directory', async () => {
			const service = makeCollectionService();

			await expect(
				service.searchText(scope, { pattern: 'leave', path: ['unknown'] }),
			).rejects.toThrow('Knowledge file not found');
		});

		it('does not read a file by the directory of its collection', async () => {
			const service = makeCollectionService();

			await expect(service.readFile(scope, { file: 'handbook' })).rejects.toThrow(
				'Knowledge file not found',
			);
		});
	});
});
