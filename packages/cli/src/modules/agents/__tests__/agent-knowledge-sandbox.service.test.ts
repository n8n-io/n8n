import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock, type MockProxy } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { BadRequestError } from '../../../errors/response-errors/bad-request.error';
import { NotFoundError } from '../../../errors/response-errors/not-found.error';
import type { AiService } from '../../../services/ai.service';

import { AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH } from '../agent-knowledge-storage';
import {
	AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX,
	AgentKnowledgeSandboxService,
} from '../agent-knowledge-sandbox.service';
import type { AgentFile } from '../entities/agent-file.entity';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentRepository } from '../repositories/agent.repository';

interface MockFilesystem {
	uploadFiles: jest.Mock;
	createFolder: jest.Mock;
	deleteFile: jest.Mock;
}

interface MockProcess {
	executeCommand: jest.Mock<
		Promise<{
			exitCode: number;
			result?: string;
			artifacts?: { stdout?: string; stderr?: string };
		}>,
		[string, string | undefined, Record<string, string> | undefined, number]
	>;
}

interface MockSandbox {
	id: string;
	name: string;
	state?: string;
	volumes?: Array<{ volumeId: string; mountPath: string; subpath?: string }>;
	start: jest.Mock<Promise<void>, [number]>;
	fs: MockFilesystem;
	process: MockProcess;
}

interface MockSandboxPage {
	items: MockSandbox[];
	totalPages: number;
}

const listMock = jest.fn<Promise<MockSandboxPage>, [Record<string, string>, number, number]>();
const createMock = jest.fn<
	Promise<MockSandbox>,
	[Record<string, unknown>, { timeout?: number }?]
>();
const getMock = jest.fn<Promise<MockSandbox>, [string]>();
const daytonaInstances: MockDaytona[] = [];

class MockDaytona {
	constructor(readonly config: { apiUrl?: string; apiKey?: string }) {
		daytonaInstances.push(this);
	}

	list = listMock;
	create = createMock;
	get = getMock;
}

jest.mock('@n8n/agents/sandbox', () => ({
	loadDaytona: () => ({
		Daytona: MockDaytona,
	}),
}));

const volumeId = 'vol-1';
const userId = 'user-1';
const instanceId = 'instance-1';
const expectedVolumeMount = {
	volumeId,
	mountPath: AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	subpath: `agent-knowledge/instances/${instanceId}/projects/project-1/agents/agent-1/knowledge`,
};
let agentFileRepository: MockProxy<AgentFileRepository>;
let agentRepository: MockProxy<AgentRepository>;

function makeAiService(overrides: Partial<AiService> = {}): AiService {
	const aiService = mock<AiService>();
	aiService.isProxyEnabled.mockReturnValue(false);
	return Object.assign(aiService, overrides);
}

function makeProxyClient(
	overrides: {
		image?: string;
		proxyBaseUrl?: string;
		accessToken?: string;
	} = {},
) {
	const {
		image = 'proxy/sandbox:1.0.0',
		proxyBaseUrl = 'https://assistant.example/sandbox',
		accessToken = 'proxy-token',
	} = overrides;

	return {
		getSandboxProxyBaseUrl: jest.fn().mockReturnValue(proxyBaseUrl),
		getSandboxProxyConfig: jest.fn().mockResolvedValue({ image }),
		getBuilderApiProxyToken: jest.fn().mockResolvedValue({ accessToken, tokenType: 'Bearer' }),
	};
}

function makeService(
	configOverrides: Partial<AgentsConfig> = {},
	logger: Logger = mock<Logger>(),
	aiService: AiService = makeAiService(),
	instanceSettings: InstanceSettings = mock<InstanceSettings>({ instanceId }),
	fileRepository: AgentFileRepository = agentFileRepository,
): AgentKnowledgeSandboxService {
	return new AgentKnowledgeSandboxService(
		{
			sandboxEnabled: true,
			sandboxProvider: 'daytona',
			sandboxImage: 'daytonaio/sandbox:0.5.0',
			sandboxTimeout: 300_000,
			daytonaApiUrl: 'https://daytona.example',
			daytonaApiKey: 'test-key',
			daytonaVolumeId: volumeId,
			...configOverrides,
		} as AgentsConfig,
		logger,
		aiService,
		instanceSettings,
		fileRepository,
		agentRepository,
	);
}

