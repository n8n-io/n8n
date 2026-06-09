import { loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Sandbox, SandboxState } from '@daytonaio/sdk';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';

import { OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AiService } from '@/services/ai.service';

import {
	AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	assertKnowledgePathSegment,
	buildKnowledgeVolumeSubpath,
	KNOWLEDGE_FILES_DIR,
	type AgentKnowledgeFilesystem,
} from './agent-knowledge-storage';

const MAX_COMMAND_LENGTH = 2_000;
const MAX_COMMAND_OUTPUT_CHARS = 20_000;
const MIN_DEFAULT_OPERATION_TIMEOUT_MS = 10_000;
const MAX_OPERATION_TIMEOUT_MS = 120_000;
const ALLOWED_KNOWLEDGE_COMMANDS = new Set([
	'awk',
	'cat',
	'cut',
	'echo',
	'grep',
	'head',
	'printf',
	'rg',
	'sed',
	'sort',
	'tail',
	'tr',
	'uniq',
	'wc',
]);

export interface AgentKnowledgeCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface AgentKnowledgeCommandOptions {
	command: string;
	timeoutMs?: number;
}

export interface AgentKnowledgeCommandOperationResult {
	exitCode: number;
	stdout: string;
	stderr: string;
	stdoutTruncated: boolean;
	stderrTruncated: boolean;
}

export const SEARCH_KNOWLEDGE_SANDBOX_CREATED = 'sandbox created' as const;
export const SEARCH_KNOWLEDGE_SANDBOX_REUSED = 'sandbox reused' as const;
export const AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX = 'agents-knowledgebase';

export type SearchKnowledgeSandboxResult =
	| typeof SEARCH_KNOWLEDGE_SANDBOX_CREATED
	| typeof SEARCH_KNOWLEDGE_SANDBOX_REUSED;

const LABEL_KNOWLEDGE_BASE = 'n8n-agents-knowledgebase';
const LABEL_PROJECT_ID = 'n8n-project-id';
const LABEL_AGENT_ID = 'n8n-agent-id';
const LABEL_USER_ID = 'n8n-user-id';

const SANDBOX_STATE_STARTED: SandboxState = 'started';

const DEAD_SANDBOX_STATES = new Set<SandboxState>([
	'destroyed',
	'destroying',
	'error',
	'build_failed',
]);

const DEFAULT_SANDBOX_IMAGE = 'daytonaio/sandbox:0.5.0';
const AUTO_STOP_INTERVAL_MINUTES = 5;
const SANDBOX_LIST_PAGE_SIZE = 100;

interface KnowledgeVolumeMount {
	volumeId: string;
	mountPath: string;
	subpath: string;
}

interface AgentKnowledgeDaytonaConnection {
	apiUrl?: string;
	apiKey?: string;
	image: string;
	mode: 'direct' | 'proxy';
}

function buildScopeLabels(
	projectId: string,
	agentId: string,
	userId: string,
): Record<string, string> {
	return {
		[LABEL_KNOWLEDGE_BASE]: 'true',
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
		[LABEL_USER_ID]: userId,
	};
}

function isVolumeMountFailure(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /volume|mount|subpath/i.test(message);
}

function isUsableSandbox(sandbox: Sandbox): boolean {
	const state = sandbox.state;
	if (!state) return true;
	return !DEAD_SANDBOX_STATES.has(state);
}

function hasMatchingVolumeMount(sandbox: Sandbox, expected: KnowledgeVolumeMount): boolean {
	const volumes = sandbox.volumes ?? [];
	return volumes.some((volume) => {
		const mount = volume as KnowledgeVolumeMount;
		return (
			mount.volumeId === expected.volumeId &&
			mount.mountPath === expected.mountPath &&
			mount.subpath === expected.subpath
		);
	});
}

