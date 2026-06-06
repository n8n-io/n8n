import { AgentKnowledgeSandboxCommandService } from '../agent-knowledge-sandbox-command.service';
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

function capabilityProbeResult(tools: string[]) {
	return {
		success: true,
		exitCode: 0,
		stdout: tools.join('\n'),
		stderr: '',
		executionTimeMs: 1,
	};
}

describe('AgentKnowledgeSandboxCommandService', () => {
	let service: AgentKnowledgeSandboxCommandService;

	beforeEach(() => {
		service = new AgentKnowledgeSandboxCommandService();
	});

	it('search prefers rg when available', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['rg', 'grep', 'sed', 'node', 'cat']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: 'file-1-notes.txt:2:needle\n',
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'git_grep',
			pattern: 'needle',
			fixedStrings: true,
		});

		expect(result.command).toBe('git_grep');
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('needle');
		expect(executeCommand).toHaveBeenCalledTimes(2);
		expect(executeCommand.mock.calls[1]?.[0]).toBe('rg');
		const rgArgs = executeCommand.mock.calls[1]?.[1];
		expect(rgArgs).toEqual(
			expect.arrayContaining([
				'--no-heading',
				'--line-number',
				'--with-filename',
				'-F',
				'--',
				'needle',
				'.',
			]),
		);
		expect(rgArgs).not.toContain('-I');
	});

	it('search falls back to grep when rg is unavailable', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['grep', 'sed', 'node', 'cat']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: 'file-1-notes.txt:2:needle\n',
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'git_grep',
			pattern: 'needle',
			fixedStrings: true,
		});

		expect(result.command).toBe('git_grep');
		expect(executeCommand.mock.calls[1]?.[0]).toBe('grep');
		expect(executeCommand.mock.calls[1]?.[1]).toEqual(
			expect.arrayContaining(['-R', '-n', '-I', '-H', '-F', '--', 'needle', '.']),
		);
	});

	it('search count uses count flags', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['rg', 'grep']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: 'file-1-notes.txt:1\n',
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, {
			command: 'git_grep',
			pattern: 'needle',
			outputMode: 'count',
			fixedStrings: true,
		});

		expect(executeCommand.mock.calls[1]?.[1]).toEqual(expect.arrayContaining(['--count']));
	});

	it('search clamps context to 0-5', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['rg']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: '',
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, {
			command: 'git_grep',
			pattern: 'needle',
			context: 9,
			fixedStrings: true,
		});

		expect(executeCommand.mock.calls[1]?.[1]).toEqual(expect.arrayContaining(['-C', '5']));
	});

	it('read uses node when available', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['node', 'cat']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: 'hello world',
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'cat',
			file: 'notes.txt',
		});

		expect(result.command).toBe('cat');
		expect(executeCommand.mock.calls[1]?.[0]).toBe('node');
	});

	it('line range read uses sed fallback when node is unavailable', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['sed', 'cat']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: 'line 2\nline 3\n',
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'sed',
			file: 'notes.txt',
			startLine: 2,
			endLine: 3,
		});

		expect(result.command).toBe('sed');
		expect(executeCommand.mock.calls[1]?.[0]).toBe('sed');
		expect(executeCommand.mock.calls[1]?.[1]).toEqual(['-n', '2,3p', 'notes.txt']);
	});

	it('rejects absolute paths, parent segments, and control characters', async () => {
		const executeCommand = jest.fn();
		const workspace = makeWorkspace(executeCommand);

		await expect(service.run(workspace, { command: 'cat', file: '/etc/passwd' })).rejects.toThrow(
			'Absolute paths are not allowed',
		);
		await expect(service.run(workspace, { command: 'cat', file: '../secret.txt' })).rejects.toThrow(
			'Parent path segments are not allowed',
		);
		await expect(
			service.run(workspace, { command: 'cat', file: 'notes\u0000.txt' }),
		).rejects.toThrow('Invalid path');
		expect(executeCommand).not.toHaveBeenCalled();
	});

	it('truncates stdout without breaking UTF-8', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['node']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: 'é'.repeat(40_000),
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, { command: 'cat', file: 'notes.txt' });

		expect(result.truncated).toBe(true);
		expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(64 * 1024);
	});

	it('throws clear error when sandbox lacks search tools', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(capabilityProbeResult(['node', 'cat']));
		const workspace = makeWorkspace(executeCommand);

		await expect(
			service.run(workspace, { command: 'git_grep', pattern: 'needle', fixedStrings: true }),
		).rejects.toThrow('Agent knowledge sandbox requires rg or grep for search');
	});

	it('scopes search commands to the knowledge root cwd', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['rg']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: 'file-1-notes.txt:1:needle\n',
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, {
			command: 'git_grep',
			pattern: 'needle',
			fixedStrings: true,
		});

		expect(executeCommand.mock.calls[0]?.[2]).toEqual(
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
		expect(executeCommand.mock.calls[1]?.[2]).toEqual(
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
		const rgArgs = executeCommand.mock.calls[1]?.[1];
		expect(rgArgs).toEqual(expect.arrayContaining(['.', 'needle']));
		expect(rgArgs).not.toContain(workspace.manifestPath);
		expect(rgArgs).not.toContain(workspace.internalRoot);
	});

	it('clamps read line ranges to 500 lines', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(capabilityProbeResult(['sed']))
			.mockResolvedValueOnce({
				success: true,
				exitCode: 0,
				stdout: 'line 2\n',
				stderr: '',
				executionTimeMs: 1,
			});
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, {
			command: 'sed',
			file: 'notes.txt',
			startLine: 2,
			endLine: 900,
		});

		expect(executeCommand.mock.calls[1]?.[1]).toEqual(['-n', '2,502p', 'notes.txt']);
	});

	it('throws clear error when executeCommand is missing', async () => {
		const workspace = makeWorkspace();
		workspace.sandbox = {
			...workspace.sandbox,
			executeCommand: undefined,
		};

		await expect(service.run(workspace, { command: 'cat', file: 'notes.txt' })).rejects.toThrow(
			'Agent knowledge sandbox does not support command execution',
		);
	});
});
