import { Service } from '@n8n/di';
import path from 'node:path/posix';

import type {
	AgentKnowledgeCommandRequest,
	AgentKnowledgeCommandResult,
} from './agent-knowledge-command.types';
import type { KnowledgeSandboxWorkspace } from './agent-knowledge-sandbox-workspace.service';

const MAX_OUTPUT_BYTES = 64 * 1024;
const COMMAND_TIMEOUT_MS = 5_000;
const MAX_READ_RANGE_LINES = 500;

interface SandboxCommandCapabilities {
	rg: boolean;
	grep: boolean;
	sed: boolean;
	node: boolean;
	cat: boolean;
}

const READ_STREAM_SCRIPT = `
const fs = require('node:fs');
const file = process.argv[1];
const limit = Number(process.argv[2]);
const stream = fs.createReadStream(file, { highWaterMark: 65536 });
let written = 0;
stream.on('data', (chunk) => {
	const remaining = limit - written;
	if (remaining <= 0) {
		stream.destroy();
		return;
	}
	const output = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
	process.stdout.write(output);
	written += output.length;
	if (written >= limit) stream.destroy();
});
stream.on('error', (error) => {
	console.error(error.message);
	process.exitCode = 1;
});
`.trim();

const CANONICALIZE_PATHS_SCRIPT = `
const fs = require('node:fs');
const path = require('node:path');
const entries = JSON.parse(process.argv[1]);
const cwd = process.cwd();
const results = [];
for (const entry of entries) {
	const resolved = path.resolve(cwd, entry.path);
	const actual = fs.realpathSync(resolved);
	const relative = path.relative(cwd, actual);
	if ((!entry.allowRoot && relative === '') || relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('Path escapes the knowledge workspace');
	}
	results.push(relative || '.');
}
console.log(JSON.stringify(results));
`.trim();

const READ_RANGE_SCRIPT = `
const fs = require('node:fs');
const readline = require('node:readline');
const file = process.argv[1];
const startLine = Number(process.argv[2]);
const endLine = Number(process.argv[3]);
let lineNumber = 0;
const stream = fs.createReadStream(file);
const rl = readline.createInterface({ input: stream });
rl.on('line', (line) => {
	lineNumber++;
	if (lineNumber >= startLine && lineNumber <= endLine) {
		console.log(line);
	}
	if (lineNumber > endLine) {
		rl.close();
		stream.destroy();
	}
});
rl.on('close', () => stream.destroy());
stream.on('error', (error) => {
	console.error(error.message);
	process.exitCode = 1;
});
`.trim();

@Service()
export class AgentKnowledgeSandboxCommandService {
	private readonly capabilitiesByWorkspace = new Map<string, SandboxCommandCapabilities>();

	async run(
		workspace: KnowledgeSandboxWorkspace,
		request: AgentKnowledgeCommandRequest,
	): Promise<AgentKnowledgeCommandResult> {
		switch (request.command) {
			case 'git_grep':
				return await this.runSearch(workspace, request);
			case 'cat':
				return await this.runRead(workspace, request);
			case 'sed':
				return await this.runReadRange(workspace, request);
		}
	}

	clearCapabilities(workspace: Pick<KnowledgeSandboxWorkspace, 'provider' | 'sandbox'>): void {
		this.capabilitiesByWorkspace.delete(this.getCapabilitiesCacheKey(workspace));
	}

	private getCapabilitiesCacheKey(
		workspace: Pick<KnowledgeSandboxWorkspace, 'provider' | 'sandbox'>,
	): string {
		return `${workspace.provider}:${workspace.sandbox.id}`;
	}

