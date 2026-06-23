import { redactText } from '@n8n/agents';
import { loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Sandbox, SandboxState } from '@daytona/sdk';
import { nanoid } from 'nanoid';
import { InstanceSettings } from 'n8n-core';
import { createHash } from 'node:crypto';

import { OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AiService } from '@/services/ai.service';

import {
	buildReadKnowledgeCommand,
	buildScopedKnowledgeShellCommand,
	buildSearchKnowledgeCommand,
	getSearchContextWindow,
	KNOWLEDGE_FILES_DIR_UNAVAILABLE_EXIT_CODE,
	parseReadKnowledgeOutput,
	parseRipgrepCountOutput,
	parseRipgrepFilesOutput,
	parseRipgrepOutput,
} from './agent-knowledge-commands';
import {
	AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	assertKnowledgePathSegment,
	buildKnowledgeVolumeSubpath,
	fromVolumeStorageReference,
	type AgentKnowledgeFilesystem,
} from './agent-knowledge-storage';
import { isAgentKnowledgeBaseEnabled } from './agent-knowledge-gate';
import {
	assertValidKnowledgeFilePath,
	DEFAULT_GLOB_FILES_LIMIT,
	DEFAULT_SEARCH_TEXT_LIMIT,
	parseGlobKnowledgeFilesRequest,
	parseReadKnowledgeRequest,
	parseSearchKnowledgeRequest,
	type AgentKnowledgeFileReference,
	type GlobKnowledgeFilesRequest,
	type GlobKnowledgeFilesResult,
	type ReadKnowledgeRequest,
	type ReadKnowledgeResult,
	type SearchKnowledgeRequest,
	type SearchKnowledgeResult,
} from './agent-knowledge-retrieval';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';

interface AgentKnowledgeCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export const AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX = 'agents-knowledgebase';

const MAX_SANDBOX_ERROR_DETAIL_CHARS = 2_000;

const LABEL_KNOWLEDGE_BASE = 'n8n-agents-knowledgebase';
const LABEL_PROJECT_ID = 'n8n-project-id';
const LABEL_AGENT_ID = 'n8n-agent-id';
const LABEL_USER_ID = 'n8n-user-id';
const LABEL_SANDBOX_SCOPE_ID = 'n8n-agents-sandbox-scope-id';

const SANDBOX_SCOPE_LABEL_MAX_LEN = 63;

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
	snapshot?: string;
	mode: 'direct' | 'proxy';
}

interface AgentKnowledgeReferenceLookup {
	files: AgentKnowledgeFileReference[];
	byFile: Map<string, AgentKnowledgeFileReference>;
	byId: Map<string, AgentKnowledgeFileReference>;
}

function emptySearchKnowledgeResult(
	outputMode: NonNullable<SearchKnowledgeRequest['output_mode']>,
	limit: number,
): SearchKnowledgeResult {
	if (outputMode === 'files_with_matches') {
		return { outputMode, files: [], limit, hasMore: false, truncated: false };
	}

	if (outputMode === 'count') {
		return { outputMode, counts: [], limit, hasMore: false, truncated: false };
	}

	return { outputMode, matches: [], limit, hasMore: false, truncated: false };
}

function buildSandboxScopeKey(
	projectId: string,
	agentId: string,
	ownerUserId: string,
	sandboxScopeId: string,
): string {
	return `${projectId}:${agentId}:${ownerUserId}:${normalizeSandboxScopeLabel(sandboxScopeId)}`;
}

function buildSandboxName(scope: {
	instanceId: string;
	projectId: string;
	agentId: string;
	ownerUserId: string;
	sandboxScopeId: string;
}): string {
	const hash = createHash('sha256').update(JSON.stringify(scope)).digest('hex').slice(0, 32);
	return `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}-${hash}`;
}

function isDaytonaNotFoundError(error: unknown): boolean {
	const { DaytonaNotFoundError } = loadDaytona();
	return error instanceof DaytonaNotFoundError;
}

