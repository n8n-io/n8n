import { loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Sandbox, SandboxState } from '@daytonaio/sdk';
import { nanoid } from 'nanoid';
import { InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AiService } from '@/services/ai.service';

import {
	buildReadKnowledgeCommand,
	buildScopedKnowledgeShellCommand,
	buildSearchKnowledgeCommand,
	compactKnowledgeFileLookupText,
	knowledgeFileMatchesQuery,
	parseReadKnowledgeOutput,
	parseRipgrepJsonOutput,
	readCommandStderr,
	truncateOperationOutput,
} from './agent-knowledge-commands';
import {
	AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	assertKnowledgePathSegment,
	buildKnowledgeVolumeSubpath,
	fromVolumeStorageReference,
	type AgentKnowledgeFilesystem,
} from './agent-knowledge-storage';
import {
	assertValidKnowledgeFilePath,
	DEFAULT_FIND_FILES_LIMIT,
	DEFAULT_SEARCH_TEXT_LIMIT,
	parseFindKnowledgeFilesRequest,
	parseReadKnowledgeRequest,
	parseSearchKnowledgeRequest,
	type AgentKnowledgeFileReference,
	type FindKnowledgeFilesRequest,
	type FindKnowledgeFilesResult,
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
// Must stay well below AUTO_STOP_INTERVAL_MINUTES so a cached handle never
// outlives the sandbox's idle auto-stop window.
const SANDBOX_CACHE_TTL_MS = 60_000;
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

interface AgentKnowledgeReferenceLookup {
	files: AgentKnowledgeFileReference[];
	byFile: Map<string, AgentKnowledgeFileReference>;
	byId: Map<string, AgentKnowledgeFileReference>;
}

function buildSandboxScopeKey(projectId: string, agentId: string, userId: string): string {
	return `${projectId}:${agentId}:${userId}`;
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
	private readonly sandboxCache = new Map<string, { sandbox: Sandbox; expiresAt: number }>();

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
		try {
			return await operation(filesystem);
		} catch (error) {
			this.invalidateSandboxCache(projectId, agentId, userId);
			throw error;
		}
	}

	async findKnowledgeFiles(
		projectId: string,
		agentId: string,
		request: FindKnowledgeFilesRequest,
	): Promise<FindKnowledgeFilesResult> {
		const validatedRequest = parseFindKnowledgeFilesRequest(request);
		await this.assertKnowledgeAccess(projectId, agentId);

		const limit = validatedRequest.limit ?? DEFAULT_FIND_FILES_LIMIT;
		const offset = validatedRequest.offset ?? 0;
		const query = validatedRequest.query?.toLocaleLowerCase();
		const compactQuery = query ? compactKnowledgeFileLookupText(query) : undefined;
		const files = await this.loadKnowledgeFileReferences(agentId);
		const filteredFiles = query
			? files.filter((file) => knowledgeFileMatchesQuery(file, query, compactQuery ?? ''))
			: files;

		return {
			files: filteredFiles.slice(offset, offset + limit),
			limit,
			offset,
			hasMore: filteredFiles.length > offset + limit,
		};
	}

	async searchKnowledge(
		projectId: string,
		agentId: string,
		userId: string,
		request: SearchKnowledgeRequest,
	): Promise<SearchKnowledgeResult> {
		const validatedRequest = parseSearchKnowledgeRequest(request);
		const references = await this.loadKnowledgeReferenceLookup(projectId, agentId);
		const limit = validatedRequest.limit ?? DEFAULT_SEARCH_TEXT_LIMIT;
		const offset = validatedRequest.offset ?? 0;
		const scopedFiles = this.resolveSearchScope(validatedRequest, references);

		if (references.files.length === 0) {
			return { matches: [], limit, offset, hasMore: false, truncated: false };
		}

		const command = buildSearchKnowledgeCommand(validatedRequest, scopedFiles);
		const result = await this.executeKnowledgeOperation(projectId, agentId, userId, command);
		const stdout = truncateOperationOutput(result.stdout);
		const stderr = truncateOperationOutput(result.stderr);

		if (result.exitCode === 1) {
			return {
				matches: [],
				limit,
				offset,
				hasMore: false,
				truncated: stdout.truncated || stderr.truncated,
			};
		}

		const parsed = parseRipgrepJsonOutput(stdout.text, references.byFile);

		// rg exits 2 when any scoped file could not be read (e.g. a DB row whose
		// volume file is missing), but it still emits valid matches for the files
		// it did read. Surface those as partial, truncated results instead of
		// discarding them; only fail when there is nothing to return.
		const commandFailed = result.exitCode !== 0;
		if (commandFailed && parsed.matches.length === 0) {
			throw new OperationalError(
				`Agent knowledge search failed${stderr.text ? `: ${stderr.text}` : ''}`,
			);
		}

		const incomplete = parsed.incomplete || commandFailed;
		const matches = parsed.matches.slice(offset, offset + limit);

		return {
			matches,
			limit,
			offset,
			hasMore:
				parsed.matches.length > offset + limit ||
				stdout.truncated ||
				stderr.truncated ||
				incomplete,
			truncated: stdout.truncated || stderr.truncated || incomplete,
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
		const stdout = truncateOperationOutput(result.stdout);
		const stderr = truncateOperationOutput(result.stderr);

		if (result.exitCode !== 0) {
			throw new OperationalError(
				`Agent knowledge read failed${stderr.text ? `: ${stderr.text}` : ''}`,
			);
		}

		return {
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
			ranges: parseReadKnowledgeOutput(stdout.text, file, validatedRequest),
			truncated: stdout.truncated || stderr.truncated,
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
		try {
			return await this.runSandboxCommand(sandbox, scopedCommand, timeoutSeconds);
		} catch {
			// The cached handle may point at a stopped or destroyed sandbox; drop
			// it and retry once on a freshly acquired one so transient handle
			// staleness never surfaces as a failed tool call.
			this.invalidateSandboxCache(projectId, agentId, userId);
		}

		const freshSandbox = await this.acquireSandbox(projectId, agentId, userId);
		try {
			return await this.runSandboxCommand(freshSandbox, scopedCommand, timeoutSeconds);
		} catch (error) {
			this.invalidateSandboxCache(projectId, agentId, userId);
			throw error;
		}
	}

	private async runSandboxCommand(
		sandbox: Sandbox,
		scopedCommand: string,
		timeoutSeconds: number,
	): Promise<AgentKnowledgeCommandResult> {
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

	private resolveSearchScope(
		request: SearchKnowledgeRequest,
		references: AgentKnowledgeReferenceLookup,
	): AgentKnowledgeFileReference[] | undefined {
		const selected = new Map<string, AgentKnowledgeFileReference>();
		const addByFile = (filePath: string) => {
			const normalized = assertValidKnowledgeFilePath(filePath);
			const file = references.byFile.get(normalized);
			if (!file) {
				throw new BadRequestError('Knowledge file not found');
			}
			selected.set(file.file, file);
		};
		const addById = (fileId: string) => {
			const file = references.byId.get(fileId);
			if (!file) {
				throw new BadRequestError('Knowledge file not found');
			}
			selected.set(file.file, file);
		};

		if (request.file) addByFile(request.file);
		for (const file of request.files ?? []) addByFile(file);
		if (request.fileId) addById(request.fileId);
		for (const fileId of request.fileIds ?? []) addById(fileId);

		return selected.size > 0 ? [...selected.values()] : undefined;
	}

	private resolveRequiredFile(
		request: ReadKnowledgeRequest,
		references: AgentKnowledgeReferenceLookup,
	): AgentKnowledgeFileReference {
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
			const fileByPath = references.byFile.get(normalized);
			if (!fileByPath) {
				throw new BadRequestError('Knowledge file not found');
			}
			return fileByPath;
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
		userId: string,
	): Promise<Sandbox> {
		const cacheKey = buildSandboxScopeKey(projectId, agentId, userId);
		const cached = this.sandboxCache.get(cacheKey);
		if (cached && cached.expiresAt > Date.now()) {
			return cached.sandbox;
		}
		this.sandboxCache.delete(cacheKey);

		// Coalesce concurrent acquisitions for the same scope so parallel tool
		// calls cannot both miss the list-then-create check and spawn
		// duplicate sandboxes.
		let pending = this.pendingSandboxAcquisitions.get(cacheKey);
		if (!pending) {
			pending = this.acquireSandboxFresh(projectId, agentId, userId)
				.then((sandbox) => {
					this.sandboxCache.set(cacheKey, {
						sandbox,
						expiresAt: Date.now() + SANDBOX_CACHE_TTL_MS,
					});
					return sandbox;
				})
				.finally(() => {
					this.pendingSandboxAcquisitions.delete(cacheKey);
				});
			this.pendingSandboxAcquisitions.set(cacheKey, pending);
		}

		return await pending;
	}

	private invalidateSandboxCache(projectId: string, agentId: string, userId: string): void {
		this.sandboxCache.delete(buildSandboxScopeKey(projectId, agentId, userId));
	}

	private async acquireSandboxFresh(
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<Sandbox> {
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

				const reusableSandbox = await this.resolveReusableSandbox(daytona, sandbox, connection);
				this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId });
				return reusableSandbox;
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
			subpath: buildKnowledgeVolumeSubpath(this.instanceSettings.instanceId, projectId, agentId),
		};
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
		this.assertKnowledgeSandboxEnabled();
		this.assertKnowledgeVolumeConfigured();
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
