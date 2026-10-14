import type {
	CommandResult,
	SandboxProvider,
	WorkspaceFilesystem,
	WorkspaceSandbox,
} from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import escapeRegExp from 'lodash/escapeRegExp';
import { mock } from 'vitest-mock-extended';

import type { AgentKnowledgeFileStore } from '../agent-knowledge-file-store';
import { AgentKnowledgeMirrorService } from '../agent-knowledge-mirror.service';
import { getAgentKnowledgePaths } from '../agent-knowledge-storage';
import type {
	AgentSandboxRuntime,
	AgentSandboxRuntimeService,
} from '../agent-sandbox-runtime.service';
import type { AgentFile } from '../entities/agent-file.entity';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const projectId = 'project-1';
const agentId = 'agent-1';
const knowledgePaths = getAgentKnowledgePaths('daytona');
const n8nKnowledgePaths = getAgentKnowledgePaths('n8n-sandbox');

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

function makeKnowledgeFileStore(): ReturnType<typeof mock<AgentKnowledgeFileStore>> {
	const store = mock<AgentKnowledgeFileStore>();
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
): AgentSandboxRuntime {
	return {
		provider: sandbox.provider,
		sandbox,
		filesystem,
		workspaceRoot:
			sandbox.provider === 'daytona' ? '/home/daytona/workspace' : '/home/node/workspace',
		cacheKey: `${sandbox.provider}:agent:${sandbox.id}`,
	};
}

function makeRuntimeService(
	runtime: AgentSandboxRuntime,
): ReturnType<typeof mock<AgentSandboxRuntimeService>> {
	const service = mock<AgentSandboxRuntimeService>();
	service.acquireKnowledgeSandbox.mockResolvedValue(runtime);
	service.executeSandboxCommand.mockImplementation(
		async (sandbox, command, timeout) =>
			await (sandbox.executeCommand?.(command, [], { timeout }) ??
				Promise.reject(new Error('Command execution unavailable'))),
	);
	return service;
}

function makeService({
	runtimeService,
	logger = mock<Logger>(),
	agentFileRepository = mock<AgentFileRepository>(),
	agentRepository = mock<AgentRepository>(),
	agentKnowledgeFileStore = makeKnowledgeFileStore(),
}: {
	runtimeService: AgentSandboxRuntimeService;
	logger?: Logger;
	agentFileRepository?: AgentFileRepository;
	agentRepository?: AgentRepository;
	agentKnowledgeFileStore?: AgentKnowledgeFileStore;
}): AgentKnowledgeMirrorService {
	return new AgentKnowledgeMirrorService(
		{ sandboxTimeout: 300_000 } as AgentsConfig,
		logger,
		runtimeService,
		agentFileRepository,
		agentRepository,
		agentKnowledgeFileStore,
	);
}

