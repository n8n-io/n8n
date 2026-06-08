import { AgentKnowledgeSandboxCommandService } from '../agent-knowledge-sandbox-command.service';
import type { AgentKnowledgeSandboxConfigService } from '../agent-knowledge-sandbox-config.service';
import type { KnowledgeSandboxWorkspace } from '../agent-knowledge-sandbox-workspace.service';

function makeWorkspace(executeCommand = jest.fn()): KnowledgeSandboxWorkspace {
	return {
		sandbox: {
			id: 'sandbox-1',
			name: 'Sandbox',
			provider: 'n8n-sandbox',
			status: 'running',
			executeCommand,
		},
		filesystem: {} as KnowledgeSandboxWorkspace['filesystem'],
		provider: 'n8n-sandbox',
		workspaceRoot: '/home/user/workspace',
		knowledgeRoot: '/home/user/workspace/agent-knowledge',
		internalRoot: '/home/user/workspace/.agent-knowledge-internal',
		manifestPath: '/home/user/workspace/.agent-knowledge-internal/manifest.json',
	};
}

const commandResult = (stdout: string, timedOut = false) => ({
	success: true,
	exitCode: 0,
	stdout,
	stderr: '',
	executionTimeMs: 1,
	timedOut,
});

describe('AgentKnowledgeSandboxCommandService', () => {
	let service: AgentKnowledgeSandboxCommandService;
	let sandboxConfigService: jest.Mocked<AgentKnowledgeSandboxConfigService>;

	beforeEach(() => {
		sandboxConfigService = {
			resolveConfig: jest.fn(() => ({
				enabled: true,
				provider: 'n8n-sandbox',
				serviceUrl: 'https://sandbox.example.test',
				timeout: 12_345,
			})),
			resolveTimeout: jest.fn(() => 12_345),
		} as unknown as jest.Mocked<AgentKnowledgeSandboxConfigService>;
		service = new AgentKnowledgeSandboxCommandService(sandboxConfigService);
	});

	it('uses resolveTimeout for command execution timeout', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult('a.txt:1\n'));
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, { command: 'search', pattern: 'needle', files: ['a.txt'] });

		expect(sandboxConfigService.resolveTimeout).toHaveBeenCalled();
		expect(sandboxConfigService.resolveConfig).not.toHaveBeenCalled();
	});

	it('runs rg from the knowledge root and supports scoped search options', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult('a.txt:1\n'));
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, {
			command: 'search',
			pattern: 'needle',
			outputMode: 'count',
			caseInsensitive: true,
			context: 9,
			fixedStrings: false,
			files: ['a.txt'],
		});

		expect(executeCommand).toHaveBeenCalledWith(
			'rg',
			expect.arrayContaining(['-i', '--count', '-C', '5', '--', 'needle', 'a.txt']),
			expect.objectContaining({ cwd: workspace.knowledgeRoot, timeout: 12_345 }),
		);
	});

	it('runs sed from the knowledge root for clamped read ranges', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult('line 2\n'));
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'read',
			file: 'notes.txt',
			startLine: 10,
			endLine: 1000,
		});

		expect(executeCommand).toHaveBeenCalledWith(
			'sed',
			['-n', '10,509p', 'notes.txt'],
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
		expect(result.truncated).toBe(true);
	});

	it('rejects unsafe paths before executing commands', async () => {
		const executeCommand = jest.fn();
		const workspace = makeWorkspace(executeCommand);

		await expect(
			service.run(workspace, { command: 'search', pattern: 'needle', files: ['/etc/passwd'] }),
		).rejects.toThrow('Absolute paths are not allowed');
		await expect(
			service.run(workspace, { command: 'read', file: '../secret.txt' }),
		).rejects.toThrow('Parent path segments are not allowed');
		expect(executeCommand).not.toHaveBeenCalled();
	});

	it('truncates stdout without breaking UTF-8', async () => {
		const workspace = makeWorkspace(
			jest.fn().mockResolvedValueOnce(commandResult('é'.repeat(40_000))),
		);

		const result = await service.run(workspace, { command: 'read', file: 'notes.txt' });

		expect(result.truncated).toBe(true);
		expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(64 * 1024);
	});

	it('throws a clear error when command execution is unavailable', async () => {
		const workspace = makeWorkspace();
		workspace.sandbox = { ...workspace.sandbox, executeCommand: undefined };

		await expect(service.run(workspace, { command: 'read', file: 'notes.txt' })).rejects.toThrow(
			'Agent knowledge sandbox does not support command execution',
		);
	});
});
