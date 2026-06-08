import { Service } from '@n8n/di';
import path from 'node:path/posix';

import type {
	AgentKnowledgeCommandRequest,
	AgentKnowledgeCommandResult,
} from './agent-knowledge-command.types';
import { AgentKnowledgeSandboxConfigService } from './agent-knowledge-sandbox-config.service';
import type { KnowledgeSandboxWorkspace } from './agent-knowledge-sandbox-workspace.service';

const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_READ_RANGE_LINES = 500;

@Service()
export class AgentKnowledgeSandboxCommandService {
	constructor(private readonly sandboxConfigService: AgentKnowledgeSandboxConfigService) {}

	async run(
		workspace: KnowledgeSandboxWorkspace,
		request: AgentKnowledgeCommandRequest,
	): Promise<AgentKnowledgeCommandResult> {
		switch (request.command) {
			case 'search':
				return await this.runSearch(workspace, request);
			case 'read':
				return await this.runRead(workspace, request);
		}
	}

	private async executeSandboxCommand(
		workspace: KnowledgeSandboxWorkspace,
		command: string,
		args: string[],
		publicCommand: AgentKnowledgeCommandRequest['command'],
	): Promise<AgentKnowledgeCommandResult> {
		if (!workspace.sandbox.executeCommand) {
			throw new Error('Agent knowledge sandbox does not support command execution');
		}

		let stdout = '';
		let stderr = '';
		let truncated = false;
		let stdoutFromCallback = false;
		let stderrFromCallback = false;

		const append = (current: string, chunk: string) => {
			const next = Buffer.concat([Buffer.from(current, 'utf8'), Buffer.from(chunk, 'utf8')]);
			if (next.length > MAX_OUTPUT_BYTES) {
				truncated = true;
				return truncateBufferToUtf8String(next, MAX_OUTPUT_BYTES);
			}
			return next.toString('utf8');
		};

		const result = await workspace.sandbox.executeCommand(command, args, {
			cwd: workspace.knowledgeRoot,
			timeout: this.sandboxConfigService.resolveTimeout(),
			onStdout: (chunk: string) => {
				stdoutFromCallback = true;
				stdout = append(stdout, chunk);
			},
			onStderr: (chunk: string) => {
				stderrFromCallback = true;
				stderr = append(stderr, chunk);
			},
		});

		if (!stdoutFromCallback && result.stdout) {
			stdout = append('', result.stdout);
		}
		if (!stderrFromCallback && result.stderr) {
			stderr = append('', result.stderr);
		}
		if (result.timedOut) {
			truncated = true;
		}

		return {
			command: publicCommand,
			exitCode: result.exitCode,
			stdout,
			stderr,
			truncated,
		};
	}

	private safeRelativePath(requestedPath: string, options: { allowRoot?: boolean } = {}): string {
		if (this.hasControlCharacters(requestedPath)) throw new Error('Invalid path');
		if (path.isAbsolute(requestedPath)) throw new Error('Absolute paths are not allowed');
		if (requestedPath.split(/[\\/]/).includes('..')) {
			throw new Error('Parent path segments are not allowed');
		}

		const normalized = path.normalize(requestedPath);
		if (normalized === '.' && !options.allowRoot) {
			throw new Error('Path escapes the knowledge workspace');
		}
		if (normalized === '..' || normalized.startsWith('../')) {
			throw new Error('Path escapes the knowledge workspace');
		}
		return normalized;
	}

	private hasControlCharacters(value: string): boolean {
		for (const character of value) {
			const code = character.charCodeAt(0);
			if (code <= 0x1f || code === 0x7f) return true;
		}
		return false;
	}

	private async runSearch(
		workspace: KnowledgeSandboxWorkspace,
		request: Extract<AgentKnowledgeCommandRequest, { command: 'search' }>,
	): Promise<AgentKnowledgeCommandResult> {
		if (request.pattern.trim() === '') throw new Error('Search pattern is required');

		const files = (request.files ?? ['.']).map((file) =>
			this.safeRelativePath(file, { allowRoot: true }),
		);
		const args = ['--no-heading', '--line-number', '--with-filename', '--color', 'never'];
		if (request.caseInsensitive) args.push('-i');
		if (request.fixedStrings !== false) args.push('-F');
		if (request.outputMode === 'count') args.push('--count');
		if (request.context !== undefined) {
			args.push('-C', String(Math.min(Math.max(request.context, 0), 5)));
		}
		args.push('--', request.pattern, ...files);
		return await this.executeSandboxCommand(workspace, 'rg', args, 'search');
	}

	private async runRead(
		workspace: KnowledgeSandboxWorkspace,
		request: Extract<AgentKnowledgeCommandRequest, { command: 'read' }>,
	): Promise<AgentKnowledgeCommandResult> {
		const file = this.safeRelativePath(request.file);
		const startLine = Math.max(1, request.startLine ?? 1);
		const requestedEndLine =
			request.endLine === undefined
				? startLine + MAX_READ_RANGE_LINES - 1
				: Math.max(startLine, request.endLine);
		const endLine = Math.min(requestedEndLine, startLine + MAX_READ_RANGE_LINES - 1);
		const result = await this.executeSandboxCommand(
			workspace,
			'sed',
			['-n', `${startLine},${endLine}p`, file],
			'read',
		);

		if (requestedEndLine > endLine) {
			return {
				...result,
				truncated: true,
			};
		}

		return result;
	}
}

function truncateBufferToUtf8String(buffer: Buffer, maxBytes: number): string {
	for (let end = maxBytes; end >= 0; end--) {
		const output = buffer.subarray(0, end).toString('utf8');
		if (Buffer.byteLength(output) <= maxBytes) return output;
	}

	return '';
}