describe('AgentKnowledgeMirrorService', () => {
	let sandbox: ReturnType<typeof mock<TestWorkspaceSandbox>>;
	let filesystem: ReturnType<typeof mock<WorkspaceFilesystem>>;
	let runtimeService: ReturnType<typeof mock<AgentSandboxRuntimeService>>;

	beforeEach(() => {
		vi.clearAllMocks();
		sandbox = makeSandbox();
		filesystem = mock<WorkspaceFilesystem>();
		runtimeService = makeRuntimeService(makeRuntime(sandbox, filesystem));
	});

	describe('globKnowledgeFiles', () => {
		const fixtureFiles = [
			makeAgentFile({ id: 'file-alpha', fileName: 'alpha.pdf' }),
			makeAgentFile({ id: 'file-bravo', fileName: 'bravo.pdf' }),
			makeAgentFile({ id: 'file-charlie', fileName: 'charlie.txt' }),
			makeAgentFile({ id: 'file-delta', fileName: 'delta.md' }),
		];

		function makeGlobService(files: AgentFile[] = fixtureFiles): AgentKnowledgeMirrorService {
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue(files);
			const agentRepository = mock<AgentRepository>();
			agentRepository.existsBy.mockResolvedValue(true);
			return makeService({ runtimeService, agentFileRepository, agentRepository });
		}

		it('lists all files with a catch-all pattern, sorted by display name', async () => {
			const service = makeGlobService();

			const result = await service.globKnowledgeFiles(projectId, agentId, { pattern: '*' });

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

			const result = await service.globKnowledgeFiles(projectId, agentId, { pattern: '*.pdf' });

			expect(result.files.map((file) => file.displayName)).toEqual(['alpha.pdf', 'bravo.pdf']);
		});

		it('pages with offset', async () => {
			const service = makeGlobService();

			const firstPage = await service.globKnowledgeFiles(projectId, agentId, {
				pattern: '*',
				limit: 2,
				offset: 0,
			});
			expect(firstPage.files.map((file) => file.displayName)).toEqual(['alpha.pdf', 'bravo.pdf']);
			expect(firstPage.offset).toBe(0);
			expect(firstPage.hasMore).toBe(true);

			const secondPage = await service.globKnowledgeFiles(projectId, agentId, {
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

			const result = await service.globKnowledgeFiles(projectId, agentId, {
				pattern: 'report(v1).pdf',
			});

			expect(result.files.map((file) => file.displayName)).toEqual(['report(v1).pdf']);
		});

		it('rejects unsafe patterns', async () => {
			const service = makeGlobService();

			await expect(
				service.globKnowledgeFiles(projectId, agentId, { pattern: '../secrets' }),
			).rejects.toThrow('Invalid knowledge file pattern');
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

			await expect(
				service.globKnowledgeFiles(projectId, agentId, { pattern: '******Z' }),
			).rejects.toThrow('Regular expression execution timed out');
		});
	});

	it('returns an empty search without acquiring a sandbox when no files exist', async () => {
		const agentFileRepository = mock<AgentFileRepository>();
		agentFileRepository.findByAgentId.mockResolvedValue([]);
		const agentRepository = mock<AgentRepository>();
		agentRepository.existsBy.mockResolvedValue(true);
		const service = makeService({ runtimeService, agentFileRepository, agentRepository });

		const result = await service.searchKnowledge(projectId, agentId, { pattern: 'anything' });

		expect(result).toEqual(expect.objectContaining({ matches: [], hasMore: false }));
		expect(runtimeService.acquireKnowledgeSandbox).not.toHaveBeenCalled();
	});

	describe('mirror sync', () => {
		function isManifestReadCommand(command: string): boolean {
			return command.startsWith('cat ') && command.includes('/manifest');
		}

		function isMirrorSyncCommand(command: string): boolean {
			return command.includes(`mkdir -p '\\''${knowledgePaths.filesDir}'\\''`);
		}

		/** `<stagingDir>/<syncId>` of the most recent sync, read back from its mkdir. */
		function stagingRoot(fs: ReturnType<typeof mock<WorkspaceFilesystem>>): string {
			const pattern = new RegExp(`^${escapeRegExp(knowledgePaths.stagingDir)}/[^/]+/files$`);
			const stagingFilesDirs = fs.mkdir.mock.calls
				.map(([path]) => path)
				.filter((path) => pattern.test(path));
			expect(stagingFilesDirs.length).toBeGreaterThan(0);
			return stagingFilesDirs[stagingFilesDirs.length - 1].slice(0, -'/files'.length);
		}

		/**
		 * Knowledge file uploads only. Every sync also stages a manifest, and a
		 * sync with deletions stages a delete list.
		 */
		function stagedFileWrites(
			fs: ReturnType<typeof mock<WorkspaceFilesystem>>,
		): Array<[string, unknown]> {
			return fs.writeFile.mock.calls
				.map(([path, content]) => [path, content] as [string, unknown])
				.filter(([path]) => path.includes('/files/'));
		}

		function makeMirrorFile(id: string, fileName: string): AgentFile {
			return makeAgentFile({ id, fileName });
		}

		function makeMirrorService({
			fileRepository,
			fileStore = makeKnowledgeFileStore(),
			logger = mock<Logger>(),
		}: {
			fileRepository: AgentFileRepository;
			fileStore?: AgentKnowledgeFileStore;
			logger?: Logger;
		}): AgentKnowledgeMirrorService {
			const agentRepository = mock<AgentRepository>();
			agentRepository.existsBy.mockResolvedValue(true);
			return makeService({
				runtimeService,
				logger,
				agentFileRepository: fileRepository,
				agentRepository,
				agentKnowledgeFileStore: fileStore,
			});
		}

		it('syncs once, checks an unchanged repeat, and recopies a replaced file', async () => {
			let manifestState = '';
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(isManifestReadCommand(command) ? manifestState : ''),
			);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			const agentKnowledgeFileStore = makeKnowledgeFileStore();
			const service = makeMirrorService({
				fileRepository: agentFileRepository,
				fileStore: agentKnowledgeFileStore,
			});

			await service.searchKnowledge(projectId, agentId, { pattern: 'foo' });
			let commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(1);
			expect(runtimeService.acquireKnowledgeSandbox).toHaveBeenCalledWith(projectId, agentId);
			expect(runtimeService.acquireWorkspaceSandbox).not.toHaveBeenCalled();
			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(2);
			const staging = stagingRoot(filesystem);
			expect(filesystem.mkdir).toHaveBeenCalledWith(`${staging}/files`, { recursive: true });
			expect(stagedFileWrites(filesystem).map(([path]) => path)).toEqual([
				`${staging}/files/doc1.txt`,
				`${staging}/files/doc2.txt`,
			]);
			// The manifest is staged as a file so the sync command stays a fixed size.
			expect(filesystem.writeFile).toHaveBeenCalledWith(
				`${staging}/manifest`,
				'file-1\tdoc1.txt\nfile-2\tdoc2.txt\n',
			);
			expect(filesystem.rmdir).toHaveBeenCalledWith(staging, {
				recursive: true,
				force: true,
			});
			manifestState = 'file-1\tdoc1.txt\nfile-2\tdoc2.txt\n';

			sandbox.executeCommand.mockClear();
			agentKnowledgeFileStore.readAsBuffer.mockClear();
			filesystem.writeFile.mockClear();
			await service.searchKnowledge(projectId, agentId, { pattern: 'bar' });
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
			await service.searchKnowledge(projectId, agentId, { pattern: 'baz' });
			commands = sandbox.executeCommand.mock.calls.map(([command]) => command);
			const syncCommands = commands.filter(isMirrorSyncCommand);
			expect(syncCommands).toHaveLength(1);
			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(1);
			expect(syncCommands[0]).toContain(`${knowledgePaths.stagingDir}/`);
			// No per-file name reaches the command; only the staged files and
			// manifest carry them.
			expect(syncCommands[0]).not.toContain('doc1.txt');
			const replacementStaging = stagingRoot(filesystem);
			expect(stagedFileWrites(filesystem).map(([path]) => path)).toEqual([
				`${replacementStaging}/files/doc1.txt`,
			]);
			expect(filesystem.writeFile).toHaveBeenCalledWith(
				`${replacementStaging}/manifest`,
				'file-1-replacement\tdoc1.txt\nfile-2\tdoc2.txt\n',
			);
		});

		it('reads mirrored knowledge through the knowledge sandbox', async () => {
			sandbox.executeCommand.mockImplementation(async (command) =>
				makeCommandResult(isManifestReadCommand(command) ? 'file-id\tfile.txt\n' : '0\t1\thello\n'),
			);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeAgentFile()]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			const result = await service.readKnowledge(projectId, agentId, { file: 'file.txt' });

			expect(result.ranges[0].text).toBe('1|hello');
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
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId
				.mockResolvedValueOnce([makeMirrorFile('file-1', 'doc1.txt')])
				.mockResolvedValueOnce([
					makeMirrorFile('file-1', 'doc1.txt'),
					makeMirrorFile('file-2', 'doc2.txt'),
				]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			const firstSearch = service.searchKnowledge(projectId, agentId, { pattern: 'first' });
			await vi.waitFor(() =>
				expect(
					sandbox.executeCommand.mock.calls.filter(([command]) => isManifestReadCommand(command)),
				).toHaveLength(1),
			);

			const secondSearch = service.searchKnowledge(projectId, agentId, { pattern: 'second' });
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
			runtimeService = makeRuntimeService(makeRuntime(sandbox, filesystem));
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			await service.searchKnowledge(projectId, agentId, { pattern: 'foo' });

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
				runtimeService.acquireKnowledgeSandbox
					.mockResolvedValueOnce(makeRuntime(staleSandbox, staleFilesystem))
					.mockResolvedValueOnce(makeRuntime(replacementSandbox, replacementFilesystem));
				const agentFileRepository = mock<AgentFileRepository>();
				agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
				const service = makeMirrorService({ fileRepository: agentFileRepository });

				await service.searchKnowledge(projectId, agentId, { pattern: 'first' });
				await service.searchKnowledge(projectId, agentId, { pattern: 'second' });

				expect(stagedFileWrites(staleFilesystem)).toHaveLength(1);
				expect(stagedFileWrites(replacementFilesystem)).toHaveLength(1);
			},
		);

		it('redacts command stderr before reporting a failed knowledge operation', async () => {
			const secret = 'Authorization: Bearer abc.def-ghi_jkl/mno=012345678901234567890123456789';
			sandbox.executeCommand.mockImplementation(async (command) =>
				command.includes(' rg ')
					? makeCommandResult('', `failed with ${secret}`, 2)
					: makeCommandResult(),
			);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			const error = await service
				.searchKnowledge(projectId, agentId, { pattern: 'foo' })
				.then(() => undefined)
				.catch((cause: Error) => cause);

			expect(error?.message).toContain('[REDACTED]');
			expect(error?.message).not.toContain('abc.def');
		});

		it('propagates filesystem write failures instead of finalizing a partial mirror', async () => {
			const providerError = new Error('provider write failed');
			filesystem.writeFile.mockRejectedValue(providerError);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			await expect(service.searchKnowledge(projectId, agentId, { pattern: 'foo' })).rejects.toBe(
				providerError,
			);
			expect(
				sandbox.executeCommand.mock.calls.some(([command]) => isMirrorSyncCommand(command)),
			).toBe(false);
			expect(filesystem.rmdir).toHaveBeenCalledWith(stagingRoot(filesystem), {
				recursive: true,
				force: true,
			});
		});

		it('fails the operation instead of returning stale results when the sync command errors', async () => {
			sandbox.executeCommand.mockImplementation(async (command) =>
				isMirrorSyncCommand(command) ? makeCommandResult('', 'disk full', 1) : makeCommandResult(),
			);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const service = makeMirrorService({ fileRepository: agentFileRepository });

			await expect(service.searchKnowledge(projectId, agentId, { pattern: 'foo' })).rejects.toThrow(
				/Agent knowledge mirror sync failed/,
			);
		});

		it('retries a knowledge file on the next sync after its first load fails', async () => {
			sandbox.executeCommand.mockResolvedValue(makeCommandResult());
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentKnowledgeFileStore = makeKnowledgeFileStore();
			agentKnowledgeFileStore.readAsBuffer.mockRejectedValueOnce(new Error('missing on disk'));
			const logger = mock<Logger>();
			const service = makeMirrorService({
				fileRepository: agentFileRepository,
				fileStore: agentKnowledgeFileStore,
				logger,
			});

			await expect(
				service.searchKnowledge(projectId, agentId, { pattern: 'foo' }),
			).resolves.toBeDefined();
			expect(stagedFileWrites(filesystem)).toHaveLength(0);
			// The file never reached the mirror, so the manifest must not claim it did.
			expect(filesystem.writeFile).toHaveBeenCalledWith(expect.stringMatching(/\/manifest$/), '');
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load agent knowledge file for mirror sync',
				expect.objectContaining({ file: 'doc1.txt' }),
			);

			await expect(
				service.searchKnowledge(projectId, agentId, { pattern: 'bar' }),
			).resolves.toBeDefined();
			expect(agentKnowledgeFileStore.readAsBuffer).toHaveBeenCalledTimes(2);
			expect(stagedFileWrites(filesystem)).toHaveLength(1);
		});
	});
});
