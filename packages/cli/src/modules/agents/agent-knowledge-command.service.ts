import { Service } from '@n8n/di';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const MAX_OUTPUT_BYTES = 64 * 1024;
const COMMAND_TIMEOUT_MS = 5_000;
export const AGENT_KNOWLEDGE_COMMANDS = ['git_grep', 'cat', 'sed'] as const;

export type AgentKnowledgeCommand = (typeof AGENT_KNOWLEDGE_COMMANDS)[number];

export type AgentKnowledgeCommandRequest =
	| {
			command: 'git_grep';
			pattern: string;
			outputMode?: 'count';
			caseInsensitive?: boolean;
			fixedStrings?: boolean;
			context?: number;
			files?: string[];
	  }
	| {
			command: 'cat';
			file: string;
	  }
	| {
			command: 'sed';
			file: string;
			startLine: number;
			endLine: number;
	  };

export interface AgentKnowledgeCommandResult {
	command: AgentKnowledgeCommand;
	exitCode: number | null;
	stdout: string;
	stderr: string;
	truncated: boolean;
}

type SafePathOptions = { allowRoot?: boolean };

@Service()
export class AgentKnowledgeCommandService {
	async run(workspaceRoot: string, request: AgentKnowledgeCommandRequest) {
		const root = await realpath(workspaceRoot);
		const { executable, args } = await this.toSpawnArgs(root, request);
		return await this.spawnCommand(root, executable, args, request.command);
	}

	async withWorkspace<T>(operation: (workspaceRoot: string) => Promise<T>) {
		const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'n8n-agent-knowledge-'));
		try {
			return await operation(workspaceRoot);
		} finally {
			await rm(workspaceRoot, { recursive: true, force: true });
		}
	}

	private async toSpawnArgs(
		root: string,
		request: AgentKnowledgeCommandRequest,
	): Promise<{ executable: string; args: string[] }> {
		switch (request.command) {
			case 'git_grep': {
				if (request.pattern.trim() === '') throw new Error('Search pattern is required');
				const args = ['grep', '--no-index', '-n', '-I'];
				if (request.caseInsensitive) args.push('-i');
				if (request.fixedStrings) args.push('-F');
				if (request.fixedStrings === false) args.push('-E');
				if (request.outputMode === 'count') args.push('-c');
				if (request.context !== undefined) {
					args.push('-C', String(Math.min(Math.max(request.context, 0), 5)));
				}
				args.push('--', request.pattern);
				const files = await Promise.all(
					(request.files ?? ['.']).map(
						async (file) => await this.safePath(root, file, { allowRoot: true }),
					),
				);
				args.push(...files.map((file) => path.relative(root, file) || '.'));
				return { executable: 'git', args };
			}
			case 'cat': {
				const file = await this.safePath(root, request.file);
				return { executable: 'cat', args: [path.relative(root, file)] };
			}
			case 'sed': {
				const file = await this.safePath(root, request.file);
				const startLine = Math.max(1, request.startLine);
				const endLine = Math.max(startLine, request.endLine);
				return {
					executable: 'sed',
					args: [
						'-n',
						`${startLine},${Math.min(endLine, startLine + 500)}p`,
						path.relative(root, file),
					],
				};
			}
		}
	}

	private async safePath(root: string, requestedPath: string, options: SafePathOptions = {}) {
		if (this.hasControlCharacters(requestedPath)) throw new Error('Invalid path');
		if (path.isAbsolute(requestedPath)) throw new Error('Absolute paths are not allowed');
		if (requestedPath.split(/[\\/]/).includes('..')) {
			throw new Error('Parent path segments are not allowed');
		}
		const resolved = path.resolve(root, requestedPath);
		const actual = await realpath(resolved);
		const relative = path.relative(root, actual);
		if (
			(!options.allowRoot && relative === '') ||
			relative.startsWith('..') ||
			path.isAbsolute(relative)
		) {
			throw new Error('Path escapes the knowledge workspace');
		}
		return actual;
	}

	private hasControlCharacters(value: string) {
		for (const character of value) {
			const code = character.charCodeAt(0);
			if (code <= 0x1f || code === 0x7f) return true;
		}
		return false;
	}

	private async spawnCommand(
		cwd: string,
		executable: string,
		args: string[],
		command: AgentKnowledgeCommand,
	): Promise<AgentKnowledgeCommandResult> {
		return await new Promise((resolve, reject) => {
			const child = spawn(executable, args, { cwd, shell: false, env: { PATH: process.env.PATH } });
			let stdout = '';
			let stderr = '';
			let truncated = false;
			const timer = setTimeout(() => {
				child.kill('SIGKILL');
				truncated = true;
			}, COMMAND_TIMEOUT_MS);

			const append = (current: string, chunk: Buffer) => {
				const next = Buffer.concat([Buffer.from(current, 'utf8'), chunk]);
				if (next.length > MAX_OUTPUT_BYTES) {
					truncated = true;
					return truncateBufferToUtf8String(next, MAX_OUTPUT_BYTES);
				}
				return next.toString('utf8');
			};

			child.stdout.on('data', (chunk: Buffer) => {
				stdout = append(stdout, chunk);
			});
			child.stderr.on('data', (chunk: Buffer) => {
				stderr = append(stderr, chunk);
			});
			child.on('error', reject);
			child.on('close', (exitCode) => {
				clearTimeout(timer);
				resolve({ command, exitCode, stdout, stderr, truncated });
			});
		});
	}
}

function truncateBufferToUtf8String(buffer: Buffer, maxBytes: number) {
	for (let end = maxBytes; end >= 0; end--) {
		const output = buffer.subarray(0, end).toString('utf8');
		if (Buffer.byteLength(output) <= maxBytes) return output;
	}

	return '';
}
