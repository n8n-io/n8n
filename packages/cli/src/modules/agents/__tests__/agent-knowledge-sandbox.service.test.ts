import type { Mock, Mocked } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import type { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { mock } from 'vitest-mock-extended';
import type { BinaryDataService, InstanceSettings } from 'n8n-core';

import type { AiService } from '../../../services/ai.service';

import type { Agent } from '../entities/agent.entity';
import type { AgentFile } from '../entities/agent-file.entity';
import { KNOWLEDGE_MIRROR_FILES_DIR } from '../agent-knowledge-storage';
import {
	AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX,
	AgentKnowledgeSandboxService,
} from '../agent-knowledge-sandbox.service';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

interface MockFilesystem {
	uploadFiles: Mock;
	createFolder: Mock;
	deleteFile: Mock;
}

interface MockProcess {
	executeCommand: Mock<
		(...args: [string, string | undefined, Record<string, string> | undefined, number]) => Promise<{
			exitCode: number;
			result?: string;
			artifacts?: { stdout?: string; stderr?: string };
		}>
	>;
}

interface MockSandbox {
	id: string;
	name: string;
	state?: string;
	start: Mock<(...args: [number]) => Promise<void>>;
	delete: Mock<(...args: [number]) => Promise<void>>;
	fs: MockFilesystem;
	process: MockProcess;
}

class DaytonaNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DaytonaNotFoundError';
	}
}

const listMock =
	vi.fn<
		(
			...args: [{ labels?: Record<string, string>; limit?: number }?]
		) => AsyncIterableIterator<MockSandbox>
	>();
const createMock =
	vi.fn<(...args: [Record<string, unknown>, { timeout?: number }?]) => Promise<MockSandbox>>();
const getMock = vi.fn<(...args: [string]) => Promise<MockSandbox>>();
const daytonaInstances: MockDaytona[] = [];

class MockDaytona {
	constructor(readonly config: { apiUrl?: string; apiKey?: string }) {
		daytonaInstances.push(this);
	}

	list = listMock;
	create = createMock;
	get = getMock;
}

vi.mock('@n8n/agents/sandbox', () => ({
	loadDaytona: () => ({
		Daytona: MockDaytona,
		DaytonaNotFoundError,
	}),
}));

const instanceId = 'instance-1';
const projectId = 'project-1';
const agentId = 'agent-1';

function buildExpectedSandboxName(): string {
	return `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}${instanceId}-${projectId}-${agentId}`.toLowerCase();
}

function makeAiService(overrides: Partial<AiService> = {}): AiService {
	const aiService = mock<AiService>();
	aiService.isProxyEnabled.mockReturnValue(false);
	return Object.assign(aiService, overrides);
}

function makePublishedAgentRepository(): ReturnType<typeof mock<AgentRepository>> {
	const repository = mock<AgentRepository>();
	repository.findByIdAndProjectId.mockResolvedValue({
		id: agentId,
		projectId,
		activeVersionId: 'version-1',
	} as Agent);
	return repository;
}

function makeBinaryDataService(): Mocked<BinaryDataService> {
	const service = mock<BinaryDataService>();
	service.getAsBuffer.mockResolvedValue(Buffer.from('mock file content'));
	return service;
}

function makeService(
	configOverrides: Partial<AgentsConfig> = {},
	logger: Logger = mock<Logger>(),
	aiService: AiService = makeAiService(),
	instanceSettings: InstanceSettings = mock<InstanceSettings>({ instanceId }),
	agentFileRepository: AgentFileRepository = mock<AgentFileRepository>(),
	agentRepository: AgentRepository = makePublishedAgentRepository(),
	binaryDataService: BinaryDataService = makeBinaryDataService(),
): AgentKnowledgeSandboxService {
	return new AgentKnowledgeSandboxService(
		{
			sandboxEnabled: true,
			sandboxProvider: 'daytona',
			sandboxImage: 'daytonaio/sandbox:0.5.0',
			sandboxSnapshot: '',
			sandboxTimeout: 300_000,
			sandboxEphemeral: false,
			daytonaApiUrl: 'https://daytona.example',
			daytonaApiKey: 'test-key',
			...configOverrides,
		} as AgentsConfig,
		logger,
		aiService,
		instanceSettings,
		agentFileRepository,
		agentRepository,
		binaryDataService,
	);
}