function buildScopeLabels(
	projectId: string,
	agentId: string,
	ownerUserId: string,
	sandboxScopeId: string,
): Record<string, string> {
	return {
		[LABEL_KNOWLEDGE_BASE]: 'true',
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
		[LABEL_USER_ID]: ownerUserId,
		[LABEL_SANDBOX_SCOPE_ID]: normalizeSandboxScopeLabel(sandboxScopeId),
	};
}

function normalizeSandboxScopeLabel(scopeId: string): string {
	const normalized = scopeId
		.replace(/[^A-Za-z0-9_.-]+/g, '-')
		.replace(/^[-.]+|[-.]+$/g, '')
		.replace(/[-.]+/g, '-');
	const digest = createHash('sha256').update(scopeId).digest('hex').slice(0, 8);

	if (!normalized) {
		return `scope-${digest}`;
	}

	if (normalized.length <= SANDBOX_SCOPE_LABEL_MAX_LEN && normalized === scopeId) {
		return normalized;
	}

	const prefixMaxLen = SANDBOX_SCOPE_LABEL_MAX_LEN - digest.length - 1;
	const prefix = normalized.slice(0, prefixMaxLen).replace(/[-.]+$/, '');
	return prefix ? `${prefix}-${digest}` : `scope-${digest}`;
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

function truncateSandboxErrorDetail(value: string): string {
	if (value.length <= MAX_SANDBOX_ERROR_DETAIL_CHARS) return value;
	return `${value.slice(0, MAX_SANDBOX_ERROR_DETAIL_CHARS)}...[truncated]`;
}

/** Redact secrets before truncating so a match cut in half cannot leak. */
function sanitizeSandboxErrorDetail(value: string): string {
	return truncateSandboxErrorDetail(redactText(value).text.trimEnd());
}

function formatSandboxCommandFailure(
	operation: 'glob' | 'read' | 'search',
	result: AgentKnowledgeCommandResult,
): string {
	const stderrText = sanitizeSandboxErrorDetail(result.stderr);
	const stdoutText = sanitizeSandboxErrorDetail(result.stdout);
	const parts = [`Agent knowledge ${operation} failed`, `exitCode=${result.exitCode}`];
	parts.push(stderrText ? `stderr=${stderrText}` : 'stderr=<empty>');
	parts.push(stdoutText ? `stdout=${stdoutText}` : 'stdout=<empty>');
	return parts.join('; ');
}

function assertKnowledgeFilesDirectoryAvailable(
	operation: 'glob' | 'read' | 'search',
	result: AgentKnowledgeCommandResult,
): void {
	if (result.exitCode !== KNOWLEDGE_FILES_DIR_UNAVAILABLE_EXIT_CODE) return;

	throw new OperationalError(
		`Agent knowledge ${operation} failed because the uploaded knowledge files directory is unavailable in the sandbox`,
	);
}

@Service()
export class AgentKnowledgeSandboxService {
	private readonly pendingSandboxAcquisitions = new Map<string, Promise<Sandbox>>();

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly aiService: AiService,
		private readonly instanceSettings: InstanceSettings,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly agentRepository: AgentRepository,
	) {}

	async withKnowledgeFilesystem<T>(
		projectId: string,
		agentId: string,
		userId: string,
		operation: (filesystem: AgentKnowledgeFilesystem) => Promise<T>,
	): Promise<T> {
		// Callers (AgentKnowledgeService) verify project↔agent ownership before
		// invoking filesystem operations, so only configuration is asserted here.
		this.assertKnowledgeConfiguration(projectId, agentId);
		const sandbox = await this.acquireSandbox(projectId, agentId, userId);
		const filesystem = this.createFilesystemAdapter(sandbox);
		return await operation(filesystem);
	}

	async warmSandbox(projectId: string, agentId: string, userId: string): Promise<void> {
		this.assertKnowledgeConfiguration(projectId, agentId);
		await this.acquireSandbox(projectId, agentId, userId);
	}

	async searchKnowledge(
		projectId: string,
		agentId: string,
		userId: string,
		request: SearchKnowledgeRequest,
	): Promise<SearchKnowledgeResult> {
		const validatedRequest = parseSearchKnowledgeRequest(request);
		const references = await this.loadKnowledgeReferenceLookup(projectId, agentId);
		const outputMode = validatedRequest.output_mode ?? 'content';
		const limit = validatedRequest.head_limit ?? DEFAULT_SEARCH_TEXT_LIMIT;

		if (references.files.length === 0) {
			return emptySearchKnowledgeResult(outputMode, limit);
		}

		const scopedFilesByPath = new Map<string, AgentKnowledgeFileReference>();
		for (const path of validatedRequest.path) {
			const file = this.resolveOptionalFile({ file: path }, references);
			if (!file) {
				throw new BadRequestError('Knowledge file not found');
			}
			scopedFilesByPath.set(file.file, file);
		}
		const scopedFiles = [...scopedFilesByPath.values()];
		const command = buildSearchKnowledgeCommand(
			validatedRequest,
			scopedFiles.map((file) => file.file),
		);
		const result = await this.executeKnowledgeOperation(projectId, agentId, userId, command);

		assertKnowledgeFilesDirectoryAvailable('search', result);
		if (result.exitCode === 1) {
			return emptySearchKnowledgeResult(outputMode, limit);
		}
		if (result.exitCode !== 0) {
			throw new OperationalError(formatSandboxCommandFailure('search', result));
		}

		if (outputMode === 'files_with_matches') {
			const parsed = parseRipgrepFilesOutput(result.stdout, references.byFile);
			const files = parsed.files.slice(0, limit);
			return {
				outputMode,
				files,
				limit,
				hasMore: parsed.files.length > limit,
				truncated: parsed.incomplete,
			};
		}

		if (outputMode === 'count') {
			const parsed = parseRipgrepCountOutput(result.stdout, references.byFile);
			const counts = parsed.counts.slice(0, limit);
			return {
				outputMode,
				counts,
				limit,
				hasMore: parsed.counts.length > limit,
				truncated: parsed.incomplete,
			};
		}

		const parsed = parseRipgrepOutput(
			result.stdout,
			references.byFile,
			getSearchContextWindow(validatedRequest),
		);
		const matches = parsed.matches.slice(0, limit);

		return {
			outputMode,
			matches,
			limit,
			hasMore: parsed.matches.length > limit,
			truncated: parsed.incomplete,
		};
	}

	async globKnowledgeFiles(
		projectId: string,
		agentId: string,
		_userId: string,
		request: GlobKnowledgeFilesRequest,
	): Promise<GlobKnowledgeFilesResult> {
		const validatedRequest = parseGlobKnowledgeFilesRequest(request);
		const references = await this.loadKnowledgeReferenceLookup(projectId, agentId);
		const limit = validatedRequest.limit ?? DEFAULT_GLOB_FILES_LIMIT;

		if (references.files.length === 0) {
			return { files: [], limit, hasMore: false };
		}

		const matches = matchKnowledgeFilesByGlob(references.files, validatedRequest);

		return {
			files: matches.slice(0, limit),
			limit,
			hasMore: matches.length > limit,
		};
	}

	async readKnowledge(
		projectId: string,
		agentId: string,
		userId: string,
		request: ReadKnowledgeRequest,
	): Promise<ReadKnowledgeResult> {
		const validatedRequest = parseReadKnowledgeRequest(request);
		const references = await this.loadKnowledgeReferenceLookup(projectId, agentId);
		const file = this.resolveRequiredFile(validatedRequest, references);
		const command = buildReadKnowledgeCommand(file.file, validatedRequest);
		const result = await this.executeKnowledgeOperation(projectId, agentId, userId, command);

		assertKnowledgeFilesDirectoryAvailable('read', result);
		if (result.exitCode !== 0) {
			throw new OperationalError(formatSandboxCommandFailure('read', result));
		}

		const parsed = parseReadKnowledgeOutput(result.stdout, file, validatedRequest);
		return {
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
			ranges: parsed.ranges,
			truncated: parsed.truncated,
		};
	}

	private async executeKnowledgeOperation(
		projectId: string,
		agentId: string,
		userId: string,
		command: string,
	): Promise<AgentKnowledgeCommandResult> {
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
		const scopedCommand = buildScopedKnowledgeShellCommand(command);
		const sandbox = await this.acquireSandbox(projectId, agentId, userId);
		const result = await sandbox.process.executeCommand(
			scopedCommand,
			undefined,
			undefined,
			timeoutSeconds,
		);

		return {
			exitCode: result.exitCode,
			stdout: result.artifacts?.stdout ?? result.result ?? '',
			stderr:
				result.artifacts &&
				'stderr' in result.artifacts &&
				typeof result.artifacts.stderr === 'string'
					? result.artifacts.stderr
					: '',
		};
	}

	private async loadKnowledgeReferenceLookup(
		projectId: string,
		agentId: string,
	): Promise<AgentKnowledgeReferenceLookup> {
		await this.assertKnowledgeAccess(projectId, agentId);

		const files = await this.loadKnowledgeFileReferences(agentId);
		return {
			files,
			byFile: new Map(files.map((file) => [file.file, file])),
			byId: new Map(files.map((file) => [file.fileId, file])),
		};
	}

	private async loadKnowledgeFileReferences(
		agentId: string,
	): Promise<AgentKnowledgeFileReference[]> {
		const files = await this.agentFileRepository.findByAgentId(agentId);
		return files.map((file) => ({
			file: fromVolumeStorageReference(file.binaryDataId),
			fileId: file.id,
			displayName: file.fileName,
			mimeType: file.mimeType,
			fileSizeBytes: file.fileSizeBytes,
			createdAt: file.createdAt.toISOString(),
		}));
	}

	private resolveRequiredFile(
		request: ReadKnowledgeRequest,
		references: AgentKnowledgeReferenceLookup,
	): AgentKnowledgeFileReference {
		const file = this.resolveOptionalFile(request, references);
		if (!file) {
			throw new BadRequestError('Knowledge file not found');
		}
		return file;
	}

	private resolveOptionalFile(
		request: Pick<ReadKnowledgeRequest, 'file' | 'fileId'>,
		references: AgentKnowledgeReferenceLookup,
	): AgentKnowledgeFileReference | undefined {
		if (!request.file && !request.fileId) return undefined;

		if (request.file && request.fileId) {
			const normalized = assertValidKnowledgeFilePath(request.file);
			const fileByPath = references.byFile.get(normalized);
			const fileById = references.byId.get(request.fileId);
			if (!fileByPath || !fileById || fileByPath.fileId !== fileById.fileId) {
				throw new BadRequestError('Knowledge file not found');
			}
			return fileByPath;
		}

		if (request.file) {
			const normalized = assertValidKnowledgeFilePath(request.file);
			const file = references.byFile.get(normalized);
			if (!file) {
				throw new BadRequestError('Knowledge file not found');
			}
			return file;
		}

		const file = references.byId.get(request.fileId ?? '');
		if (!file) {
			throw new BadRequestError('Knowledge file not found');
		}
		return file;
	}

	private createFilesystemAdapter(sandbox: Sandbox): AgentKnowledgeFilesystem {
		return {
			uploadFiles: async (files) => {
				if (files.length === 0) {
					return;
				}
				await sandbox.fs.uploadFiles(
					files.map((file) => ({ source: file.source, destination: file.destination })),
				);
			},
			deleteFile: async (filePath, recursive) => await sandbox.fs.deleteFile(filePath, recursive),
			ensureDir: async (dirPath) => await sandbox.fs.createFolder(dirPath, '755'),
		};
	}

	private async acquireSandbox(
		projectId: string,
		agentId: string,
		ownerUserId: string,
		sandboxScopeId: string = ownerUserId,
	): Promise<Sandbox> {
		const cacheKey = buildSandboxScopeKey(projectId, agentId, ownerUserId, sandboxScopeId);
		let pending = this.pendingSandboxAcquisitions.get(cacheKey);

		if (!pending) {
			pending = this.acquireSandboxFresh(projectId, agentId, ownerUserId, sandboxScopeId).finally(
				() => {
					this.pendingSandboxAcquisitions.delete(cacheKey);
				},
			);
			this.pendingSandboxAcquisitions.set(cacheKey, pending);
		}

		return await pending;
	}

	private async acquireSandboxFresh(
		projectId: string,
		agentId: string,
		ownerUserId: string,
		sandboxScopeId: string,
	): Promise<Sandbox> {
		const { Daytona } = loadDaytona();
		const connection = await this.resolveDaytonaConnection(ownerUserId);
		const daytona = new Daytona({
			apiUrl: connection.apiUrl,
			apiKey: connection.apiKey,
		});
		const labels = buildScopeLabels(projectId, agentId, ownerUserId, sandboxScopeId);
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
		const volumeMount = this.buildVolumeMount(projectId, agentId);
		const name = buildSandboxName({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
			ownerUserId,
			sandboxScopeId,
		});

		const sandboxByName = await this.resolveSandboxByName(
			daytona,
			name,
			volumeMount,
			timeoutSeconds,
			connection,
		);
		if (sandboxByName) {
			this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId, name });
			return sandboxByName;
		}

		// list() is a cursor-paginated async iterator in the Daytona SDK; it transparently fetches
		// subsequent pages as we iterate.
		for await (const sandbox of daytona.list({ labels, limit: SANDBOX_LIST_PAGE_SIZE })) {
			if (!isUsableSandbox(sandbox) || !hasMatchingVolumeMount(sandbox, volumeMount)) {
				continue;
			}

			if (sandbox.state !== SANDBOX_STATE_STARTED) {
				await sandbox.start(timeoutSeconds);
			}

			const reusableSandbox = await this.resolveReusableSandbox(daytona, sandbox, connection);
			this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId });
			return reusableSandbox;
		}

		const image = connection.image;
		const baseCreateParams = {
			name,
			labels,
			language: 'typescript' as const,
			ephemeral: this.agentsConfig.sandboxEphemeral,
			autoStopInterval: AUTO_STOP_INTERVAL_MINUTES,
			volumes: [volumeMount],
		};

		let sandbox: Sandbox;
		try {
			if (connection.snapshot) {
				try {
					sandbox = await daytona.create(
						{ ...baseCreateParams, snapshot: connection.snapshot },
						{ timeout: timeoutSeconds },
					);
				} catch (error) {
					this.logger.warn(
						'Agent knowledge sandbox create from snapshot failed; falling back to image',
						{
							projectId,
							agentId,
							snapshotName: connection.snapshot,
							error: error instanceof Error ? error.message : String(error),
						},
					);
					sandbox = await daytona.create(
						{ ...baseCreateParams, image },
						{ timeout: timeoutSeconds },
					);
				}
			} else {
				sandbox = await daytona.create({ ...baseCreateParams, image }, { timeout: timeoutSeconds });
			}
		} catch (error) {
			if (connection.mode === 'proxy' && isVolumeMountFailure(error)) {
				const message = error instanceof Error ? error.message : String(error);
				throw new OperationalError(
					`Agent knowledge sandbox creation failed through the AI Assistant sandbox proxy: ${message}. If the proxy does not support volume mounts, enable them before using the agent knowledge base.`,
					{ cause: error },
				);
			}
			throw error;
		}

		this.logger.debug('Created agent knowledge sandbox', { projectId, agentId, name });
		return sandbox;
	}

	private async resolveDaytonaConnection(userId: string): Promise<AgentKnowledgeDaytonaConnection> {
		const directImage = this.agentsConfig.sandboxImage || DEFAULT_SANDBOX_IMAGE;
		const snapshot = this.agentsConfig.sandboxSnapshot.trim() || undefined;

		if (!this.aiService.isProxyEnabled()) {
			return {
				mode: 'direct',
				apiUrl: this.agentsConfig.daytonaApiUrl || undefined,
				apiKey: this.agentsConfig.daytonaApiKey || undefined,
				image: directImage,
				snapshot,
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
			snapshot,
		};
	}

	private buildVolumeMount(projectId: string, agentId: string): KnowledgeVolumeMount {
		return {
			volumeId: this.agentsConfig.daytonaVolumeId,
			mountPath: AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
			subpath: buildKnowledgeVolumeSubpath(this.instanceSettings.instanceId, projectId, agentId),
		};
	}

	private async resolveSandboxByName(
		daytona: { get: (name: string) => Promise<Sandbox> },
		name: string,
		volumeMount: KnowledgeVolumeMount,
		timeoutSeconds: number,
		connection: AgentKnowledgeDaytonaConnection,
	): Promise<Sandbox | undefined> {
		let sandbox: Sandbox;
		try {
			sandbox = await daytona.get(name);
		} catch (error) {
			if (isDaytonaNotFoundError(error)) {
				return undefined;
			}
			throw error;
		}

		if (!isUsableSandbox(sandbox)) {
			await sandbox.delete(timeoutSeconds);
			return undefined;
		}

		if (!hasMatchingVolumeMount(sandbox, volumeMount)) {
			throw new OperationalError('Agent knowledge sandbox has an unexpected volume mount');
		}

		if (sandbox.state !== SANDBOX_STATE_STARTED) {
			await sandbox.start(timeoutSeconds);
		}

		return await this.resolveReusableSandbox(daytona, sandbox, connection);
	}

	private async resolveReusableSandbox(
		daytona: { get: (name: string) => Promise<Sandbox> },
		sandbox: Sandbox,
		connection: AgentKnowledgeDaytonaConnection,
	): Promise<Sandbox> {
		if (connection.mode !== 'proxy') {
			return sandbox;
		}

		return await daytona.get(sandbox.name);
	}

	/**
	 * Guards the model-facing retrieval entry points: configuration plus a
	 * defense-in-depth check that the agent actually belongs to the project,
	 * mirroring `AgentKnowledgeService.ensureAgentBelongsToProject`.
	 */
	private async assertKnowledgeAccess(projectId: string, agentId: string): Promise<void> {
		this.assertKnowledgeConfiguration(projectId, agentId);
		const agentExists = await this.agentRepository.existsBy({ id: agentId, projectId });
		if (!agentExists) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
	}

	private assertKnowledgeConfiguration(projectId: string, agentId: string): void {
		this.assertKnowledgeBaseEnabled();
		this.assertValidPathSegments(projectId, agentId);
	}

	private assertValidPathSegments(projectId: string, agentId: string): void {
		try {
			assertKnowledgePathSegment(this.instanceSettings.instanceId, 'instance id');
			assertKnowledgePathSegment(projectId, 'project id');
			assertKnowledgePathSegment(agentId, 'agent id');
		} catch (error) {
			throw new OperationalError(
				error instanceof Error ? error.message : 'Invalid agent knowledge storage scope',
			);
		}
	}

	private assertKnowledgeBaseEnabled(): void {
		if (isAgentKnowledgeBaseEnabled(this.agentsConfig)) {
			return;
		}

		if (
			this.agentsConfig.sandboxEnabled &&
			this.agentsConfig.sandboxProvider === 'daytona' &&
			!this.agentsConfig.daytonaVolumeId.trim()
		) {
			throw new OperationalError('Agent knowledge Daytona volume is not configured');
		}

		throw new OperationalError('Agent knowledge sandbox is not enabled');
	}
}