@Service()
export class AgentKnowledgeSandboxService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly aiService: AiService,
	) {}

	async ensureSandbox(
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<SearchKnowledgeSandboxResult> {
		const { reused } = await this.acquireSandbox(projectId, agentId, userId);
		return reused ? SEARCH_KNOWLEDGE_SANDBOX_REUSED : SEARCH_KNOWLEDGE_SANDBOX_CREATED;
	}

	async withKnowledgeFilesystem<T>(
		projectId: string,
		agentId: string,
		userId: string,
		operation: (filesystem: AgentKnowledgeFilesystem) => Promise<T>,
	): Promise<T> {
		const { sandbox } = await this.acquireSandbox(projectId, agentId, userId);
		const filesystem = this.createFilesystemAdapter(sandbox);
		return await operation(filesystem);
	}

	async runKnowledgeCommand(
		projectId: string,
		agentId: string,
		userId: string,
		options: AgentKnowledgeCommandOptions,
	): Promise<AgentKnowledgeCommandOperationResult> {
		const command = validateKnowledgeCommand(options.command);
		const timeoutMs = resolveKnowledgeOperationTimeout(options.timeoutMs);

		const result = await this.executeKnowledgeCommand(
			projectId,
			agentId,
			userId,
			command,
			timeoutMs,
		);
		const stdout = truncateCommandOutput(result.stdout);
		const stderr = truncateCommandOutput(result.stderr);

		return {
			exitCode: result.exitCode,
			stdout: stdout.text,
			stderr: stderr.text,
			stdoutTruncated: stdout.truncated,
			stderrTruncated: stderr.truncated,
		};
	}

	private async executeKnowledgeCommand(
		projectId: string,
		agentId: string,
		userId: string,
		command: string,
		timeoutMs?: number,
	): Promise<AgentKnowledgeCommandResult> {
		const { sandbox } = await this.acquireSandbox(projectId, agentId, userId);
		const timeoutSeconds = Math.ceil((timeoutMs ?? this.agentsConfig.sandboxTimeout) / 1000);
		const scopedCommand = buildScopedKnowledgeShellCommand(command);
		const result = await sandbox.process.executeCommand(
			scopedCommand,
			undefined,
			undefined,
			timeoutSeconds,
		);

		return {
			exitCode: result.exitCode,
			stdout: result.artifacts?.stdout ?? result.result ?? '',
			stderr: readCommandStderr(result.artifacts),
		};
	}

	private createFilesystemAdapter(sandbox: Sandbox): AgentKnowledgeFilesystem {
		return {
			readFile: async (filePath) => await sandbox.fs.downloadFile(filePath),
			writeFile: async (filePath, content) => {
				const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
				const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
				if (parentDir) {
					await sandbox.fs.createFolder(parentDir, '755').catch(() => undefined);
				}
				await sandbox.fs.uploadFile(buffer, filePath);
			},
			deleteFile: async (filePath, recursive) => await sandbox.fs.deleteFile(filePath, recursive),
			ensureDir: async (dirPath) => await sandbox.fs.createFolder(dirPath, '755'),
		};
	}

	private async acquireSandbox(
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<{ sandbox: Sandbox; reused: boolean }> {
		this.assertKnowledgeSandboxEnabled();
		this.assertKnowledgeVolumeConfigured();
		this.assertValidPathSegments(projectId, agentId);

		const { Daytona } = loadDaytona();
		const connection = await this.resolveDaytonaConnection(userId);
		const daytona = new Daytona({
			apiUrl: connection.apiUrl,
			apiKey: connection.apiKey,
		});
		const labels = buildScopeLabels(projectId, agentId, userId);
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
		const volumeMount = this.buildVolumeMount(projectId, agentId);

		let page = 1;
		while (true) {
			const listedSandboxes = await daytona.list(labels, page, SANDBOX_LIST_PAGE_SIZE);
			for (const sandbox of listedSandboxes.items) {
				if (!isUsableSandbox(sandbox) || !hasMatchingVolumeMount(sandbox, volumeMount)) {
					continue;
				}

				if (sandbox.state !== SANDBOX_STATE_STARTED) {
					await sandbox.start(timeoutSeconds);
				}

				this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId });
				return { sandbox, reused: true };
			}

			if (page >= listedSandboxes.totalPages) {
				break;
			}
			page += 1;
		}

		const name = `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}-${randomUUID()}`;
		const image = connection.image;

		let sandbox: Sandbox;
		try {
			sandbox = await daytona.create(
				{
					name,
					labels,
					language: 'typescript',
					image,
					ephemeral: true,
					autoStopInterval: AUTO_STOP_INTERVAL_MINUTES,
					volumes: [volumeMount],
				},
				{ timeout: timeoutSeconds },
			);
		} catch (error) {
			if (connection.mode === 'proxy' && isVolumeMountFailure(error)) {
				throw new OperationalError(
					'Agent knowledge Daytona proxy does not support volume mounts. Enable volume mounts in the AI Assistant sandbox proxy before using agent knowledge base sandboxing.',
				);
			}
			throw error;
		}

		this.logger.debug('Created agent knowledge sandbox', { projectId, agentId, name });
		return { sandbox, reused: false };
	}

	private async resolveDaytonaConnection(userId: string): Promise<AgentKnowledgeDaytonaConnection> {
		const directImage = this.agentsConfig.sandboxImage || DEFAULT_SANDBOX_IMAGE;

		if (!this.aiService.isProxyEnabled()) {
			return {
				mode: 'direct',
				apiUrl: this.agentsConfig.daytonaApiUrl || undefined,
				apiKey: this.agentsConfig.daytonaApiKey || undefined,
				image: directImage,
			};
		}

		const client = await this.aiService.getClient();
		const proxyConfig = await client.getSandboxProxyConfig();
		const token = await client.getBuilderApiProxyToken({ id: userId }, { userMessageId: nanoid() });

		return {
			mode: 'proxy',
			apiUrl: client.getSandboxProxyBaseUrl(),
			apiKey: token.accessToken,
			image: proxyConfig.image || directImage,
		};
	}

	private buildVolumeMount(projectId: string, agentId: string): KnowledgeVolumeMount {
		return {
			volumeId: this.agentsConfig.daytonaVolumeId,
			mountPath: AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
			subpath: buildKnowledgeVolumeSubpath(projectId, agentId),
		};
	}

	private assertValidPathSegments(projectId: string, agentId: string): void {
		try {
			assertKnowledgePathSegment(projectId, 'project id');
			assertKnowledgePathSegment(agentId, 'agent id');
		} catch (error) {
			throw new OperationalError(
				error instanceof Error ? error.message : 'Invalid agent knowledge storage scope',
			);
		}
	}

	private assertKnowledgeSandboxEnabled(): void {
		if (!this.agentsConfig.sandboxEnabled || this.agentsConfig.sandboxProvider !== 'daytona') {
			throw new OperationalError('Agent knowledge sandbox is not enabled');
		}
	}

	private assertKnowledgeVolumeConfigured(): void {
		if (!this.agentsConfig.daytonaVolumeId.trim()) {
			throw new OperationalError('Agent knowledge Daytona volume is not configured');
		}
	}
}

