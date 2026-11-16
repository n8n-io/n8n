import type {
	CommandResult,
	SandboxProvider,
	WorkspaceFilesystem,
	WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { KnowledgeFile } from '../../entities/knowledge-file.entity';
import type { KnowledgeFileStore } from '../../files/knowledge-file-store';
import { getKnowledgePaths } from '../../files/storage-naming';
import type { KnowledgeConsumerScope } from '../../knowledge-consumer-scope';
import type { KnowledgeSandboxHandle } from '../../knowledge-sandbox-provider';
import type { KnowledgeSandboxProviderRegistry } from '../../knowledge-sandbox-provider-registry';
import type { KnowledgeFileRepository } from '../../repositories/knowledge-file.repository';
import { KnowledgeMirrorService } from '../mirror.service';

const projectId = 'project-1';
const agentId = 'agent-1';
const scope: KnowledgeConsumerScope = { kind: 'agent', projectId, agentId };
const knowledgePaths = getKnowledgePaths('daytona');
const n8nKnowledgePaths = getKnowledgePaths('n8n-sandbox');

type TestWorkspaceSandbox = WorkspaceSandbox & { provider: SandboxProvider } & Required<
		Pick<WorkspaceSandbox, 'executeCommand'>
	>;

function makeAgentFile(overrides: Partial<KnowledgeFile> = {}): KnowledgeFile {
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
	} as KnowledgeFile;
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

function makeRuntime(
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

function makeSandboxProvider(
	runtime: KnowledgeSandboxHandle,
): ReturnType<typeof mock<KnowledgeSandboxProviderRegistry>> {
	const provider = mock<KnowledgeSandboxProviderRegistry>();
	provider.acquire.mockResolvedValue(runtime);
	provider.executeCommand.mockImplementation(
		async (sandbox, command, timeout) =>
			await (sandbox.executeCommand?.(command, [], { timeout }) ??
				Promise.reject(new Error('Command execution unavailable'))),
	);
	return provider;
}

function makeService({
	sandboxProvider,
	logger = mock<Logger>(),
	agentFileRepository = mock<KnowledgeFileRepository>(),
	agentKnowledgeFileStore = makeKnowledgeFileStore(),
}: {
	sandboxProvider: KnowledgeSandboxProviderRegistry;
	logger?: ReturnType<typeof mock<Logger>>;
	agentFileRepository?: KnowledgeFileRepository;
	agentKnowledgeFileStore?: KnowledgeFileStore;
}): KnowledgeMirrorService {
	logger.scoped.mockReturnValue(logger);
	return new KnowledgeMirrorService(
		{ sandboxTimeout: 300_000 } as AgentsConfig,
		logger,
		sandboxProvider,
		agentFileRepository,
		agentKnowledgeFileStore,
	);
}

function isMirrorSyncCommand(command: string): boolean {
	return command.includes(`mkdir -p ${knowledgePaths.filesDir}`);
}

describe('KnowledgeMirrorService', () => {
	let sandbox: ReturnType<typeof mock<TestWorkspaceSandbox>>;
	let filesystem: ReturnType<typeof mock<WorkspaceFilesystem>>;
	let sandboxProvider: ReturnType<typeof mock<KnowledgeSandboxProviderRegistry>>;

	beforeEach(() => {
		vi.clearAllMocks();
		sandbox = makeSandbox();
		filesystem = mock<WorkspaceFilesystem>();
		sandboxProvider = makeSandboxProvider(makeRuntime(sandbox, filesystem));
	});

	it('does not start a mirror sync when the consumer rejects writes', async () => {
		const assertWritable = vi.fn().mockRejectedValue(new Error('project is being deleted'));
		const logger = mock<Logger>();
		const service = makeService({ sandboxProvider, logger });
		service.prewarmMirrorInBackground(scope, assertWritable);
		await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
		expect(sandboxProvider.acquire).not.toHaveBeenCalled();
	});

	it('removes a mirror that finishes after the consumer starts to reject writes', async () => {
		const assertWritable = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('project is being deleted'));
		const agentFileRepository = mock<KnowledgeFileRepository>();
		agentFileRepository.findByAgentId.mockResolvedValue([makeAgentFile()]);
		const service = makeService({ sandboxProvider, agentFileRepository });
		service.prewarmMirrorInBackground(scope, assertWritable);
		await vi.waitFor(() => expect(sandboxProvider.destroy).toHaveBeenCalledWith(scope));
		expect(assertWritable).toHaveBeenCalledTimes(2);
		const syncIndex = sandbox.executeCommand.mock.calls.findIndex(([command]) =>
			isMirrorSyncCommand(command),
		);
		expect(syncIndex).toBeGreaterThanOrEqual(0);
		expect(sandbox.executeCommand.mock.invocationCallOrder[syncIndex]).toBeLessThan(
			sandboxProvider.destroy.mock.invocationCallOrder[0],
		);
	});

	describe('globKnowledgeFiles', () => {
		const fixtureFiles = [
			makeAgentFile({ id: 'file-alpha', fileName: 'alpha.pdf' }),
			makeAgentFile({ id: 'file-bravo', fileName: 'bravo.pdf' }),
			makeAgentFile({ id: 'file-charlie', fileName: 'charlie.txt' }),
			makeAgentFile({ id: 'file-delta', fileName: 'delta.md' }),
		];

		function makeGlobService(files: KnowledgeFile[] = fixtureFiles): KnowledgeMirrorService {
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue(files);
			return makeService({ sandboxProvider, agentFileRepository });
		}

		it('lists all files with a catch-all pattern, sorted by display name', async () => {
			const service = makeGlobService();

			const result = await service.globKnowledgeFiles(scope, { pattern: '*' });

			expect(result.files.map((file) => file.displayName)).toEqual([
				'alpha.pdf',
				'bravo.pdf',
				'charlie.txt',
				'delta.md',
			]);
			expect(result.hasMore).toBe(false);
		});

		it('filters by extension pattern', async () => {
			const service = makeGlobService();

			const result = await service.globKnowledgeFiles(scope, { pattern: '*.pdf' });

			expect(result.files.map((file) => file.displayName)).toEqual(['alpha.pdf', 'bravo.pdf']);
		});

		it('pages with offset', async () => {
			const service = makeGlobService();

			const firstPage = await service.globKnowledgeFiles(scope, {
				pattern: '*',
				limit: 2,
				offset: 0,
			});
			expect(firstPage.files.map((file) => file.displayName)).toEqual(['alpha.pdf', 'bravo.pdf']);
			expect(firstPage.offset).toBe(0);
			expect(firstPage.hasMore).toBe(true);

			const secondPage = await service.globKnowledgeFiles(scope, {
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

			const result = await service.globKnowledgeFiles(scope, {
				pattern: 'report(v1).pdf',
			});

			expect(result.files.map((file) => file.displayName)).toEqual(['report(v1).pdf']);
		});

		it('rejects unsafe patterns', async () => {
			const service = makeGlobService();

			await expect(service.globKnowledgeFiles(scope, { pattern: '../secrets' })).rejects.toThrow(
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

			await expect(service.globKnowledgeFiles(scope, { pattern: '******Z' })).rejects.toThrow(
				'Regular expression execution timed out',
			);
		});
	});

	it('returns an empty search without acquiring a sandbox when no files exist', async () => {
		const agentFileRepository = mock<KnowledgeFileRepository>();
		agentFileRepository.findByAgentId.mockResolvedValue([]);
		const service = makeService({ sandboxProvider, agentFileRepository });

		const result = await service.searchKnowledge(scope, { pattern: 'anything' });

		expect(result).toEqual(expect.objectContaining({ matches: [], hasMore: false }));
		expect(sandboxProvider.acquire).not.toHaveBeenCalled();
	});

	describe('mirror sync', () => {
		function isManifestReadCommand(command: string): boolean {
			return command.startsWith('cat ') && command.includes('/manifest');
		}

		function makeMirrorFile(id: string, fileName: string): KnowledgeFile {
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
				sandboxProvider,
				logger,
				agentFileRepository: fileRepository,
				agentKnowledgeFileStore: fileStore,
			});
		}

		it('syncs once, checks an unchanged repeat, and recopies a replaced file', async () => {
			let manifestState = '';
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(isManifestReadCommand(command) ? manifestState : ''),
			);
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			const agentKnowledgeFileStore = makeKnowledgeFileStore();
			const service = makeMirrorService({
				fileRepository: agentFileRepository,
				fileStore: agentKnowledgeFileStore,
			});

			await service.searchKnowledge(scope, { pattern: 'foo' });
			let commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(1);
			// The sandbox id is derived from the project and agent ids of the scope, so the scope must arrive unchanged.
			expect(sandboxProvider.acquire).toHaveBeenCalledWith({ kind: 'agent', projectId, agentId });
			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(2);
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
			agentKnowledgeFileStore.readAsBuffer.mockClear();
			filesystem.writeFile.mockClear();
			await service.searchKnowledge(scope, { pattern: 'bar' });
			commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(0);
			expect(agentKnowledgeFileStore.readAsBuffer).not.toHaveBeenCalled();
			expect(filesystem.writeFile).not.toHaveBeenCalled();

			sandbox.executeCommand.mockClear();
			agentKnowledgeFileStore.readAsBuffer.mockClear();
			filesystem.writeFile.mockClear();
			agentFileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1-replacement', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			await service.searchKnowledge(scope, { pattern: 'baz' });
			commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			const syncCommands = commands.filter(isMirrorSyncCommand);
			expect(syncCommands).toHaveLength(1);
			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(1);
			expect(syncCommands[0]).toContain(`${knowledgePaths.stagingDir}/`);
			expect(syncCommands[0]).toContain('/doc1.txt');
			expect(syncCommands[0]).toContain('file-1-replacement\tdoc1.txt');
		});

		it('reads mirrored knowledge through the knowledge sandbox', async () => {
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(isManifestReadCommand(command) ? 'file-id\tfile.txt\n' : '0\t1\thello\n'),
			);
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeAgentFile()]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			const result = await service.readKnowledge(scope, { file: 'file.txt' });

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
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId
				.mockResolvedValueOnce([makeMirrorFile('file-1', 'doc1.txt')])
				.mockResolvedValueOnce([
					makeMirrorFile('file-1', 'doc1.txt'),
					makeMirrorFile('file-2', 'doc2.txt'),
				]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			const firstSearch = service.searchKnowledge(scope, { pattern: 'first' });
			await vi.waitFor(() =>
				expect(
					sandbox.executeCommand.mock.calls.filter(([command]) => isManifestReadCommand(command)),
				).toHaveLength(1),
			);

			const secondSearch = service.searchKnowledge(scope, { pattern: 'second' });
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
			sandboxProvider = makeSandboxProvider(makeRuntime(sandbox, filesystem));
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			await service.searchKnowledge(scope, { pattern: 'foo' });

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
				sandboxProvider.acquire
					.mockResolvedValueOnce(makeRuntime(staleSandbox, staleFilesystem))
					.mockResolvedValueOnce(makeRuntime(replacementSandbox, replacementFilesystem));
				const agentFileRepository = mock<KnowledgeFileRepository>();
				agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
				const service = makeMirrorService({ fileRepository: agentFileRepository });

				await service.searchKnowledge(scope, { pattern: 'first' });
				await service.searchKnowledge(scope, { pattern: 'second' });

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
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			const error = await service
				.searchKnowledge(scope, { pattern: 'foo' })
				.then(() => undefined)
				.catch((cause: Error) => cause);

			expect(error?.message).toContain('[REDACTED]');
			expect(error?.message).not.toContain('abc.def');
		});

		it('propagates filesystem write failures instead of finalizing a partial mirror', async () => {
			const providerError = new Error('provider write failed');
			filesystem.writeFile.mockRejectedValue(providerError);
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			await expect(service.searchKnowledge(scope, { pattern: 'foo' })).rejects.toBe(providerError);
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
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			await expect(service.searchKnowledge(scope, { pattern: 'foo' })).rejects.toThrow(
				/Agent knowledge mirror sync failed/,
			);
		});

		it('retries a knowledge file on the next sync after its first load fails', async () => {
			sandbox.executeCommand.mockResolvedValue(makeCommandResult());
			const agentFileRepository = mock<KnowledgeFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentKnowledgeFileStore = makeKnowledgeFileStore();
			agentKnowledgeFileStore.readAsBuffer.mockRejectedValueOnce(new Error('missing on disk'));
			const logger = mock<Logger>();
			const service = makeMirrorService({
				fileRepository: agentFileRepository,
				fileStore: agentKnowledgeFileStore,
				logger,
			});

			await expect(service.searchKnowledge(scope, { pattern: 'foo' })).resolves.toBeDefined();
			expect(filesystem.writeFile).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load agent knowledge file for mirror sync',
				expect.objectContaining({ file: 'doc1.txt' }),
			);

			await expect(service.searchKnowledge(scope, { pattern: 'bar' })).resolves.toBeDefined();
			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(2);
			expect(filesystem.writeFile).toHaveBeenCalledTimes(1);
		});
	});
});