function matchKnowledgeFilesByGlob(
	files: AgentKnowledgeFileReference[],
	request: GlobKnowledgeFilesRequest,
): AgentKnowledgeFileReference[] {
	const caseSensitive = request.caseSensitive === true;
	const regex = globPatternToRegExp(request.pattern, caseSensitive);
	const patternTokens = tokenizeKnowledgeFilePattern(request.pattern, caseSensitive);
	return files
		.map((file, index) => ({ file, index }))
		.filter(({ file }) => regex.test(file.file) || regex.test(file.displayName))
		.map(({ file, index }) => ({
			file,
			index,
			bucket: getKnowledgeFileMatchBucket(file, patternTokens, caseSensitive),
		}))
		.sort((left, right) => left.bucket - right.bucket || left.index - right.index)
		.map(({ file }) => file);
}

function getKnowledgeFileMatchBucket(
	file: AgentKnowledgeFileReference,
	patternTokens: string[],
	caseSensitive: boolean,
): 0 | 1 | 2 | 3 {
	const fileNames = [file.file, file.displayName];
	if (
		fileNames.some((fileName) =>
			hasExactTokenMatch(tokenizeKnowledgeFileName(fileName, caseSensitive), patternTokens),
		)
	) {
		return 0;
	}

	if (
		fileNames.some((fileName) =>
			containsTokenSequence(tokenizeKnowledgeFileName(fileName, caseSensitive), patternTokens),
		)
	) {
		return 1;
	}

	const compactPattern = patternTokens.join('');
	if (
		compactPattern &&
		fileNames.some((fileName) =>
			compactKnowledgeFileName(fileName, caseSensitive).includes(compactPattern),
		)
	) {
		return 2;
	}

	return 3;
}

