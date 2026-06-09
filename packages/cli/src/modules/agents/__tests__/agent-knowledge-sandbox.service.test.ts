import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '../../../errors/response-errors/bad-request.error';

import { AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH, KNOWLEDGE_FILES_DIR } from '../agent-knowledge-storage';
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

class MockDaytona {
	constructor(readonly config: { apiUrl?: string; apiKey?: string }) {}

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

function makeService(
	configOverrides: Partial<AgentsConfig> = {},
	logger: Logger = mock<Logger>(),
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
		expect(params.ephemeral).toBe(true);
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

	it('clamps command operation timeout bounds', async () => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await service.runKnowledgeCommand('project-1', 'agent-1', {
			command: 'wc -l notes.txt',
			timeoutMs: 1_000,
		});
		expect(sandbox.process.executeCommand).toHaveBeenLastCalledWith(
			expect.any(String),
			undefined,
			undefined,
			10,
		);

		await service.runKnowledgeCommand('project-1', 'agent-1', {
			command: 'wc -l notes.txt',
			timeoutMs: 300_000,
		});
		expect(sandbox.process.executeCommand).toHaveBeenLastCalledWith(
			expect.any(String),
			undefined,
			undefined,
			120,
		);
	});

	it('passes the mounted filesystem to withKnowledgeFilesystem callbacks', async () => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await service.withKnowledgeFilesystem('project-1', 'agent-1', async (filesystem) => {
			await filesystem.writeFile('/home/daytona/workspace/agent-knowledge/files/note.txt', 'hello');
			return await filesystem.readFile('/home/daytona/workspace/agent-knowledge/files/note.txt');
		});

		expect(sandbox.fs.uploadFile).toHaveBeenCalledWith(
			Buffer.from('hello', 'utf-8'),
			'/home/daytona/workspace/agent-knowledge/files/note.txt',
		);
		expect(sandbox.fs.downloadFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/files/note.txt',
		);
	});

	it.each([
		'rg --files | rg -i "9000|quic|rfc" | head -20',
		'grep -n -i "flow control" rfc-9000-quic.txt | head -40',
		'rg -n --no-heading --color=never "ClientHello" rfc-8446-tls-13.txt | head -20',
		'awk \'NR >= 10 && NR <= 20 { print NR ":" $0 }\' rfc-9110-http-semantics.txt',
		"sed -n '10,20p' rfc-9110-http-semantics.txt",
		'wc -l rfc-9000-quic.txt',
	])('runKnowledgeCommand allows read-only discovery command: %s', async (command) => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: { stdout: '42:flow control\n', stderr: '' },
		});
		const service = makeService();

		await expect(service.runKnowledgeCommand('project-1', 'agent-1', { command })).resolves.toEqual(
			{
				exitCode: 0,
				stdout: '42:flow control\n',
				stderr: '',
				stdoutTruncated: false,
				stderrTruncated: false,
			},
		);

		expect(sandbox.process.executeCommand).toHaveBeenCalledWith(
			`if [ ! -d ${KNOWLEDGE_FILES_DIR} ]; then exit 0; fi; cd ${KNOWLEDGE_FILES_DIR} && ${command}`,
			undefined,
			undefined,
			300,
		);
	});

	it.each([
		'rm -rf .',
		'find . -delete',
		'grep term file > out.txt',
		'cat file | tee copy.txt',
		'sh -c "grep term file"',
		'node -e "console.log(1)"',
		'curl https://example.com',
		'python script.py',
		"sed -i 's/a/b/' file",
		"sed --in-place 's/a/b/' file",
		"sed -n '1w out.txt' file",
		"sed 's/a/b/e' file",
		'sort -o sorted.txt source.txt',
		'awk \'BEGIN { system("rm file") }\' notes.txt',
		'awk \'{ print > "out.txt" }\' notes.txt',
		'grep $(rm file) notes.txt',
		'grep term file; wc -l file',
		'grep term file && wc -l file',
		'grep term file || wc -l file',
		'grep `rm file` notes.txt',
		'grep "$(rm file)" notes.txt',
	])('rejects disallowed or destructive command before sandbox execution: %s', async (command) => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await expect(service.runKnowledgeCommand('project-1', 'agent-1', { command })).rejects.toThrow(
			BadRequestError,
		);
		expect(listMock).not.toHaveBeenCalled();
		expect(createMock).not.toHaveBeenCalled();
		expect(sandbox.process.executeCommand).not.toHaveBeenCalled();
	});

	it('runKnowledgeCommand returns non-zero exit codes without throwing', async () => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 2,
			artifacts: { stdout: '', stderr: 'command failed' },
		});
		const service = makeService();

		await expect(
			service.runKnowledgeCommand('project-1', 'agent-1', { command: 'grep missing notes.txt' }),
		).resolves.toEqual({
			exitCode: 2,
			stdout: '',
			stderr: 'command failed',
			stdoutTruncated: false,
			stderrTruncated: false,
		});
	});

	it('runKnowledgeCommand truncates oversized stdout and stderr', async () => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const oversizedOutput = 'x'.repeat(20_001);
		sandbox.process.executeCommand.mockResolvedValue({
			exitCode: 0,
			artifacts: { stdout: oversizedOutput, stderr: oversizedOutput },
		});
		const service = makeService();

		await expect(
			service.runKnowledgeCommand('project-1', 'agent-1', { command: 'cat large.txt' }),
		).resolves.toEqual({
			exitCode: 0,
			stdout: 'x'.repeat(20_000),
			stderr: 'x'.repeat(20_000),
			stdoutTruncated: true,
			stderrTruncated: true,
		});
	});

	it.each(['', '   '])('rejects empty knowledge commands before executing: %j', async (command) => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await expect(service.runKnowledgeCommand('project-1', 'agent-1', { command })).rejects.toThrow(
			BadRequestError,
		);
		expect(sandbox.process.executeCommand).not.toHaveBeenCalled();
	});

	it('rejects knowledge commands longer than the max length before executing', async () => {
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const service = makeService();

		await expect(
			service.runKnowledgeCommand('project-1', 'agent-1', {
				command: 'a'.repeat(2_001),
			}),
		).rejects.toThrow(BadRequestError);
		expect(sandbox.process.executeCommand).not.toHaveBeenCalled();
	});

	it('logs a failure when sandbox command execution throws', async () => {
		const logger = mock<Logger>();
		const sandbox = makeSandbox('started');
		listMock.mockResolvedValue({ items: [sandbox], totalPages: 1 });
		const executionError = new Error('sandbox command failed');
		sandbox.process.executeCommand.mockRejectedValue(executionError);
		const service = makeService({}, logger);

		await expect(
			service.runKnowledgeCommand('project-1', 'agent-1', { command: 'wc -l notes.txt' }),
		).rejects.toThrow('sandbox command failed');

		expect(logger.warn).toHaveBeenCalledWith(
			'Agent knowledge operation failed',
			expect.objectContaining({
				projectId: 'project-1',
				agentId: 'agent-1',
				operation: 'command',
				command: 'wc -l notes.txt',
				error: executionError,
			}),
		);
	});
});
