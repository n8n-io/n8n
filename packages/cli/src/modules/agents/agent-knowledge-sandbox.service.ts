import type { Sandbox, SandboxState } from '@daytona/sdk';
import { redactText } from '@n8n/agents';
import { loadDaytona } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { BinaryDataService, InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AiService } from '@/services/ai.service';
import { callAiServiceWithRetry } from '@/utils/ai-service-retry';
import { TtlMap } from '@/utils/ttl-map';

import {
	buildMirrorFinalizeCommand,
	buildReadKnowledgeCommand,
	buildReadMirrorManifestCommand,
	buildScopedKnowledgeShellCommand,
	buildSearchKnowledgeCommand,
	getSearchContextWindow,
	KNOWLEDGE_FILES_DIR_UNAVAILABLE_EXIT_CODE,
	MIRROR_SYNC_TIMEOUT_SECONDS,
	parseReadKnowledgeOutput,
	parseRipgrepCountOutput,
	parseRipgrepFilesOutput,
	parseRipgrepOutput,
} from './agent-knowledge-commands';
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
import {
	assertKnowledgePathSegment,
	KNOWLEDGE_MIRROR_FILES_DIR,
	storageFileNameForOriginalFileName,
} from './agent-knowledge-storage';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';

interface AgentKnowledgeCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export const AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX = 'agent-';

const MAX_SANDBOX_ERROR_DETAIL_CHARS = 2_000;

const LABEL_KNOWLEDGE_BASE = 'n8n-agents-knowledgebase';
const LABEL_PROJECT_ID = 'n8n-project-id';
const LABEL_AGENT_ID = 'n8n-agent-id';

const SANDBOX_STATE_STARTED: SandboxState = 'started';

const DEAD_SANDBOX_STATES = new Set<SandboxState>([
	'destroyed',
	'destroying',
	'error',
	'build_failed',
]);

const DEFAULT_SANDBOX_IMAGE = 'daytonaio/sandbox:0.5.0';
const AUTO_STOP_INTERVAL_MINUTES = 5;
const MIRROR_MANIFEST_HASH_TTL_MS = 30 * Time.minutes.toMilliseconds;
// Cap B (1.5 GB knowledge base limit) keeps real copies well under this —
// this only guards against the sandbox disk unexpectedly filling up.
const MIRROR_DISK_FIT_WARNING_BYTES = 2 * 1024 * 1024 * 1024;
// Caps how many file bytes are held in the main process at once while
// staging a mirror sync — the KB itself can be up to 1.5 GB.
const MIRROR_UPLOAD_BATCH_BYTES = 64 * 1024 * 1024;

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

function buildSandboxScopeKey(projectId: string, agentId: string): string {
	return `${projectId}:${agentId}`;
}

// Proxy sandbox-operation routes only match `[a-z0-9][a-z0-9_-]+` — the name
// must be lowercase. instanceId groups one instance's sandboxes together;
// projectId and agentId are a globally unique nanoid pair beneath it.
function buildSandboxName(scope: {
	instanceId: string;
	projectId: string;
	agentId: string;
}): string {
	return `${AGENT_KNOWLEDGE_SANDBOX_NAME_PREFIX}${scope.instanceId}-${scope.projectId}-${scope.agentId}`.toLowerCase();
}

function extractCommandOutput(result: {
	result?: string;
	artifacts?: { stdout?: string };
}): string {
	return result.artifacts?.stdout ?? result.result ?? '';
}

