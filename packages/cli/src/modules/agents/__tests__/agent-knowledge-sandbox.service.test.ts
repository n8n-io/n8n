import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock, type MockProxy } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { NotFoundError } from '../../../errors/response-errors/not-found.error';
import type { AiService } from '../../../services/ai.service';

import { AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH } from '../agent-knowledge-storage';
import { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
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

	it('creates a scoped sandbox with the knowledge volume mount', async () => {
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
		expect(params.labels).toEqual({
			'n8n-agents-knowledgebase': 'true',
			'n8n-project-id': 'project-1',
			'n8n-agent-id': 'agent-1',
			'n8n-user-id': userId,
		});
		expect(params.volumes).toEqual([expectedVolumeMount]);
		expect(options).toEqual({ timeout: 300 });
	});

	it('globKnowledgeFiles returns token filename matches before broad glob matches', async () => {
		mockKnowledgeFiles([
			makeAgentFile({
				id: 'file-1',
				storageFileName:
					'2401-12901v3-secure-spatial-signal-design-for-isac-in-a-cell-free-mimo-network.txt',
				fileName:
					'2401-12901v3-secure-spatial-signal-design-for-isac-in-a-cell-free-mimo-network.pdf',
			}),
			makeAgentFile({
				id: 'file-2',
				storageFileName: '2605-27097v1-mildly-overparameterized-relu-networks.txt',
				fileName: '2605-27097v1-mildly-overparameterized-relu-networks.pdf',
			}),
			makeAgentFile({
				id: 'file-3',
				storageFileName: 'u-net.txt',
				fileName: 'u-net.pdf',
			}),
		]);
		const service = makeService();

		await expect(
			service.globKnowledgeFiles('project-1', 'agent-1', userId, {
				pattern: '*U*Net*',
				limit: 1,
			}),
		).resolves.toMatchObject({
			files: [{ file: 'u-net.txt', fileId: 'file-3', displayName: 'u-net.pdf' }],
			limit: 1,
			hasMore: true,
		});
	});

	it('rejects retrieval for agents that do not belong to the project', async () => {
		agentRepository.existsBy.mockResolvedValue(false);
		mockKnowledgeFiles([makeAgentFile()]);
		const service = makeService();

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
});