function resolveKnowledgeOperationTimeout(timeoutMs: number | undefined): number | undefined {
	if (timeoutMs === undefined) {
		return undefined;
	}

	return Math.min(Math.max(timeoutMs, MIN_DEFAULT_OPERATION_TIMEOUT_MS), MAX_OPERATION_TIMEOUT_MS);
}

function validateKnowledgeCommand(command: string): string {
	const trimmed = command.trim();
	if (!trimmed) {
		throw new BadRequestError('Invalid knowledge command');
	}

	if (trimmed.length > MAX_COMMAND_LENGTH) {
		throw new BadRequestError('Invalid knowledge command');
	}

	assertAllowedKnowledgeCommand(trimmed);

	return trimmed;
}

function assertAllowedKnowledgeCommand(command: string): void {
	const segments = splitPipeline(command);
	for (const segment of segments) {
		const tokens = tokenizeCommandSegment(segment);
		const executable = tokens[0];
		if (!executable || !ALLOWED_KNOWLEDGE_COMMANDS.has(executable)) {
			throw new BadRequestError('Knowledge command is not allowed');
		}

		assertReadOnlyCommandArguments(executable, tokens.slice(1));
	}
}

function assertReadOnlyCommandArguments(command: string, args: string[]): void {
	if (
		command === 'sed' &&
		args.some(
			(arg) =>
				arg.startsWith('-i') ||
				arg === '--in-place' ||
				arg.startsWith('--in-place=') ||
				isUnsafeSedArgument(arg),
		)
	) {
		throw new BadRequestError('Knowledge command is not allowed');
	}

	if (command === 'sort' && args.some((arg) => arg === '-o' || arg.startsWith('--output'))) {
		throw new BadRequestError('Knowledge command is not allowed');
	}

	if (command === 'awk' && args.some(isUnsafeAwkArgument)) {
		throw new BadRequestError('Knowledge command is not allowed');
	}
}