function parseManifestNames(output: string): string[] {
	return output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

function hashManifestNames(names: string[]): string {
	return createHash('sha256')
		.update(JSON.stringify([...names].sort()))
		.digest('hex');
}

function isDaytonaNotFoundError(error: unknown): boolean {
	const { DaytonaNotFoundError } = loadDaytona();
	return error instanceof DaytonaNotFoundError;
}

function buildScopeLabels(projectId: string, agentId: string): Record<string, string> {
	return {
		[LABEL_KNOWLEDGE_BASE]: 'true',
		[LABEL_PROJECT_ID]: projectId,
		[LABEL_AGENT_ID]: agentId,
	};
}

function isUsableSandbox(sandbox: Sandbox): boolean {
	const state = sandbox.state;
	if (!state) return true;
	return !DEAD_SANDBOX_STATES.has(state);
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
	private readonly mirrorManifestHashes = new TtlMap<string, string>(MIRROR_MANIFEST_HASH_TTL_MS);
	private readonly pendingMirrorSyncs = new Map<string, Promise<void>>();

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly aiService: AiService,
		private readonly instanceSettings: InstanceSettings,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly agentRepository: AgentRepository,
		private readonly binaryDataService: BinaryDataService,
	) {}

	async warmSandbox(projectId: string, agentId: string): Promise<void> {
		this.assertKnowledgeConfiguration(projectId, agentId);
		await this.acquireSandbox(projectId, agentId);
	}

	/**
	 * Best-effort sandbox teardown for agent/project deletion. Never throws —
	 * callers must not have cleanup failures block the parent delete operation.
	 */
	async destroySandbox(projectId: string, agentId: string): Promise<void> {
		if (!this.isKnowledgeBaseEnabled()) return;

		try {
			const { Daytona } = loadDaytona();
			const connection = await this.resolveDaytonaConnection(projectId);
			const daytona = new Daytona({
				apiUrl: connection.apiUrl,
				apiKey: connection.apiKey,
			});
			const name = buildSandboxName({
				instanceId: this.instanceSettings.instanceId,
				projectId,
				agentId,
			});
			const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
			const sandbox = await daytona.get(name);
			await sandbox.delete(timeoutSeconds);
		} catch (error) {
			this.logger.warn('Failed to destroy agent knowledge sandbox', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async searchKnowledge(
		projectId: string,
		agentId: string,
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
		for (const path of validatedRequest.path ?? []) {
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
		const result = await this.executeKnowledgeOperation(
			projectId,
			agentId,
			command,
			references.files,
		);

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
		request: GlobKnowledgeFilesRequest,
	): Promise<GlobKnowledgeFilesResult> {
		const validatedRequest = parseGlobKnowledgeFilesRequest(request);
		const references = await this.loadKnowledgeReferenceLookup(projectId, agentId);
		const limit = validatedRequest.limit ?? DEFAULT_GLOB_FILES_LIMIT;
		const offset = validatedRequest.offset ?? 0;

		if (references.files.length === 0) {
			return { files: [], limit, offset, hasMore: false };
		}

		const matches = matchKnowledgeFilesByGlob(references.files, validatedRequest);

		return {
			files: matches.slice(offset, offset + limit),
			limit,
			offset,
			hasMore: matches.length > offset + limit,
		};
	}

	async readKnowledge(
		projectId: string,
		agentId: string,
		request: ReadKnowledgeRequest,
	): Promise<ReadKnowledgeResult> {
		const validatedRequest = parseReadKnowledgeRequest(request);
		const references = await this.loadKnowledgeReferenceLookup(projectId, agentId);
		const file = this.resolveRequiredFile(validatedRequest, references);
		const command = buildReadKnowledgeCommand(file.file, validatedRequest);
		const result = await this.executeKnowledgeOperation(
			projectId,
			agentId,
			command,
			references.files,
		);

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
		command: string,
		files: AgentKnowledgeFileReference[],
	): Promise<AgentKnowledgeCommandResult> {
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
		const scopedCommand = buildScopedKnowledgeShellCommand(command);
		const sandbox = await this.acquireSandbox(projectId, agentId);
		const sandboxName = buildSandboxName({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
		});
		await this.ensureMirrorSynced(sandbox, files, sandboxName);
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

	/**
	 * Keeps the sandbox-local knowledge mirror in sync with the DB-derived
	 * file list before a read/search command runs against it. Short-circuits
	 * via an in-memory manifest hash so repeated operations with an unchanged
	 * file set issue no sandbox commands at all.
	 */
	private async ensureMirrorSynced(
		sandbox: Sandbox,
		files: AgentKnowledgeFileReference[],
		sandboxName: string,
	): Promise<void> {
		const expectedHash = hashManifestNames(files.map((file) => file.file));
		if (this.mirrorManifestHashes.get(sandboxName) === expectedHash) {
			return;
		}

		let pending = this.pendingMirrorSyncs.get(sandboxName);
		if (!pending) {
			pending = this.syncMirror(sandbox, files, expectedHash, sandboxName).finally(() => {
				this.pendingMirrorSyncs.delete(sandboxName);
			});
			this.pendingMirrorSyncs.set(sandboxName, pending);
		}
		await pending;
	}

	private async syncMirror(
		sandbox: Sandbox,
		files: AgentKnowledgeFileReference[],
		expectedHash: string,
		sandboxName: string,
	): Promise<void> {
		// Re-check now that we hold the per-sandbox lock — a concurrent call may
		// have just finished syncing to the same expected set.
		if (this.mirrorManifestHashes.get(sandboxName) === expectedHash) return;

		const manifestResult = await sandbox.process.executeCommand(
			buildReadMirrorManifestCommand(),
			undefined,
			undefined,
			MIRROR_SYNC_TIMEOUT_SECONDS,
		);
		const present = parseManifestNames(extractCommandOutput(manifestResult));

		const expectedNames = files.map((file) => file.file);
		const expectedSet = new Set(expectedNames);
		const presentSet = new Set(present);
		const toCopy = expectedNames.filter((name) => !presentSet.has(name));
		const toDelete = present.filter((name) => !expectedSet.has(name));

		if (toCopy.length === 0 && toDelete.length === 0) {
			this.mirrorManifestHashes.set(sandboxName, expectedHash);
			return;
		}

		for (const name of [...expectedNames, ...toDelete]) {
			assertKnowledgePathSegment(name, 'knowledge mirror file name');
		}

		if (present.length === 0 && toCopy.length > 0) {
			const totalBytes = files.reduce((total, file) => total + file.fileSizeBytes, 0);
			if (totalBytes > MIRROR_DISK_FIT_WARNING_BYTES) {
				this.logger.warn('Agent knowledge mirror copy exceeds the disk-fit guard threshold', {
					sandboxName,
					totalBytes,
				});
			}
		}

		const filesByName = new Map(files.map((file) => [file.file, file]));
		const copiedNames = await this.uploadMirrorFiles(sandbox, toCopy, filesByName, sandboxName);
		// Files that failed to load from BinaryDataService are left out of the
		// manifest, so the next sync attempt retries them as `toCopy` again.
		const finalManifestNames = expectedNames.filter(
			(name) => copiedNames.has(name) || presentSet.has(name),
		);

		const syncResult = await sandbox.process.executeCommand(
			buildMirrorFinalizeCommand([...copiedNames], toDelete, finalManifestNames),
			undefined,
			undefined,
			MIRROR_SYNC_TIMEOUT_SECONDS,
		);
		if (syncResult.exitCode !== 0) {
			throw new OperationalError(
				`Agent knowledge mirror sync failed: exitCode=${syncResult.exitCode}; output=${sanitizeSandboxErrorDetail(extractCommandOutput(syncResult))}`,
			);
		}
		// Cache the hash of what's actually on disk, not `expectedHash`: if a
		// file failed to load, this mismatches the next `expectedHash` and
		// forces a retry instead of silently caching a partial mirror as done.
		this.mirrorManifestHashes.set(sandboxName, hashManifestNames(finalManifestNames));
	}

	/**
	 * Fetches each `names` entry from BinaryDataService and uploads it to the
	 * sandbox mirror under a `.tmp-` prefix; `buildMirrorFinalizeCommand` moves
	 * it into place so a concurrent search never sees a partially-written file.
	 * Uploads flush in `MIRROR_UPLOAD_BATCH_BYTES`-sized batches so the whole
	 * knowledge base (up to 1.5 GB) is never held in memory at once.
	 * Returns the subset of `names` that were fetched and uploaded successfully.
	 */
	private async uploadMirrorFiles(
		sandbox: Sandbox,
		names: string[],
		filesByName: Map<string, AgentKnowledgeFileReference>,
		sandboxName: string,
	): Promise<Set<string>> {
		const copiedNames = new Set<string>();
		if (names.length === 0) return copiedNames;

		await sandbox.fs.createFolder(KNOWLEDGE_MIRROR_FILES_DIR, '755');

		let batch: Array<{ source: Buffer; destination: string }> = [];
		let batchNames: string[] = [];
		let batchBytes = 0;

		const flushBatch = async (): Promise<void> => {
			if (batch.length === 0) return;
			await sandbox.fs.uploadFiles(batch);
			for (const name of batchNames) copiedNames.add(name);
			batch = [];
			batchNames = [];
			batchBytes = 0;
		};

		for (const name of names) {
			const file = filesByName.get(name);
			if (!file) continue;

			try {
				const buffer = await this.binaryDataService.getAsBuffer({
					id: file.binaryDataId,
					data: '',
					mimeType: file.mimeType,
				});
				batch.push({ source: buffer, destination: `${KNOWLEDGE_MIRROR_FILES_DIR}/.tmp-${name}` });
				batchNames.push(name);
				batchBytes += buffer.length;
			} catch (error) {
				this.logger.warn('Failed to load agent knowledge file for mirror sync', {
					sandboxName,
					file: name,
					error: error instanceof Error ? error.message : String(error),
				});
				continue;
			}

			if (batchBytes >= MIRROR_UPLOAD_BATCH_BYTES) {
				await flushBatch();
			}
		}

		await flushBatch();

		return copiedNames;
	}

	/**
	 * Fire-and-forget mirror pre-warm. Called after uploads so the mirror copy
	 * runs while the just-written data is still hot, instead of taxing the
	 * next search with it.
	 */
	prewarmMirrorInBackground(projectId: string, agentId: string): void {
		void (async () => {
			const references = await this.loadKnowledgeReferenceLookup(projectId, agentId);
			const sandbox = await this.acquireSandbox(projectId, agentId);
			const sandboxName = buildSandboxName({
				instanceId: this.instanceSettings.instanceId,
				projectId,
				agentId,
			});
			await this.ensureMirrorSynced(sandbox, references.files, sandboxName);
		})().catch((error) => {
			this.logger.warn('Agent knowledge mirror pre-warm failed', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	/** Invalidates the cached mirror state so the next operation re-syncs. */
	invalidateMirror(projectId: string, agentId: string): void {
		const sandboxName = buildSandboxName({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
		});
		this.mirrorManifestHashes.delete(sandboxName);
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
			file: storageFileNameForOriginalFileName(file.fileName),
			fileId: file.id,
			binaryDataId: file.binaryDataId,
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

	private async acquireSandbox(projectId: string, agentId: string): Promise<Sandbox> {
		const cacheKey = buildSandboxScopeKey(projectId, agentId);
		let pending = this.pendingSandboxAcquisitions.get(cacheKey);

		if (!pending) {
			pending = this.acquireSandboxFresh(projectId, agentId).finally(() => {
				this.pendingSandboxAcquisitions.delete(cacheKey);
			});
			this.pendingSandboxAcquisitions.set(cacheKey, pending);
		}

		return await pending;
	}

	private async acquireSandboxFresh(projectId: string, agentId: string): Promise<Sandbox> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
		if (agent.activeVersionId === null) {
			throw new OperationalError(
				'Knowledge base is only available for published agents. Publish the agent first.',
			);
		}

		const { Daytona } = loadDaytona();
		const connection = await this.resolveDaytonaConnection(projectId);
		const daytona = new Daytona({
			apiUrl: connection.apiUrl,
			apiKey: connection.apiKey,
		});
		const labels = buildScopeLabels(projectId, agentId);
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
		const name = buildSandboxName({
			instanceId: this.instanceSettings.instanceId,
			projectId,
			agentId,
		});

		const sandboxByName = await this.resolveSandboxByName(
			daytona,
			name,
			timeoutSeconds,
			connection,
		);
		if (sandboxByName) {
			this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId, name });
			return sandboxByName;
		}

		const image = connection.image;
		const baseCreateParams = {
			name,
			labels,
			language: 'typescript' as const,
			ephemeral: this.agentsConfig.sandboxEphemeral,
			autoStopInterval: AUTO_STOP_INTERVAL_MINUTES,
		};

		let sandbox: Sandbox;
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
				sandbox = await daytona.create({ ...baseCreateParams, image }, { timeout: timeoutSeconds });
			}
		} else {
			sandbox = await daytona.create({ ...baseCreateParams, image }, { timeout: timeoutSeconds });
		}

		this.logger.debug('Created agent knowledge sandbox', { projectId, agentId, name });
		return sandbox;
	}

	private async resolveDaytonaConnection(
		projectId: string,
	): Promise<AgentKnowledgeDaytonaConnection> {
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
		const proxyConfig = await callAiServiceWithRetry(
			'Agent knowledge sandbox proxy config fetch',
			async () => await client.getSandboxProxyConfig(),
			this.logger,
		);
		// The proxy does not enforce per-user identity; the project id is the stable scope for agents.
		const token = await callAiServiceWithRetry(
			'Agent knowledge sandbox proxy token mint',
			async () =>
				await client.getBuilderApiProxyToken({ id: projectId }, { userMessageId: nanoid() }),
			this.logger,
		);

		return {
			mode: 'proxy',
			apiUrl: client.getSandboxProxyBaseUrl(),
			apiKey: token.accessToken,
			image: proxyConfig.image || directImage,
			snapshot,
		};
	}

	private async resolveSandboxByName(
		daytona: { get: (name: string) => Promise<Sandbox> },
		name: string,
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

	private isKnowledgeBaseEnabled(): boolean {
		return isAgentKnowledgeBaseEnabled(this.agentsConfig, this.aiService.isProxyEnabled());
	}

	private assertKnowledgeBaseEnabled(): void {
		if (this.isKnowledgeBaseEnabled()) {
			return;
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
		.filter((file) => regex.test(file.file) || regex.test(file.displayName))
		.map((file) => ({
			file,
			bucket: getKnowledgeFileMatchBucket(file, patternTokens, caseSensitive),
		}))
		.sort(
			(left, right) =>
				left.bucket - right.bucket || left.file.displayName.localeCompare(right.file.displayName),
		)
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
