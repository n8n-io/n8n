import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { AiService } from '../../../services/ai.service';

import { AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH } from '../agent-knowledge-storage';
import { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';

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
	subpath: `${instanceId}/agent-knowledge/projects/project-1/agents/agent-1/knowledge`,
};
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

describe('AgentKnowledgeSandboxService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
});
