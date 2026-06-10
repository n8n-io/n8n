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
				stdout: 'notes.txt\t1\thello\n',
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
			hasMore: false,
			truncated: false,
		});

		expect(getMock).toHaveBeenCalledWith('listed-sandbox');
		expect(listedSandbox.process.executeCommand).not.toHaveBeenCalled();
		expect(hydratedSandbox.process.executeCommand).toHaveBeenCalled();
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

	it('searchKnowledge builds global fixed-string ripgrep commands and parses matches', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout: './notes.txt:2:hello world\n',
				stderr: '',
			},
		});
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, {
				query: 'hello',
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
				},
			],
			limit: 20,
			hasMore: false,
			truncated: false,
		});

		expect(sandbox.process.executeCommand).toHaveBeenCalledWith(
			expect.stringContaining(
				'timeout 20 rg --fixed-strings --line-number --with-filename --color=never --hidden --max-columns 501 --max-columns-preview --field-match-separator',
			),
			undefined,
			undefined,
			300,
		);
		const command = sandbox.process.executeCommand.mock.calls[0][0] as string;
		expect(command).toContain('bash -o pipefail -c');
		expect(command).toContain('hello');
		expect(command).toContain('| head -n 21');
		expect(command).not.toContain('--context');
		expect(command).not.toContain('--json');
	});

	it('searchKnowledge sets hasMore from the extra bounded match', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout: './notes.txt:1\tfirst\n./notes.txt:2\tsecond\n',
				stderr: '',
			},
		});
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, {
				query: 'hello',
				limit: 1,
			}),
		).resolves.toMatchObject({
			matches: [{ lineNumber: 1, text: 'first' }],
			limit: 1,
			hasMore: true,
			truncated: false,
		});
	});

	it('coalesces concurrent sandbox acquisition for the same scope', async () => {
		const sandbox = makeSandbox('stopped');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout: './notes.txt:1:hello\n',
				stderr: '',
			},
		});
		let resolveStart: () => void = () => {};
		let resolveStartEntered: () => void = () => {};
		const startEntered = new Promise<void>((resolve) => {
			resolveStartEntered = resolve;
		});
		sandbox.start.mockImplementation(async () => {
			resolveStartEntered();
			await new Promise<void>((resolve) => {
				resolveStart = resolve;
			});
		});
		const service = makeService();

		const firstSearch = service.searchKnowledge('project-1', 'agent-1', userId, {
			query: 'hello',
		});
		const secondSearch = service.searchKnowledge('project-1', 'agent-1', userId, {
			query: 'hello',
		});

		await startEntered;
		resolveStart();
		await expect(Promise.all([firstSearch, secondSearch])).resolves.toHaveLength(2);

		expect(listMock).toHaveBeenCalledTimes(1);
		expect(sandbox.start).toHaveBeenCalledTimes(1);
		expect(sandbox.process.executeCommand).toHaveBeenCalledTimes(2);
	});

	it('globKnowledgeFiles runs a sandbox file-name glob and returns matching metadata', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([
			makeAgentFile({
				id: 'file-1',
				storageFileName: 'agent-tool.txt',
				fileName: 'Agent Tool.pdf',
			}),
			makeAgentFile({ id: 'file-2', storageFileName: 'sandbox-notes.txt', fileName: 'Notes.txt' }),
			makeAgentFile({ id: 'file-3', storageFileName: 'workflow.txt', fileName: 'Workflow.pdf' }),
		]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout: 'agent-tool.txt\n',
				stderr: '',
			},
		});
		const service = makeService();

		await expect(
			service.globKnowledgeFiles('project-1', 'agent-1', userId, {
				pattern: '*agent*tool*',
				limit: 1,
			}),
		).resolves.toEqual({
			files: [
				{
					file: 'agent-tool.txt',
					fileId: 'file-1',
					displayName: 'Agent Tool.pdf',
					mimeType: 'text/plain',
					fileSizeBytes: 100,
					createdAt: '2026-06-09T10:00:00.000Z',
				},
			],
			limit: 1,
			hasMore: false,
		});
		expect(sandbox.process.executeCommand).toHaveBeenCalledWith(
			expect.stringContaining('timeout 20 rg --files --hidden --glob'),
			undefined,
			undefined,
			300,
		);
		const command = sandbox.process.executeCommand.mock.calls[0][0] as string;
		expect(command).toContain('bash -o pipefail -c');
		expect(command).toContain('*agent*tool*');
		expect(command).toContain('| head -n 2');
	});

	it.each(['*', '*.txt', '*.md', '**/*.pdf'])(
		'globKnowledgeFiles rejects broad glob pattern %s before sandbox execution',
		async (pattern) => {
			const sandbox = makeSandbox('started');
			mockKnowledgeFiles([makeAgentFile()]);
			const service = makeService();

			await expect(
				service.globKnowledgeFiles('project-1', 'agent-1', userId, {
					pattern,
				}),
			).rejects.toThrow('Use a narrower glob pattern than catch-all or extension-only globs');
			expect(listMock).not.toHaveBeenCalled();
			expect(sandbox.process.executeCommand).not.toHaveBeenCalled();
		},
	);

	it('globKnowledgeFiles surfaces sandbox command failures', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile({ storageFileName: 'population.csv' })]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 124,
			artifacts: { stdout: '', stderr: 'timeout: rg timed out\n' },
		});
		const service = makeService();

		await expect(
			service.globKnowledgeFiles('project-1', 'agent-1', userId, {
				pattern: 'population.csv',
			}),
		).rejects.toThrow(
			'Agent knowledge glob failed; exitCode=124; stderr=timeout: rg timed out; stdout=<empty>',
		);
	});

	it('searchKnowledge scopes ripgrep to a resolved file path', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await service.searchKnowledge('project-1', 'agent-1', userId, {
			query: 'hello',
			fileId: 'file-1',
		});

		const command = sandbox.process.executeCommand.mock.calls[0][0] as string;
		expect(command).toContain('hello');
		expect(command).toContain('./notes.txt');
		expect(command).not.toContain("-- '\\''.'\\''");
	});

	it('searchKnowledge supports regex mode without fixed-string search', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await service.searchKnowledge('project-1', 'agent-1', userId, {
			query: '^Germany,DEU,2022,',
			mode: 'regex',
		});

		expect(sandbox.process.executeCommand).toHaveBeenCalledTimes(1);
		const command = sandbox.process.executeCommand.mock.calls[0][0] as string;
		expect(command).toContain('timeout 20 rg --line-number --with-filename --color=never --hidden');
		expect(command).not.toContain('--fixed-strings');
		expect(command).toContain('^Germany,DEU,2022,');
	});

	it('searchKnowledge surfaces rg failures even when stdout has partial output', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([
			makeAgentFile(),
			makeAgentFile({ id: 'file-2', storageFileName: 'gone.txt' }),
		]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 2,
			artifacts: {
				stdout: 'notes.txt\t1\thello\n',
				stderr: 'rg: ./gone.txt: No such file or directory (os error 2)\n',
			},
		});
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, {
				query: 'hello',
			}),
		).rejects.toThrow(
			'Agent knowledge search failed; exitCode=2; stderr=rg: ./gone.txt: No such file or directory (os error 2); stdout=notes.txt',
		);
	});

	it('searchKnowledge surfaces rg errors without producing output', async () => {
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
		).rejects.toThrow(
			'Agent knowledge search failed; exitCode=2; stderr=rg: ./notes.txt: No such file or directory; stdout=<empty>',
		);
	});

	it('surfaces sandbox command execution errors', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockRejectedValue(new Error('sandbox process unavailable'));
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
		).rejects.toThrow('sandbox process unavailable');
	});

	it('rejects retrieval for agents that do not belong to the project', async () => {
		agentRepository.existsBy.mockResolvedValue(false);
		mockKnowledgeFiles([makeAgentFile()]);
		const service = makeService();

		await expect(
			service.searchKnowledge('other-project', 'agent-1', userId, { query: 'hello' }),
		).rejects.toThrow(NotFoundError);
		await expect(
			service.readKnowledge('other-project', 'agent-1', userId, {
				file: 'notes.txt',
				ranges: [{ startLine: 1, endLine: 1 }],
			}),
		).rejects.toThrow(NotFoundError);
		expect(agentRepository.existsBy).toHaveBeenCalledWith({
			id: 'agent-1',
			projectId: 'other-project',
		});
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).not.toHaveBeenCalled();
	});

	it('searchKnowledge caps individual match text', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout: `notes.txt\t1\t${'a'.repeat(20_100)}\n`,
				stderr: '',
			},
		});
		const service = makeService();

		await expect(
			service.searchKnowledge('project-1', 'agent-1', userId, { query: 'hello' }),
		).resolves.toMatchObject({
			matches: [{ file: 'notes.txt', lineNumber: 1, textTruncated: true }],
			hasMore: false,
			truncated: false,
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
					text: '2|second line\n3|third line',
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
			expect.stringContaining('NR > 3 { exit }'),
			undefined,
			undefined,
			300,
		);
	});

	it('readKnowledge reads a whole file and reports top-level output truncation', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: {
				stdout: '0\t1\tfirst line\n0\t2\tsecond line\n__N8N_READ_OUTPUT_TRUNCATED__\n',
				stderr: '',
			},
		});
		const service = makeService();

		await expect(
			service.readKnowledge('project-1', 'agent-1', userId, {
				file: 'notes.txt',
			}),
		).resolves.toMatchObject({
			ranges: [{ startLine: 1, endLine: 2, text: '1|first line\n2|second line' }],
			truncated: true,
		});
	});

	it('readKnowledge surfaces sandbox command failure details', async () => {
		const sandbox = makeSandbox('started');
		mockKnowledgeFiles([makeAgentFile()]);
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 2,
			artifacts: {
				stdout: 'partial output\n',
				stderr: "awk: can't open file ./notes.txt\n",
			},
		});
		const service = makeService();

		await expect(
			service.readKnowledge('project-1', 'agent-1', userId, {
				file: 'notes.txt',
				ranges: [{ startLine: 1, endLine: 1 }],
			}),
		).rejects.toThrow(
			"Agent knowledge read failed; exitCode=2; stderr=awk: can't open file ./notes.txt; stdout=partial output",
		);
	});
});