function makeFilesystem(): MockFilesystem {
	return {
		uploadFiles: jest.fn<Promise<void>, [Array<{ source: Buffer | string; destination: string }>]>(
			async () => {},
		),
		createFolder: jest.fn<Promise<void>, [string, string]>(async () => {}),
		deleteFile: jest.fn<Promise<void>, [string, boolean?]>(async () => {}),
	};
}

function makeSandbox(
	state = 'started',
	volumes = [expectedVolumeMount],
	overrides: Partial<Pick<MockSandbox, 'id' | 'name'>> = {},
): MockSandbox {
	return {
		id: overrides.id ?? 'sandbox-id',
		name: overrides.name ?? 'agents-knowledgebase-sandbox',
		state,
		volumes,
		start: jest.fn<Promise<void>, [number]>(async () => {}),
		fs: makeFilesystem(),
		process: {
			executeCommand: jest.fn<
				Promise<{
					exitCode: number;
					result?: string;
					artifacts?: { stdout?: string; stderr?: string };
				}>,
				[string, string | undefined, Record<string, string> | undefined, number]
			>(async () => ({
				exitCode: 0,
				artifacts: { stdout: '', stderr: '' },
			})),
		},
	};
}

function makeAgentFile(
	overrides: Partial<AgentFile> & { storageFileName?: string } = {},
): AgentFile {
	const storageFileName = overrides.storageFileName ?? 'notes.txt';
	return {
		id: overrides.id ?? 'file-1',
		agentId: overrides.agentId ?? 'agent-1',
		binaryDataId: overrides.binaryDataId ?? `daytona-volume:${storageFileName}`,
		fileName: overrides.fileName ?? storageFileName,
		mimeType: overrides.mimeType ?? 'text/plain',
		fileSizeBytes: overrides.fileSizeBytes ?? 100,
		createdAt: overrides.createdAt ?? new Date('2026-06-09T10:00:00.000Z'),
	} as AgentFile;
}

function mockKnowledgeFiles(files: AgentFile[]) {
	agentFileRepository.findByAgentId.mockResolvedValue(files);
}

