import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { createHash } from 'node:crypto';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { AiService } from '../../../services/ai.service';

import { AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH } from '../agent-knowledge-storage';
import {
	AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX,
	AgentKnowledgeSandboxService,
} from '../agent-knowledge-sandbox.service';
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
	delete: jest.Mock<Promise<void>, [number]>;
	fs: MockFilesystem;
	process: MockProcess;
}

async function* asyncSandboxes(...items: MockSandbox[]): AsyncIterableIterator<MockSandbox> {
	for (const item of items) {
		yield item;
	}
}

class DaytonaNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DaytonaNotFoundError';
	}
}

const listMock = jest.fn<
	AsyncIterableIterator<MockSandbox>,
	[{ labels?: Record<string, string>; limit?: number }?]
>();
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
		DaytonaNotFoundError,
	}),
}));

const volumeId = 'vol-1';
const userId = 'user-1';
const instanceId = 'instance-1';
const projectId = 'project-1';
const agentId = 'agent-1';
const expectedVolumeMount = {
	volumeId,
	mountPath: AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	subpath: `${instanceId}/agent-knowledge/projects/${projectId}/agents/${agentId}/knowledge`,
};

function buildExpectedSandboxName(): string {
	const hash = createHash('sha256')
		.update(
			JSON.stringify({
				instanceId,
				projectId,
				agentId,
				ownerUserId: userId,
				sandboxScopeId: userId,
			}),
		)
		.digest('hex')
		.slice(0, 32);
	return `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}-${hash}`;
}

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
			sandboxSnapshot: '',
			sandboxTimeout: 300_000,
			sandboxEphemeral: false,
			daytonaApiUrl: 'https://daytona.example',
			daytonaApiKey: 'test-key',
			daytonaVolumeId: volumeId,
			...configOverrides,
		} as AgentsConfig,
		logger,
		aiService,
		instanceSettings,
		mock<AgentFileRepository>(),
		mock<AgentRepository>(),
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
		name: overrides.name ?? buildExpectedSandboxName(),
		state,
		volumes,
		start: jest.fn<Promise<void>, [number]>(async () => {}),
		delete: jest.fn<Promise<void>, [number]>(async () => {}),
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
		listMock.mockReturnValue(asyncSandboxes());
		createMock.mockResolvedValue(makeSandbox('started'));
		getMock.mockRejectedValue(new DaytonaNotFoundError('not found'));
	});

	it('creates a scoped sandbox with the knowledge volume mount', async () => {
		const aiService = makeAiService();
		const service = makeService({}, mock<Logger>(), aiService);
		const expectedName = buildExpectedSandboxName();

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		expect(aiService.getClient).not.toHaveBeenCalled();
		expect(daytonaInstances).toHaveLength(1);
		expect(daytonaInstances[0].config).toEqual({
			apiUrl: 'https://daytona.example',
			apiKey: 'test-key',
		});
		expect(getMock).toHaveBeenCalledWith(expectedName);
		expect(getMock.mock.invocationCallOrder[0]).toBeLessThan(listMock.mock.invocationCallOrder[0]);
		expect(createMock).toHaveBeenCalledTimes(1);
		const [params, options] = createMock.mock.calls[0];
		expect(params.name).toBe(expectedName);
		expect(params.name).toMatch(/^agents-knowledgebase-[a-f0-9]{32}$/);
		expect(params.labels).toEqual({
			'n8n-agents-knowledgebase': 'true',
			'n8n-project-id': projectId,
			'n8n-agent-id': agentId,
			'n8n-user-id': userId,
			'n8n-agents-sandbox-scope-id': userId,
		});
		expect(params.volumes).toEqual([expectedVolumeMount]);
		expect(params.ephemeral).toBe(false);
		expect(params.image).toBe('daytonaio/sandbox:0.5.0');
		expect(params.snapshot).toBeUndefined();
		expect(options).toEqual({ timeout: 300 });
	});

	it('forwards sandboxEphemeral config to Daytona create params', async () => {
		const service = makeService({ sandboxEphemeral: true });

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		expect(getMock).toHaveBeenCalledWith(buildExpectedSandboxName());
		const [params] = createMock.mock.calls[0];
		expect(params.ephemeral).toBe(true);
	});

	it('does not include daytonaVolumeId in deterministic sandbox name', async () => {
		const changedVolumeMount = { ...expectedVolumeMount, volumeId: 'vol-2' };
		const service = makeService({ daytonaVolumeId: changedVolumeMount.volumeId });

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		expect(getMock).toHaveBeenCalledWith(buildExpectedSandboxName());
		const [params] = createMock.mock.calls[0];
		expect(params.name).toBe(buildExpectedSandboxName());
		expect(params.volumes).toEqual([changedVolumeMount]);
	});

	it('reuses deterministic sandbox by name without listing', async () => {
		const sandbox = makeSandbox('started');
		getMock.mockResolvedValue(sandbox);
		const service = makeService();

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		expect(getMock).toHaveBeenCalledWith(buildExpectedSandboxName());
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).not.toHaveBeenCalled();
	});

	it('starts a stopped deterministic sandbox before reuse', async () => {
		const sandbox = makeSandbox('stopped');
		getMock.mockResolvedValue(sandbox);
		const service = makeService();

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		expect(sandbox.start).toHaveBeenCalledWith(300);
		expect(createMock).not.toHaveBeenCalled();
	});

	it('deletes dead deterministic sandbox and recreates it', async () => {
		const sandbox = makeSandbox('error');
		getMock.mockResolvedValueOnce(sandbox);
		const service = makeService();
		const expectedName = buildExpectedSandboxName();

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		expect(sandbox.delete).toHaveBeenCalledWith(300);
		expect(createMock).toHaveBeenCalledTimes(1);
		expect(createMock.mock.calls[0][0].name).toBe(expectedName);
	});

	it('falls back to label scan for old random-name sandboxes', async () => {
		const legacySandbox = makeSandbox('started', [expectedVolumeMount], {
			name: 'agents-knowledgebase-legacy-random-name',
		});
		listMock.mockReturnValue(asyncSandboxes(legacySandbox));
		const service = makeService();

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		expect(getMock).toHaveBeenCalledWith(buildExpectedSandboxName());
		expect(listMock).toHaveBeenCalledTimes(1);
		expect(createMock).not.toHaveBeenCalled();
	});

	it('creates a sandbox from configured snapshot', async () => {
		const service = makeService({ sandboxSnapshot: 'n8n/agent-knowledge:1.2.3' });
		const expectedName = buildExpectedSandboxName();

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		expect(createMock).toHaveBeenCalledTimes(1);
		const [params] = createMock.mock.calls[0];
		expect(params.snapshot).toBe('n8n/agent-knowledge:1.2.3');
		expect(params.image).toBeUndefined();
		expect(params.name).toBe(expectedName);
		expect(params.ephemeral).toBe(false);
		expect(params.autoStopInterval).toBe(5);
		expect(params.volumes).toEqual([expectedVolumeMount]);
	});

	it('falls back to image when configured snapshot create fails', async () => {
		const logger = mock<Logger>();
		createMock
			.mockRejectedValueOnce(new Error('snapshot missing'))
			.mockResolvedValueOnce(makeSandbox('started'));
		const service = makeService({ sandboxSnapshot: 'n8n/agent-knowledge:missing' }, logger);

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

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

		await service.withKnowledgeFilesystem(projectId, agentId, userId, async () => {});

		const [params] = createMock.mock.calls[0];
		expect(params.image).toBe('daytonaio/sandbox:0.5.0');
		expect(params.snapshot).toBeUndefined();
	});
});