function makeAgentFile(overrides: Partial<AgentFile> = {}): AgentFile {
	const id = overrides.id ?? 'file-id';
	const fileName = overrides.fileName ?? 'file.txt';
	return {
		id,
		agentId,
		binaryDataId: `filesystem-v2:agents/${agentId}/knowledge-files/${id}/binary_data/uuid`,
		fileName,
		mimeType: 'text/plain',
		fileSizeBytes: 100,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
		...overrides,
	} as AgentFile;
}

function makeFilesystem(): MockFilesystem {
	return {
		uploadFiles: vi.fn<
			(...args: [Array<{ source: Buffer | string; destination: string }>]) => Promise<void>
		>(async () => {}),
		createFolder: vi.fn<(...args: [string, string]) => Promise<void>>(async () => {}),
		deleteFile: vi.fn<(...args: [string, boolean?]) => Promise<void>>(async () => {}),
	};
}

function makeSandbox(
	state = 'started',
	overrides: Partial<Pick<MockSandbox, 'id' | 'name'>> = {},
): MockSandbox {
	return {
		id: overrides.id ?? 'sandbox-id',
		name: overrides.name ?? buildExpectedSandboxName(),
		state,
		start: vi.fn<(...args: [number]) => Promise<void>>(async () => {}),
		delete: vi.fn<(...args: [number]) => Promise<void>>(async () => {}),
		fs: makeFilesystem(),
		process: {
			executeCommand: vi.fn<
				(
					...args: [string, string | undefined, Record<string, string> | undefined, number]
				) => Promise<{
					exitCode: number;
					result?: string;
					artifacts?: { stdout?: string; stderr?: string };
				}>
			>(async () => ({
				exitCode: 0,
				artifacts: { stdout: '', stderr: '' },
			})),
		},
	};
}