function isUnsafeAwkArgument(arg: string): boolean {
	return /\bsystem\s*\(/.test(arg) || arg.includes('>>') || /(^|[^<>=])>([^=]|$)/.test(arg);
}

function isUnsafeSedArgument(arg: string): boolean {
	return (
		/(^|[;\s])(?:[0-9,$]+)?[we]\s+\S/.test(arg) ||
		/\/[we]\s+\S/.test(arg) ||
		/\/e($|[;\s])/.test(arg)
	);
}

function splitPipeline(command: string): string[] {
	const segments: string[] = [];
	let current = '';
	let quote: '"' | "'" | undefined;

	for (let index = 0; index < command.length; index++) {
		const character = command[index];
		const next = command[index + 1];

		if (quote) {
			if (
				quote === '"' &&
				(character === '`' || (character === '$' && (next === '(' || next === '{')))
			) {
				throw new BadRequestError('Knowledge command is not allowed');
			}
			if (quote === '"' && character === '\\' && next) {
				current += character + next;
				index++;
				continue;
			}
			if (character === quote) {
				quote = undefined;
			}
			current += character;
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			current += character;
			continue;
		}

		if (character === '|') {
			if (next === '|') {
				throw new BadRequestError('Knowledge command is not allowed');
			}
			segments.push(current.trim());
			current = '';
			continue;
		}

		assertAllowedShellCharacter(character, next);
		current += character;
	}

	if (quote) {
		throw new BadRequestError('Knowledge command is not allowed');
	}

	segments.push(current.trim());
	if (segments.some((segment) => segment.length === 0)) {
		throw new BadRequestError('Knowledge command is not allowed');
	}

	return segments;
}

function assertAllowedShellCharacter(character: string, next?: string): void {
	if (character === '\n' || character === '\r') {
		throw new BadRequestError('Knowledge command is not allowed');
	}

	if (';&<>`(){}'.includes(character)) {
		throw new BadRequestError('Knowledge command is not allowed');
	}

	if (character === '$' && (next === '(' || next === '{')) {
		throw new BadRequestError('Knowledge command is not allowed');
	}
}

function tokenizeCommandSegment(segment: string): string[] {
	const tokens: string[] = [];
	let current = '';
	let quote: '"' | "'" | undefined;

	for (let index = 0; index < segment.length; index++) {
		const character = segment[index];
		const next = segment[index + 1];

		if (quote) {
			if (quote === '"' && character === '\\' && next) {
				current += next;
				index++;
				continue;
			}
			if (character === quote) {
				quote = undefined;
				continue;
			}
			current += character;
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}

		if (/\s/.test(character)) {
			if (current) {
				tokens.push(current);
				current = '';
			}
			continue;
		}

		if (character === '\\' && next) {
			current += next;
			index++;
			continue;
		}

		current += character;
	}

	if (quote) {
		throw new BadRequestError('Knowledge command is not allowed');
	}
	if (current) {
		tokens.push(current);
	}

	return tokens;
}

function truncateCommandOutput(text: string): { text: string; truncated: boolean } {
	if (text.length <= MAX_COMMAND_OUTPUT_CHARS) {
		return { text, truncated: false };
	}

	return { text: text.slice(0, MAX_COMMAND_OUTPUT_CHARS), truncated: true };
}

function buildScopedKnowledgeShellCommand(command: string): string {
	return `if [ ! -d ${KNOWLEDGE_FILES_DIR} ]; then exit 0; fi; cd ${KNOWLEDGE_FILES_DIR} && ${command}`;
}

function readCommandStderr(artifacts: { stdout?: string } | undefined): string {
	if (!artifacts || !('stderr' in artifacts)) {
		return '';
	}

	const stderr = artifacts.stderr;
	return typeof stderr === 'string' ? stderr : '';
}