	private async getCapabilities(
		workspace: KnowledgeSandboxWorkspace,
	): Promise<SandboxCommandCapabilities> {
		const cacheKey = this.getCapabilitiesCacheKey(workspace);
		const cached = this.capabilitiesByWorkspace.get(cacheKey);
		if (cached) return cached;

		if (!workspace.sandbox.executeCommand) {
			throw new Error('Agent knowledge sandbox does not support command execution');
		}

		const script = [
			'command -v rg >/dev/null 2>&1 && echo rg || true',
			'command -v grep >/dev/null 2>&1 && echo grep || true',
			'command -v sed >/dev/null 2>&1 && echo sed || true',
			'command -v node >/dev/null 2>&1 && echo node || true',
			'command -v cat >/dev/null 2>&1 && echo cat || true',
		].join('; ');

		const result = await workspace.sandbox.executeCommand('sh', ['-lc', script], {
			cwd: workspace.knowledgeRoot,
			timeout: COMMAND_TIMEOUT_MS,
		});

		const lines = new Set(
			result.stdout
				.split('\n')
				.map((line: string) => line.trim())
				.filter((line: string) => line.length > 0),
		);

		const capabilities: SandboxCommandCapabilities = {
			rg: lines.has('rg'),
			grep: lines.has('grep'),
			sed: lines.has('sed'),
			node: lines.has('node'),
			cat: lines.has('cat'),
		};
		this.capabilitiesByWorkspace.set(cacheKey, capabilities);
		return capabilities;
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
			timeout: COMMAND_TIMEOUT_MS,
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

	private async canonicalizeRelativePaths(
		workspace: KnowledgeSandboxWorkspace,
		paths: Array<{ path: string; allowRoot?: boolean }>,
	): Promise<string[]> {
		const sanitized = paths.map(({ path: requestedPath, allowRoot }) =>
			this.safeRelativePath(requestedPath, { allowRoot }),
		);
		const capabilities = await this.getCapabilities(workspace);
		if (!capabilities.node) {
			return sanitized;
		}

		const payload = JSON.stringify(
			sanitized.map((requestedPath, index) => ({
				path: requestedPath,
				allowRoot: paths[index]?.allowRoot ?? false,
			})),
		);
		const result = await this.executeSandboxCommand(
			workspace,
			'node',
			['-e', CANONICALIZE_PATHS_SCRIPT, payload],
			'cat',
		);
		if (result.exitCode !== 0) {
			throw new Error(
				result.stderr.trim() || result.stdout.trim() || 'Path escapes the knowledge workspace',
			);
		}

		return JSON.parse(result.stdout.trim()) as string[];
	}

	private async runSearch(
		workspace: KnowledgeSandboxWorkspace,
		request: Extract<AgentKnowledgeCommandRequest, { command: 'git_grep' }>,
	): Promise<AgentKnowledgeCommandResult> {
		if (request.pattern.trim() === '') throw new Error('Search pattern is required');

		const files = await this.canonicalizeRelativePaths(
			workspace,
			(request.files ?? ['.']).map((file) => ({ path: file, allowRoot: true })),
		);
		const capabilities = await this.getCapabilities(workspace);

		if (capabilities.rg) {
			const args = ['--no-heading', '--line-number', '--with-filename', '--color', 'never'];
			if (request.caseInsensitive) args.push('-i');
			if (request.fixedStrings !== false) args.push('-F');
			if (request.outputMode === 'count') args.push('--count');
			if (request.context !== undefined) {
				args.push('-C', String(Math.min(Math.max(request.context, 0), 5)));
			}
			args.push('--', request.pattern, ...files);
			return await this.executeSandboxCommand(workspace, 'rg', args, 'git_grep');
		}

		if (capabilities.grep) {
			const args = ['-R', '-n', '-I', '-H'];
			if (request.caseInsensitive) args.push('-i');
			if (request.fixedStrings !== false) args.push('-F');
			else args.push('-E');
			if (request.outputMode === 'count') args.push('-c');
			if (request.context !== undefined) {
				args.push('-C', String(Math.min(Math.max(request.context, 0), 5)));
			}
			args.push('--', request.pattern, ...files);
			return await this.executeSandboxCommand(workspace, 'grep', args, 'git_grep');
		}

		throw new Error('Agent knowledge sandbox requires rg or grep for search');
	}

	private async runRead(
		workspace: KnowledgeSandboxWorkspace,
		request: Extract<AgentKnowledgeCommandRequest, { command: 'cat' }>,
	): Promise<AgentKnowledgeCommandResult> {
		const [file] = await this.canonicalizeRelativePaths(workspace, [{ path: request.file }]);
		const capabilities = await this.getCapabilities(workspace);

		if (capabilities.node) {
			return await this.executeSandboxCommand(
				workspace,
				'node',
				['-e', READ_STREAM_SCRIPT, file, String(MAX_OUTPUT_BYTES + 1)],
				'cat',
			);
		}
		if (capabilities.cat) {
			return await this.executeSandboxCommand(workspace, 'cat', [file], 'cat');
		}
		if (capabilities.sed) {
			return await this.executeSandboxCommand(workspace, 'sed', ['-n', '1,500p', file], 'cat');
		}

		throw new Error('Agent knowledge sandbox requires node, sed, or cat for read');
	}

	private async runReadRange(
		workspace: KnowledgeSandboxWorkspace,
		request: Extract<AgentKnowledgeCommandRequest, { command: 'sed' }>,
	): Promise<AgentKnowledgeCommandResult> {
		const [file] = await this.canonicalizeRelativePaths(workspace, [{ path: request.file }]);
		const startLine = Math.max(1, request.startLine);
		const endLine = Math.max(startLine, request.endLine);
		const clampedEndLine = Math.min(endLine, startLine + MAX_READ_RANGE_LINES);
		const capabilities = await this.getCapabilities(workspace);

		if (capabilities.node) {
			return await this.executeSandboxCommand(
				workspace,
				'node',
				['-e', READ_RANGE_SCRIPT, file, String(startLine), String(clampedEndLine)],
				'sed',
			);
		}
		if (capabilities.sed) {
			return await this.executeSandboxCommand(
				workspace,
				'sed',
				['-n', `${startLine},${clampedEndLine}p`, file],
				'sed',
			);
		}
		if (capabilities.cat) {
			return await this.executeSandboxCommand(workspace, 'cat', [file], 'sed');
		}

		throw new Error('Agent knowledge sandbox requires node, sed, or cat for read');
	}
}

function truncateBufferToUtf8String(buffer: Buffer, maxBytes: number): string {
	for (let end = maxBytes; end >= 0; end--) {
		const output = buffer.subarray(0, end).toString('utf8');
		if (Buffer.byteLength(output) <= maxBytes) return output;
	}

	return '';
}