describe('AgentKnowledgeSandboxService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		daytonaInstances.length = 0;
		createMock.mockResolvedValue(makeSandbox('started'));
		getMock.mockRejectedValue(new DaytonaNotFoundError('not found'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates a scoped sandbox', async () => {
		const aiService = makeAiService();
		const service = makeService({}, mock<Logger>(), aiService);
		const expectedName = buildExpectedSandboxName();

		await service.warmSandbox(projectId, agentId);

		expect(aiService.getClient).not.toHaveBeenCalled();
		expect(daytonaInstances).toHaveLength(1);
		expect(daytonaInstances[0].config).toEqual({
			apiUrl: 'https://daytona.example',
			apiKey: 'test-key',
		});
		expect(getMock).toHaveBeenCalledWith(expectedName);
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).toHaveBeenCalledTimes(1);
		const [params, options] = createMock.mock.calls[0];
		expect(params.name).toBe(expectedName);
		expect(params.name).toMatch(/^agent-[a-z0-9-]+$/);
		expect(params.labels).toEqual({
			'n8n-agents-knowledgebase': 'true',
			'n8n-project-id': projectId,
			'n8n-agent-id': agentId,
		});
		expect(params.ephemeral).toBe(false);
		expect(params.image).toBe('daytonaio/sandbox:0.5.0');
		expect(params.snapshot).toBeUndefined();
		expect(options).toEqual({ timeout: 300 });
	});

	it('forwards sandboxEphemeral config to Daytona create params', async () => {
		const service = makeService({ sandboxEphemeral: true });

		await service.warmSandbox(projectId, agentId);

		expect(getMock).toHaveBeenCalledWith(buildExpectedSandboxName());
		const [params] = createMock.mock.calls[0];
		expect(params.ephemeral).toBe(true);
	});

	it('reuses deterministic sandbox by name without listing', async () => {
		const sandbox = makeSandbox('started');
		getMock.mockResolvedValue(sandbox);
		const service = makeService();

		await service.warmSandbox(projectId, agentId);

		expect(getMock).toHaveBeenCalledWith(buildExpectedSandboxName());
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).not.toHaveBeenCalled();
	});

	it('starts a stopped deterministic sandbox before reuse', async () => {
		const sandbox = makeSandbox('stopped');
		getMock.mockResolvedValue(sandbox);
		const service = makeService();

		await service.warmSandbox(projectId, agentId);

		expect(sandbox.start).toHaveBeenCalledWith(300);
		expect(createMock).not.toHaveBeenCalled();
	});

	it('deletes dead deterministic sandbox and recreates it', async () => {
		const sandbox = makeSandbox('error');
		getMock.mockResolvedValueOnce(sandbox);
		const service = makeService();
		const expectedName = buildExpectedSandboxName();

		await service.warmSandbox(projectId, agentId);

		expect(sandbox.delete).toHaveBeenCalledWith(300);
		expect(createMock).toHaveBeenCalledTimes(1);
		expect(createMock.mock.calls[0][0].name).toBe(expectedName);
	});

	it('creates a sandbox from configured snapshot', async () => {
		const service = makeService({ sandboxSnapshot: 'n8n/agent-knowledge:1.2.3' });
		const expectedName = buildExpectedSandboxName();

		await service.warmSandbox(projectId, agentId);

		expect(createMock).toHaveBeenCalledTimes(1);
		const [params] = createMock.mock.calls[0];
		expect(params.snapshot).toBe('n8n/agent-knowledge:1.2.3');
		expect(params.image).toBeUndefined();
		expect(params.name).toBe(expectedName);
		expect(params.ephemeral).toBe(false);
		expect(params.autoStopInterval).toBe(5);
	});

	it('falls back to image when configured snapshot create fails', async () => {
		const logger = mock<Logger>();
		createMock
			.mockRejectedValueOnce(new Error('snapshot missing'))
			.mockResolvedValueOnce(makeSandbox('started'));
		const service = makeService({ sandboxSnapshot: 'n8n/agent-knowledge:missing' }, logger);

		await service.warmSandbox(projectId, agentId);

		expect(createMock).toHaveBeenCalledTimes(2);
		const [snapshotParams] = createMock.mock.calls[0];
		const [imageParams] = createMock.mock.calls[1];
		expect(snapshotParams.snapshot).toBe('n8n/agent-knowledge:missing');
		expect(snapshotParams.image).toBeUndefined();
		expect(imageParams.image).toBe('daytonaio/sandbox:0.5.0');
		expect(imageParams.snapshot).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith(
			'Agent knowledge sandbox create from snapshot failed; falling back to image',
			expect.objectContaining({
				projectId,
				agentId,
				snapshotName: 'n8n/agent-knowledge:missing',
			}),
		);
	});

	it('ignores whitespace-only sandboxSnapshot', async () => {
		const service = makeService({ sandboxSnapshot: '   ' });

		await service.warmSandbox(projectId, agentId);

		const [params] = createMock.mock.calls[0];
		expect(params.image).toBe('daytonaio/sandbox:0.5.0');
		expect(params.snapshot).toBeUndefined();
	});

	it('requests a proxy token scoped to the project id when the proxy is enabled, even without sandbox env vars', async () => {
		const client = mock<AiAssistantClient>();
		client.getSandboxProxyConfig.mockResolvedValue({ image: 'proxy-image' });
		client.getBuilderApiProxyToken.mockResolvedValue({
			accessToken: 'proxy-token',
			tokenType: 'Bearer',
		});
		client.getSandboxProxyBaseUrl.mockReturnValue('https://sandbox-proxy.example');
		const aiService = makeAiService({
			isProxyEnabled: vi.fn().mockReturnValue(true),
			getClient: vi.fn().mockResolvedValue(client),
		});
		const service = makeService(
			{ sandboxEnabled: false, sandboxProvider: '' },
			mock<Logger>(),
			aiService,
		);

		await service.warmSandbox(projectId, agentId);

		expect(client.getBuilderApiProxyToken).toHaveBeenCalledWith(
			{ id: projectId },
			expect.anything(),
		);
	});

	it('retries transient proxy setup failures', async () => {
		vi.useFakeTimers();
		const client = mock<AiAssistantClient>();
		client.getSandboxProxyConfig
			.mockRejectedValueOnce(Object.assign(new Error('Bad Gateway'), { statusCode: 502 }))
			.mockResolvedValue({ image: 'proxy-image' });
		client.getBuilderApiProxyToken.mockResolvedValue({
			accessToken: 'proxy-token',
			tokenType: 'Bearer',
		});
		client.getSandboxProxyBaseUrl.mockReturnValue('https://sandbox-proxy.example');
		const aiService = makeAiService({
			isProxyEnabled: vi.fn().mockReturnValue(true),
			getClient: vi.fn().mockResolvedValue(client),
		});
		const service = makeService({}, mock<Logger>(), aiService);

		const promise = service.warmSandbox(projectId, agentId);
		await vi.advanceTimersByTimeAsync(1000);
		await promise;

		expect(client.getSandboxProxyConfig).toHaveBeenCalledTimes(2);
	});

	describe('globKnowledgeFiles', () => {
		const fixtureFiles = [
			makeAgentFile({ id: 'file-alpha', fileName: 'alpha.pdf' }),
			makeAgentFile({ id: 'file-bravo', fileName: 'bravo.pdf' }),
			makeAgentFile({ id: 'file-charlie', fileName: 'charlie.txt' }),
			makeAgentFile({ id: 'file-delta', fileName: 'delta.md' }),
		];

		function makeGlobService(): AgentKnowledgeSandboxService {
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue(fixtureFiles);
			const agentRepository = mock<AgentRepository>();
			agentRepository.existsBy.mockResolvedValue(true);
			return makeService(
				{},
				mock<Logger>(),
				makeAiService(),
				mock<InstanceSettings>({ instanceId }),
				agentFileRepository,
				agentRepository,
			);
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

		it('still rejects unsafe patterns', async () => {
			const service = makeGlobService();

			await expect(
				service.globKnowledgeFiles(projectId, agentId, { pattern: '../secrets' }),
			).rejects.toThrow('Invalid knowledge file pattern');
		});
	});

	it('throws a published-only error when the agent has no active version', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIdAndProjectId.mockResolvedValue({
			id: agentId,
			projectId,
			activeVersionId: null,
		} as Agent);
		const service = makeService(
			{},
			mock<Logger>(),
			makeAiService(),
			mock<InstanceSettings>({ instanceId }),
			mock<AgentFileRepository>(),
			agentRepository,
		);

		await expect(service.warmSandbox(projectId, agentId)).rejects.toThrow(
			'Knowledge base is only available for published agents. Publish the agent first.',
		);
		expect(createMock).not.toHaveBeenCalled();
	});

	describe('destroySandbox', () => {
		it('deletes the sandbox by name', async () => {
			const sandbox = makeSandbox('started');
			getMock.mockResolvedValue(sandbox);
			const service = makeService();

			await service.destroySandbox(projectId, agentId);

			expect(getMock).toHaveBeenCalledWith(buildExpectedSandboxName());
			expect(sandbox.delete).toHaveBeenCalledWith(300);
		});

		it('swallows a NotFound error without throwing', async () => {
			getMock.mockRejectedValue(new DaytonaNotFoundError('not found'));
			const service = makeService();

			await expect(service.destroySandbox(projectId, agentId)).resolves.toBeUndefined();
		});

		it('swallows any other error and logs a warning without throwing', async () => {
			getMock.mockRejectedValue(new Error('boom'));
			const logger = mock<Logger>();
			const service = makeService({}, logger);

			await expect(service.destroySandbox(projectId, agentId)).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to destroy agent knowledge sandbox',
				expect.objectContaining({ projectId, agentId }),
			);
		});

		it('is a no-op when the knowledge base is disabled', async () => {
			const service = makeService({ sandboxEnabled: false });

			await service.destroySandbox(projectId, agentId);

			expect(getMock).not.toHaveBeenCalled();
		});
	});

	describe('mirror sync', () => {
		function isManifestReadCommand(command: string): boolean {
			return command.startsWith('cat ') && command.includes('/manifest');
		}

		function isMirrorSyncCommand(command: string): boolean {
			return command.includes(`mkdir -p ${KNOWLEDGE_MIRROR_FILES_DIR}`);
		}

		function makeMirrorFile(id: string, fileName: string): AgentFile {
			return makeAgentFile({ id, fileName });
		}

		it('syncs on the first operation, skips an unchanged repeat, and diffs on a changed file list', async () => {
			const sandbox = makeSandbox('started');
			let manifestState = '';
			sandbox.process.executeCommand.mockImplementation(async (command) => ({
				exitCode: 0,
				artifacts: { stdout: isManifestReadCommand(command) ? manifestState : '', stderr: '' },
			}));
			getMock.mockResolvedValue(sandbox);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			const agentRepository = makePublishedAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const binaryDataService = makeBinaryDataService();
			const service = makeService(
				{},
				mock<Logger>(),
				makeAiService(),
				mock<InstanceSettings>({ instanceId }),
				agentFileRepository,
				agentRepository,
				binaryDataService,
			);

			await service.searchKnowledge(projectId, agentId, { pattern: 'foo' });
			let commands = sandbox.process.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(1);
			expect(binaryDataService.getAsBuffer).toHaveBeenCalledTimes(2);
			expect(sandbox.fs.uploadFiles).toHaveBeenCalledTimes(1);
			manifestState = 'doc1.txt\ndoc2.txt\n';

			sandbox.process.executeCommand.mockClear();
			binaryDataService.getAsBuffer.mockClear();
			sandbox.fs.uploadFiles.mockClear();
			await service.searchKnowledge(projectId, agentId, { pattern: 'bar' });
			commands = sandbox.process.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(0);
			expect(commands.filter(isMirrorSyncCommand)).toHaveLength(0);
			expect(commands).toHaveLength(1);
			expect(binaryDataService.getAsBuffer).not.toHaveBeenCalled();
			expect(sandbox.fs.uploadFiles).not.toHaveBeenCalled();

			sandbox.process.executeCommand.mockClear();
			binaryDataService.getAsBuffer.mockClear();
			sandbox.fs.uploadFiles.mockClear();
			agentFileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
				makeMirrorFile('file-3', 'doc3.txt'),
			]);
			await service.searchKnowledge(projectId, agentId, { pattern: 'baz' });
			commands = sandbox.process.executeCommand.mock.calls.map(([command]) => command);
			expect(commands.filter(isManifestReadCommand)).toHaveLength(1);
			const syncCommands = commands.filter(isMirrorSyncCommand);
			expect(syncCommands).toHaveLength(1);
			// Only the newly-added name should be fetched and staged for move —
			// the manifest rewrite (which always lists every expected name) is
			// a separate, later part of the finalize command.
			expect(binaryDataService.getAsBuffer).toHaveBeenCalledTimes(1);
			expect(syncCommands[0]).toContain('.tmp-doc3.txt');
			expect(syncCommands[0]).not.toContain('.tmp-doc1.txt');
			expect(syncCommands[0]).not.toContain('.tmp-doc2.txt');
		});

		it('flushes mirror uploads in size-bounded batches', async () => {
			const MIRROR_UPLOAD_BATCH_BYTES = 64 * 1024 * 1024;
			const sandbox = makeSandbox('started');
			sandbox.process.executeCommand.mockResolvedValue({
				exitCode: 0,
				artifacts: { stdout: '', stderr: '' },
			});
			getMock.mockResolvedValue(sandbox);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([
				makeMirrorFile('file-1', 'doc1.txt'),
				makeMirrorFile('file-2', 'doc2.txt'),
			]);
			const agentRepository = makePublishedAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const binaryDataService = makeBinaryDataService();
			binaryDataService.getAsBuffer.mockResolvedValue(Buffer.alloc(MIRROR_UPLOAD_BATCH_BYTES));
			const service = makeService(
				{},
				mock<Logger>(),
				makeAiService(),
				mock<InstanceSettings>({ instanceId }),
				agentFileRepository,
				agentRepository,
				binaryDataService,
			);

			await service.searchKnowledge(projectId, agentId, { pattern: 'foo' });

			expect(sandbox.fs.uploadFiles).toHaveBeenCalledTimes(2);
			const uploadCalls = sandbox.fs.uploadFiles.mock.calls as Array<
				[Array<{ destination: string }>]
			>;
			expect(uploadCalls[0][0]).toHaveLength(1);
			expect(uploadCalls[1][0]).toHaveLength(1);
		});

		it('cds into the sandbox-local mirror directory for search commands', async () => {
			const sandbox = makeSandbox('started');
			sandbox.process.executeCommand.mockResolvedValue({
				exitCode: 0,
				artifacts: { stdout: '', stderr: '' },
			});
			getMock.mockResolvedValue(sandbox);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentRepository = makePublishedAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const service = makeService(
				{},
				mock<Logger>(),
				makeAiService(),
				mock<InstanceSettings>({ instanceId }),
				agentFileRepository,
				agentRepository,
			);

			await service.searchKnowledge(projectId, agentId, { pattern: 'foo' });

			const searchCommand = sandbox.process.executeCommand.mock.calls
				.map(([command]) => command)
				.find((command) => command.includes(' rg '));
			expect(searchCommand).toBeDefined();
			expect(searchCommand).toContain(`cd '\\''${KNOWLEDGE_MIRROR_FILES_DIR}'\\''`);
		});

		it('fails the operation instead of returning stale results when the sync command errors', async () => {
			const sandbox = makeSandbox('started');
			sandbox.process.executeCommand.mockImplementation(async (command) =>
				isMirrorSyncCommand(command)
					? { exitCode: 1, artifacts: { stdout: '', stderr: 'disk full' } }
					: { exitCode: 0, artifacts: { stdout: '', stderr: '' } },
			);
			getMock.mockResolvedValue(sandbox);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentRepository = makePublishedAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const service = makeService(
				{},
				mock<Logger>(),
				makeAiService(),
				mock<InstanceSettings>({ instanceId }),
				agentFileRepository,
				agentRepository,
			);

			await expect(service.searchKnowledge(projectId, agentId, { pattern: 'foo' })).rejects.toThrow(
				/Agent knowledge mirror sync failed/,
			);
		});

		it('skips a file that fails to load from binary data storage and retries it next sync', async () => {
			const sandbox = makeSandbox('started');
			sandbox.process.executeCommand.mockResolvedValue({
				exitCode: 0,
				artifacts: { stdout: '', stderr: '' },
			});
			getMock.mockResolvedValue(sandbox);
			const agentFileRepository = mock<AgentFileRepository>();
			agentFileRepository.findByAgentId.mockResolvedValue([makeMirrorFile('file-1', 'doc1.txt')]);
			const agentRepository = makePublishedAgentRepository();
			agentRepository.existsBy.mockResolvedValue(true);
			const binaryDataService = makeBinaryDataService();
			binaryDataService.getAsBuffer.mockRejectedValueOnce(new Error('missing on disk'));
			const logger = mock<Logger>();
			const service = makeService(
				{},
				logger,
				makeAiService(),
				mock<InstanceSettings>({ instanceId }),
				agentFileRepository,
				agentRepository,
				binaryDataService,
			);

			await expect(
				service.searchKnowledge(projectId, agentId, { pattern: 'foo' }),
			).resolves.toBeDefined();

			expect(sandbox.fs.uploadFiles).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load agent knowledge file for mirror sync',
				expect.objectContaining({ file: 'doc1.txt' }),
			);

			// The failed file was left out of the cached manifest, so the next
			// sync's expected hash mismatches and it retries — this time
			// `getAsBuffer` succeeds (the mock's default resolves).
			await expect(
				service.searchKnowledge(projectId, agentId, { pattern: 'bar' }),
			).resolves.toBeDefined();

			expect(binaryDataService.getAsBuffer).toHaveBeenCalledTimes(2);
			expect(sandbox.fs.uploadFiles).toHaveBeenCalledTimes(1);
		});
	});
});