function tokenizeKnowledgeFilePattern(pattern: string, caseSensitive: boolean): string[] {
	return tokenizeKnowledgeFileName(pattern.replace(/[*?]/g, ' '), caseSensitive);
}

function tokenizeKnowledgeFileName(fileName: string, caseSensitive: boolean): string[] {
	const normalized = caseSensitive ? fileName : fileName.toLowerCase();
	const baseName =
		normalized
			.split(/[\\/]/)
			.at(-1)
			?.replace(/\.[^.]*$/, '') ?? normalized;
	return baseName.split(/[^a-z0-9]+/i).filter(Boolean);
}

function compactKnowledgeFileName(fileName: string, caseSensitive: boolean): string {
	return tokenizeKnowledgeFileName(fileName, caseSensitive).join('');
}

function hasExactTokenMatch(fileTokens: string[], patternTokens: string[]): boolean {
	return (
		patternTokens.length > 0 &&
		fileTokens.length === patternTokens.length &&
		fileTokens.every((fileToken, index) => fileToken === patternTokens[index])
	);
}

function containsTokenSequence(fileTokens: string[], patternTokens: string[]): boolean {
	if (patternTokens.length === 0) return false;

	let patternIndex = 0;
	for (const fileToken of fileTokens) {
		if (fileToken === patternTokens[patternIndex]) {
			patternIndex++;
			if (patternIndex === patternTokens.length) return true;
		}
	}
	return false;
}

function globPatternToRegExp(pattern: string, caseSensitive: boolean): RegExp {
	let source = '^';

	for (const character of pattern) {
		if (character === '*') {
			source += '.*';
			continue;
		}
		if (character === '?') {
			source += '.';
			continue;
		}
		source += escapeRegExp(character);
	}

	source += '$';
	return new RegExp(source, caseSensitive ? undefined : 'i');
}

function escapeRegExp(value: string): string {
	return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}
