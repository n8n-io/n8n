import type { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH } from '../agent-knowledge-storage';
import {
	AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX,
	AgentKnowledgeSandboxService,
	SEARCH_KNOWLEDGE_SANDBOX_CREATED,
	SEARCH_KNOWLEDGE_SANDBOX_REUSED,
} from '../agent-knowledge-sandbox.service';

interface MockFilesystem {
	downloadFile: jest.Mock;
	uploadFile: jest.Mock;
	createFolder: jest.Mock;
	deleteFile: jest.Mock;
}

interface MockSandbox {
	state?: string;
	volumes?: Array<{ volumeId: string; mountPath: string; subpath?: string }>;
	start: jest.Mock<Promise<void>, [number]>;
	fs: MockFilesystem;
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

class MockDaytona {
	constructor(public readonly config: { apiUrl?: string; apiKey?: string }) {}

	list = listMock;
	create = createMock;
}

jest.mock('@n8n/agents/sandbox', () => ({
	loadDaytona: () => ({
		Daytona: MockDaytona,
	}),
}));

const volumeId = 'vol-1';
const expectedVolumeMount = {
	volumeId,
	mountPath: AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	subpath: 'agent-knowledge/projects/project-1/agents/agent-1/knowledge',
};

function makeService(configOverrides: Partial<AgentsConfig> = {}): AgentKnowledgeSandboxService {
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
		mock<Logger>(),
	);
}

function makeFilesystem(): MockFilesystem {
	return {
		downloadFile: jest.fn<Promise<Buffer>, [string]>(async () => Buffer.from('')),
		uploadFile: jest.fn<Promise<void>, [Buffer, string]>(async () => {}),
		createFolder: jest.fn<Promise<void>, [string, string]>(async () => {}),
		deleteFile: jest.fn<Promise<void>, [string, boolean?]>(async () => {}),
	};
}

function makeSandbox(state = 'started', volumes = [expectedVolumeMount]): MockSandbox {
	return {
		state,
		volumes,
		start: jest.fn<Promise<void>, [number]>(async () => {}),
		fs: makeFilesystem(),
	};
}