describe('AgentKnowledgeSandboxService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		agentFileRepository = mock<AgentFileRepository>();
		agentFileRepository.findByAgentId.mockResolvedValue([]);
		agentRepository = mock<AgentRepository>();
		agentRepository.existsBy.mockResolvedValue(true);
		daytonaInstances.length = 0;
		listMock.mockResolvedValue({ items: [], totalPages: 1 });
		createMock.mockResolvedValue(makeSandbox('started'));
		getMock.mockResolvedValue(
			makeSandbox('started', [expectedVolumeMount], { name: 'hydrated-sandbox' }),
		);
	});

	it('reuses a matching stopped sandbox and starts it before running the operation', async () => {
		const sandbox = makeSandbox('stopped');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();
		const operation = jest.fn(async () => 'done');

		await expect(
			service.withKnowledgeFilesystem('project-1', 'agent-1', userId, operation),
		).resolves.toBe('done');
		expect(sandbox.start).toHaveBeenCalledWith(300);
		expect(createMock).not.toHaveBeenCalled();
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it('creates a sandbox with scoped labels, volume mount, and expected params when list is empty', async () => {
		const aiService = makeAiService();
		const service = makeService({}, mock<Logger>(), aiService);

		await service.withKnowledgeFilesystem('project-1', 'agent-1', userId, async () => {});

		expect(aiService.getClient).not.toHaveBeenCalled();
		expect(daytonaInstances).toHaveLength(1);
		expect(daytonaInstances[0].config).toEqual({
			apiUrl: 'https://daytona.example',
			apiKey: 'test-key',
		});
		expect(createMock).toHaveBeenCalledTimes(1);
		const [params, options] = createMock.mock.calls[0];
		expect(params.name).toMatch(
			new RegExp(`^${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}-[0-9a-f-]{36}$`),
		);
		expect(params.labels).toEqual({
			'n8n-agents-knowledgebase': 'true',
			'n8n-project-id': 'project-1',
			'n8n-agent-id': 'agent-1',
			'n8n-user-id': userId,
		});
		expect(params.language).toBe('typescript');
		expect(params.image).toBe('daytonaio/sandbox:0.5.0');
		expect(params.ephemeral).toBe(true);
		expect(params.autoStopInterval).toBe(5);
		expect(params.volumes).toEqual([expectedVolumeMount]);
		expect(options).toEqual({ timeout: 300 });
	});

	it('creates sandboxes through the AI assistant proxy when proxy mode is enabled', async () => {
		const mockClient = makeProxyClient();
		const aiService = makeAiService({
			isProxyEnabled: jest.fn().mockReturnValue(true),
			getClient: jest.fn().mockResolvedValue(mockClient),
		});
		const service = makeService({}, mock<Logger>(), aiService);

		await service.withKnowledgeFilesystem('project-1', 'agent-1', userId, async () => {});

		expect(createMock).toHaveBeenCalledTimes(1);
		expect(aiService.getClient).toHaveBeenCalledTimes(1);
		expect(mockClient.getSandboxProxyConfig).toHaveBeenCalledTimes(1);
		expect(mockClient.getBuilderApiProxyToken).toHaveBeenCalledWith(
			{ id: userId },
			expect.objectContaining({ userMessageId: expect.any(String) }),
		);
		expect(daytonaInstances).toHaveLength(1);
		expect(daytonaInstances[0].config).toEqual({
			apiUrl: 'https://assistant.example/sandbox',
			apiKey: 'proxy-token',
		});
		const [params] = createMock.mock.calls[0];
		expect(params.image).toBe('proxy/sandbox:1.0.0');
		expect(params.volumes).toEqual([expectedVolumeMount]);
	});

	it('executes commands on the rehydrated sandbox in proxy mode', async () => {
		const listedSandbox = makeSandbox('started', [expectedVolumeMount], {
			name: 'listed-sandbox',
		});
		const hydratedSandbox = makeSandbox('started', [expectedVolumeMount], {
			name: 'hydrated-sandbox',
		});
		hydratedSandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout:
					'{"type":"match","data":{"path":{"text":"notes.txt"},"lines":{"text":"hello\\n"},"line_number":1}}' +
					'\n',
				stderr: '',
			},
		});
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [listedSandbox], totalPages: 1 });
		getMock.mockResolvedValue(hydratedSandbox);
		const mockClient = makeProxyClient();
		const aiService = makeAiService({
			isProxyEnabled: jest.fn().mockReturnValue(true),
			getClient: jest.fn().mockResolvedValue(mockClient),
		});
		const service = makeService({}, mock<Logger>(), aiService);

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
		).resolves.toEqual({
			matches: [
				expect.objectContaining({
					file: 'notes.txt',
					lineNumber: 1,
					text: 'hello',
				}),
			],
			limit: 20,
			offset: 0,
			hasMore: false,
			truncated: false,
		});

		expect(getMock).toHaveBeenCalledWith('listed-sandbox');
		expect(listedSandbox.process.executeCommand).not.toHaveBeenCalled();
		expect(hydratedSandbox.process.executeCommand).toHaveBeenCalled();
	});

	it('findKnowledgeFiles returns metadata-backed files without starting Daytona', async () => {
		mockKnowledgeFiles([
			makeAgentFile({ id: 'file-1', storageFileName: 'notes.txt', fileName: 'Meeting Notes.txt' }),
			makeAgentFile({ id: 'file-2', storageFileName: 'report.txt', fileName: 'Report.pdf' }),
			makeAgentFile({ id: 'file-3', storageFileName: 'u-net.txt', fileName: 'u-net.pdf' }),
		]);
		const service = makeService();

		await expect(
			service.findKnowledgeFiles('project-1', 'agent-1', { query: 'notes', limit: 1 }),
		).resolves.toEqual({
			files: [
				{
					file: 'notes.txt',
					fileId: 'file-1',
					displayName: 'Meeting Notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 100,
					createdAt: '2026-06-09T10:00:00.000Z',
				},
			],
			limit: 1,
			offset: 0,
			hasMore: false,
		});
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).not.toHaveBeenCalled();

		for (const query of ['u net', 'unet', 'u-net']) {
			await expect(
				service.findKnowledgeFiles('project-1', 'agent-1', { query, limit: 10 }),
			).resolves.toMatchObject({
				files: [
					{
						file: 'u-net.txt',
						fileId: 'file-3',
						displayName: 'u-net.pdf',
					},
				],
			});
		}
	});

	it('rejects invalid file paths and unknown files before sandbox execution', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, {
				query: 'hello',
				file: '../secret.txt',
			}),
		).rejects.toThrow(BadRequestError);
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).not.toHaveBeenCalled();
		expect(sandbox.process.executeCommand).not.toHaveBeenCalled();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, {
				query: 'hello',
				file: 'missing.txt',
			}),
		).rejects.toThrow(BadRequestError);
		expect(listMock).not.toHaveBeenCalled();
	});

	it('searchKnowledge builds scoped fixed-string ripgrep commands and parses matches', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout: [
					'{"type":"context","data":{"path":{"text":"notes.txt"},"lines":{"text":"before\\n"},"line_number":1}}',
					'{"type":"match","data":{"path":{"text":"notes.txt"},"lines":{"text":"hello world\\n"},"line_number":2}}',
					'{"type":"context","data":{"path":{"text":"notes.txt"},"lines":{"text":"after\\n"},"line_number":3}}',
					'',
				].join('\n'),
				stderr: '',
			},
		});
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, {
				query: 'hello',
				file: 'notes.txt',
				contextLines: 1,
			}),
		).resolves.toEqual({
			matches: [
				{
					file: 'notes.txt',
					fileId: 'file-1',
					displayName: 'notes.txt',
					lineNumber: 2,
					text: 'hello world',
					textTruncated: false,
					contextBefore: [{ lineNumber: 1, text: 'before', truncated: false }],
					contextAfter: [{ lineNumber: 3, text: 'after', truncated: false }],
					citation: {
						file: 'notes.txt',
						fileId: 'file-1',
						displayName: 'notes.txt',
						startLine: 1,
						endLine: 3,
					},
				},
			],
			limit: 20,
			offset: 0,
			hasMore: false,
			truncated: false,
		});

		expect(sandbox.process.executeCommand).toHaveBeenCalledWith(
			expect.stringContaining(
				"rg --json --fixed-strings --line-number --color=never --hidden --sort path --max-count 21 --max-columns 501 --max-columns-preview --ignore-case --context 1 -e 'hello' -- './notes.txt'",
			),
			undefined,
			undefined,
			300,
		);
	});

	it('searchKnowledge ORs multiple deduplicated query terms in a single command', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await service.searchKnowledge('project-1', 'agent-1', userId, {
			query: 'u-net',
			queries: ['unet', 'u net', 'u-net'],
		});

		expect(sandbox.process.executeCommand).toHaveBeenCalledTimes(1);
		expect(sandbox.process.executeCommand).toHaveBeenCalledWith(
			expect.stringContaining("-e 'u-net' -e 'unet' -e 'u net' -- '.'"),
			undefined,
			undefined,
			300,
		);
	});

	it('searchKnowledge returns partial matches when rg fails on an unreadable scoped file', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([
			makeAgentFile(),
			makeAgentFile({ id: 'file-2', storageFileName: 'gone.txt' }),
		]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 2,
			artifacts: {
				stdout:
					'{"type":"match","data":{"path":{"text":"notes.txt"},"lines":{"text":"hello\\n"},"line_number":1}}' +
					'\n',
				stderr: 'rg: ./gone.txt: No such file or directory (os error 2)\n',
			},
		});
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, {
				query: 'hello',
				files: ['notes.txt', 'gone.txt'],
			}),
		).resolves.toMatchObject({
			matches: [{ file: 'notes.txt', lineNumber: 1 }],
			hasMore: true,
			truncated: true,
		});
	});

	it('searchKnowledge fails when rg errors without producing any matches', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 2,
			artifacts: { stdout: '', stderr: 'rg: ./notes.txt: No such file or directory\n' },
		});
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
		).rejects.toThrow('Agent knowledge search failed');
	});

	it('rejects pagination offsets beyond the cap before sandbox execution', async () => {
		mockKnowledgeFiles([makeAgentFile()]);
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello', offset: 1001 }),
		).rejects.toThrow();
		expect(listMock).not.toHaveBeenCalled();
	});

	it('rejects retrieval for agents that do not belong to the project', async () => {
		agentRepository.existsBy.mockResolvedValue(false);
		mockKnowledgeFiles([makeAgentFile()]);
		const service = makeService();

		await expect(service.findKnowledgeFiles('other-project', 'agent-1', {})).rejects.toThrow(
			NotFoundError,
		);
		await expect(
			service.searchKnowledge('other-project', 'agent-1', userId, { query: 'hello' }),
		).rejects.toThrow(NotFoundError);
		expect(agentRepository.existsBy).toHaveBeenCalledWith({
			id: 'agent-1',
			projectId: 'other-project',
		});
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).not.toHaveBeenCalled();
	});

	it('searchKnowledge surfaces sandbox-side output truncation', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout:
					'{"type":"match","data":{"path":{"text":"notes.txt"},"lines":{"text":"hello\\n"},"line_number":1}}' +
					'\n',
				stderr: '__N8N_AGENT_KNOWLEDGE_OUTPUT_TRUNCATED__\n',
			},
		});
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
		).resolves.toMatchObject({
			matches: [{ file: 'notes.txt', lineNumber: 1 }],
			hasMore: true,
			truncated: true,
		});
	});

	it('readKnowledge builds scoped numeric awk commands and parses ranges', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: { stdout: '0\t2\tsecond line\n0\t3\tthird line\n', stderr: '' },
		});
		const service = makeService();

		await expect(
			service.readKnowledge('project-1', 'agent-1', userId, {
				file: 'notes.txt',
				fileId: 'file-1',
				ranges: [{ startLine: 2, endLine: 3 }],
			}),
		).resolves.toEqual({
			file: 'notes.txt',
			fileId: 'file-1',
			displayName: 'notes.txt',
			ranges: [
				{
					startLine: 2,
					endLine: 3,
					lines: [
						{ lineNumber: 2, text: 'second line', truncated: false },
						{ lineNumber: 3, text: 'third line', truncated: false },
					],
					citation: {
						file: 'notes.txt',
						fileId: 'file-1',
						displayName: 'notes.txt',
						startLine: 2,
						endLine: 3,
					},
				},
			],
			truncated: false,
		});

		expect(sandbox.process.executeCommand).toHaveBeenCalledWith(
			expect.stringContaining('awk '),
			undefined,
			undefined,
			300,
		);
		expect(sandbox.process.executeCommand).toHaveBeenCalledWith(
			expect.stringContaining("substr($0, 1, 2001) } NR > 3 { exit }' './notes.txt'"),
			undefined,
			undefined,
			300,
		);
	});

	it('reuses the cached sandbox across operations without re-listing', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' });
		await service.readKnowledge('project-1', 'agent-1', userId, {
			file: 'notes.txt',
			ranges: [{ startLine: 1, endLine: 1 }],
		});

		expect(listMock).toHaveBeenCalledTimes(1);
		expect(sandbox.process.executeCommand).toHaveBeenCalledTimes(2);
	});

	it('coalesces concurrent acquisitions so parallel calls do not create duplicate sandboxes', async () => {
		mockKnowledgeFiles([makeAgentFile()]);
		const service = makeService();

		await Promise.all([
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'world' }),
		]);

		expect(createMock).toHaveBeenCalledTimes(1);
	});

	it('retries once on a fresh sandbox when the cached handle fails mid-command', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockRejectedValueOnce(new Error('sandbox gone'));
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
		).resolves.toMatchObject({ matches: [] });

		expect(sandbox.process.executeCommand).toHaveBeenCalledTimes(2);
		expect(listMock).toHaveBeenCalledTimes(2);
	});

	it('surfaces the failure and drops the cached handle when the retry also fails', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockRejectedValue(new Error('sandbox gone'));
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
		).rejects.toThrow('sandbox gone');
		expect(sandbox.process.executeCommand).toHaveBeenCalledTimes(2);

		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 1,
			artifacts: { stdout: '', stderr: '' },
		});
		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
		).resolves.toMatchObject({ matches: [] });

		expect(listMock).toHaveBeenCalledTimes(3);
	});
});