describe('AgentKnowledgeSandboxService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		listMock.mockResolvedValue({ items: [], totalPages: 1 });
		createMock.mockResolvedValue(makeSandbox('started'));
	});

	it('returns sandbox reused when list yields a started sandbox with matching volume mount', async () => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await expect(service.ensureSandbox('project-1', 'agent-1')).resolves.toBe(
			SEARCH_KNOWLEDGE_SANDBOX_REUSED,
		);
		expect(createMock).not.toHaveBeenCalled();
		expect(sandbox.start).not.toHaveBeenCalled();
	});

	it('starts and returns sandbox reused when a matching sandbox is stopped', async () => {
		const sandbox = makeSandbox('stopped');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await expect(service.ensureSandbox('project-1', 'agent-1')).resolves.toBe(
			SEARCH_KNOWLEDGE_SANDBOX_REUSED,
		);
		expect(sandbox.start).toHaveBeenCalledWith(300);
		expect(createMock).not.toHaveBeenCalled();
	});

	it('starts and returns sandbox reused when a matching sandbox is archived', async () => {
		const sandbox = makeSandbox('archived');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await expect(service.ensureSandbox('project-1', 'agent-1')).resolves.toBe(
			SEARCH_KNOWLEDGE_SANDBOX_REUSED,
		);
		expect(sandbox.start).toHaveBeenCalledWith(300);
		expect(createMock).not.toHaveBeenCalled();
	});

	it('skips dead-state matches and creates a new sandbox when no usable match exists', async () => {
		listMock.mockResolvedValue({
			items: [
				makeSandbox('destroyed'),
				makeSandbox('destroying'),
				makeSandbox('error'),
				makeSandbox('build_failed'),
			],
			totalPages: 1,
		});
		const service = makeService();

		await expect(service.ensureSandbox('project-1', 'agent-1')).resolves.toBe(
			SEARCH_KNOWLEDGE_SANDBOX_CREATED,
		);
		expect(createMock).toHaveBeenCalledTimes(1);
	});

	it('skips sandboxes without the expected volume mount and creates a new sandbox', async () => {
		listMock.mockResolvedValue({
			items: [makeSandbox('started', [])],
			totalPages: 1,
		});
		const service = makeService();

		await expect(service.ensureSandbox('project-1', 'agent-1')).resolves.toBe(
			SEARCH_KNOWLEDGE_SANDBOX_CREATED,
		);
		expect(createMock).toHaveBeenCalledTimes(1);
	});

	it('continues scanning pages until it finds a usable sandbox', async () => {
		const reusableSandbox = makeSandbox('started');
		listMock.mockImplementation(async (_labels, page) => {
			if (page === 1) {
				return { items: [makeSandbox('destroyed')], totalPages: 2 };
			}
			return { items: [reusableSandbox], totalPages: 2 };
		});
		const service = makeService();

		await expect(service.ensureSandbox('project-1', 'agent-1')).resolves.toBe(
			SEARCH_KNOWLEDGE_SANDBOX_REUSED,
		);
		expect(listMock).toHaveBeenCalledTimes(2);
		expect(createMock).not.toHaveBeenCalled();
	});

	it('creates a sandbox with scoped labels, volume mount, and expected params when list is empty', async () => {
		const service = makeService();

		await expect(service.ensureSandbox('project-1', 'agent-1')).resolves.toBe(
			SEARCH_KNOWLEDGE_SANDBOX_CREATED,
		);

		expect(createMock).toHaveBeenCalledTimes(1);
		const [params, options] = createMock.mock.calls[0];
		expect(params.name).toMatch(
			new RegExp(`^${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}-[0-9a-f-]{36}$`),
		);
		expect(params.labels).toEqual({
			'n8n-agents-knowledgebase': 'true',
			'n8n-project-id': 'project-1',
			'n8n-agent-id': 'agent-1',
		});
		expect(params.language).toBe('typescript');
		expect(params.image).toBe('daytonaio/sandbox:0.5.0');
		expect(params.autoStopInterval).toBe(5);
		expect(params.volumes).toEqual([expectedVolumeMount]);
		expect(options).toEqual({ timeout: 300 });
	});

	it('rejects before calling Daytona when the volume id is missing', async () => {
		const service = makeService({ daytonaVolumeId: '' });

		await expect(service.ensureSandbox('project-1', 'agent-1')).rejects.toThrow(
			'Agent knowledge Daytona volume is not configured',
		);
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).not.toHaveBeenCalled();
	});

	it.each([
		{ sandboxEnabled: false, sandboxProvider: 'daytona' as const },
		{ sandboxEnabled: true, sandboxProvider: 'n8n-sandbox' as const },
	])(
		'rejects before calling Daytona when sandboxEnabled=$sandboxEnabled and sandboxProvider=$sandboxProvider',
		async (configOverrides) => {
			const service = makeService(configOverrides);

			await expect(service.ensureSandbox('project-1', 'agent-1')).rejects.toThrow(
				'Agent knowledge sandbox is not enabled',
			);
			expect(listMock).not.toHaveBeenCalled();
			expect(createMock).not.toHaveBeenCalled();
		},
	);

	it('passes the mounted filesystem to withKnowledgeFilesystem callbacks', async () => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await service.withKnowledgeFilesystem('project-1', 'agent-1', async (filesystem) => {
			await filesystem.writeFile('/home/daytona/workspace/agent-knowledge/files/note.txt', 'hello');
			return filesystem.readFile('/home/daytona/workspace/agent-knowledge/files/note.txt');
		});

		expect(sandbox.fs.uploadFile).toHaveBeenCalledWith(
			Buffer.from('hello', 'utf-8'),
			'/home/daytona/workspace/agent-knowledge/files/note.txt',
		);
		expect(sandbox.fs.downloadFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/files/note.txt',
		);
	});
});
