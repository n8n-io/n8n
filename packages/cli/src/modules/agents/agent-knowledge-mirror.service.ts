import type { CommandResult } from '@n8n/agents/sandbox';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import escapeRegExp from 'lodash/escapeRegExp';
import { OperationalError, safeRegex } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import {
	buildMirrorFinalizeCommand,
	buildReadKnowledgeCommand,
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
import { AgentKnowledgeFileStore } from './agent-knowledge-file-store';
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
	getAgentKnowledgePaths,
	type AgentKnowledgePaths,
	storageFileNameForOriginalFileName,
} from './agent-knowledge-storage';
import {
	type AgentSandboxRuntime,
	AgentSandboxRuntimeService,
	sanitizeSandboxErrorDetail,
} from './agent-sandbox-runtime.service';
import { AgentFileRepository } from './repositories/agent-file.repository';
import { AgentRepository } from './repositories/agent.repository';

const GLOB_MATCH_TIMEOUT_MS = 250;

interface AgentKnowledgeMirrorRuntime extends AgentSandboxRuntime {
	paths: AgentKnowledgePaths;
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

function parseMirrorManifest(output: string): Map<string, string> {
	const manifest = new Map<string, string>();
	for (const entry of output.split(/\r?\n/)) {
		const line = entry.trim();
		if (!line) continue;
		const separator = line.indexOf('\t');
		if (separator === -1) {
			manifest.set(line, '');
		} else {
			manifest.set(line.slice(separator + 1), line.slice(0, separator));
		}
	}
	return manifest;
}

function formatSandboxCommandFailure(
	operation: 'glob' | 'read' | 'search',
	result: CommandResult,
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
	result: CommandResult,
): void {
	if (result.exitCode !== KNOWLEDGE_FILES_DIR_UNAVAILABLE_EXIT_CODE) return;

	throw new OperationalError(
		`Agent knowledge ${operation} failed because the uploaded knowledge files directory is unavailable in the sandbox`,
	);
}

@Service()
export class AgentKnowledgeMirrorService {
	private readonly pendingMirrorSyncs = new Map<string, Promise<void>>();

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
		private readonly agentFileRepository: AgentFileRepository,
		private readonly agentRepository: AgentRepository,
		private readonly agentKnowledgeFileStore: AgentKnowledgeFileStore,
	) {}

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

	/**
	 * Fire-and-forget mirror pre-warm. Called after uploads so the mirror copy
	 * runs while the just-written data is still hot, instead of taxing the
	 * next search with it.
	 */
	prewarmMirrorInBackground(projectId: string, agentId: string): void {
		void (async () => {
			const references = await this.loadKnowledgeReferenceLookup(projectId, agentId);
			const runtime = await this.acquireKnowledgeRuntime(projectId, agentId);
			await this.ensureMirrorSynced(runtime, references.files);
		})().catch((error) => {
			this.logger.warn('Agent knowledge mirror pre-warm failed', {
				projectId,
				agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	private async executeKnowledgeOperation(
		projectId: string,
		agentId: string,
		command: string,
		files: AgentKnowledgeFileReference[],
	): Promise<CommandResult> {
		const runtime = await this.acquireKnowledgeRuntime(projectId, agentId);
		const scopedCommand = buildScopedKnowledgeShellCommand(command, runtime.paths);
		await this.ensureMirrorSynced(runtime, files);
		return await this.agentSandboxRuntimeService.executeSandboxCommand(
			runtime.sandbox,
			scopedCommand,
			this.agentsConfig.sandboxTimeout,
		);
	}

	/**
	 * Keeps the sandbox-local knowledge mirror in sync with the DB-derived
	 * file list before a read/search command runs against it. The remote
	 * manifest is read every time because providers can reuse sandbox IDs.
	 */
	private async ensureMirrorSynced(
		runtime: AgentKnowledgeMirrorRuntime,
		files: AgentKnowledgeFileReference[],
	): Promise<void> {
		const previous = this.pendingMirrorSyncs.get(runtime.cacheKey) ?? Promise.resolve();
		const next = previous
			.catch(() => undefined)
			.then(async () => await this.syncMirror(runtime, files));
		this.pendingMirrorSyncs.set(runtime.cacheKey, next);

		try {
			await next;
		} finally {
			if (this.pendingMirrorSyncs.get(runtime.cacheKey) === next) {
				this.pendingMirrorSyncs.delete(runtime.cacheKey);
			}
		}
	}

	private async syncMirror(
		runtime: AgentKnowledgeMirrorRuntime,
		files: AgentKnowledgeFileReference[],
	): Promise<void> {
		const manifestResult = await this.agentSandboxRuntimeService.executeSandboxCommand(
			runtime.sandbox,
			`cat ${runtime.paths.manifest} 2>/dev/null || true`,
			MIRROR_SYNC_TIMEOUT_SECONDS * 1000,
		);
		const present = parseMirrorManifest(manifestResult.stdout);

		const expectedNames = files.map((file) => file.file);
		const expectedSet = new Set(expectedNames);
		const toCopy = files.filter((file) => present.get(file.file) !== file.fileId);
		const toDelete = [...present.keys()].filter((name) => !expectedSet.has(name));

		if (toCopy.length === 0 && toDelete.length === 0) return;

		for (const name of [...expectedNames, ...toDelete]) {
			assertKnowledgePathSegment(name, 'knowledge mirror file name');
		}

		const stagingId = nanoid();
		const stagingDir = `${runtime.paths.stagingDir}/${stagingId}`;
		try {
			const copiedNames = await this.uploadMirrorFiles(runtime, toCopy, stagingId);
			const finalManifestFiles = files.filter(
				(file) => copiedNames.has(file.file) || present.get(file.file) === file.fileId,
			);
			const staleFiles = toCopy
				.filter((file) => present.has(file.file) && !copiedNames.has(file.file))
				.map((file) => file.file);

			const syncResult = await this.agentSandboxRuntimeService.executeSandboxCommand(
				runtime.sandbox,
				buildMirrorFinalizeCommand(
					[...copiedNames],
					[...toDelete, ...staleFiles],
					finalManifestFiles,
					runtime.paths,
					stagingId,
				),
				MIRROR_SYNC_TIMEOUT_SECONDS * 1000,
			);
			if (syncResult.exitCode !== 0) {
				throw new OperationalError(
					`Agent knowledge mirror sync failed: exitCode=${syncResult.exitCode}; output=${sanitizeSandboxErrorDetail(syncResult.stdout)}`,
				);
			}
		} finally {
			if (toCopy.length > 0) {
				try {
					await runtime.filesystem.rmdir(stagingDir, { recursive: true, force: true });
				} catch (error) {
					this.logger.warn('Failed to clean agent knowledge mirror staging directory', {
						sandboxName: runtime.cacheKey,
						stagingId,
						error: sanitizeSandboxErrorDetail(
							error instanceof Error ? error.message : String(error),
						),
					});
				}
			}
		}
	}

	/**
	 * Fetches each file from the knowledge file store and uploads it to
	 * a per-sync staging path; `buildMirrorFinalizeCommand`
	 * moves it into place so a concurrent search never sees a partially-written
	 * file. Files are loaded and written one at a time so the whole knowledge
	 * base (up to 1.5 GB) is never held in memory at once.
	 * Returns the names of files that were fetched and uploaded successfully.
	 */
	private async uploadMirrorFiles(
		runtime: AgentKnowledgeMirrorRuntime,
		files: AgentKnowledgeFileReference[],
		stagingId: string,
	): Promise<Set<string>> {
		const copiedNames = new Set<string>();
		if (files.length === 0) return copiedNames;

		const stagingDir = `${runtime.paths.stagingDir}/${stagingId}`;
		await runtime.filesystem.mkdir(stagingDir, { recursive: true });

		for (const file of files) {
			const name = file.file;
			let buffer: Buffer | null;
			try {
				buffer = await this.agentKnowledgeFileStore.readAsBuffer({
					storedAt: file.storedAt,
					storageKey: file.storageKey,
				});
			} catch (error) {
				this.logger.warn('Failed to load agent knowledge file for mirror sync', {
					sandboxName: runtime.cacheKey,
					file: name,
					error: error instanceof Error ? error.message : String(error),
				});
				continue;
			}
			if (!buffer) {
				this.logger.warn('Failed to load agent knowledge file for mirror sync', {
					sandboxName: runtime.cacheKey,
					file: name,
					error: 'not found',
				});
				continue;
			}

			await runtime.filesystem.writeFile(`${stagingDir}/${name}`, buffer);
			copiedNames.add(name);
		}

		return copiedNames;
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
			storedAt: file.storedAt,
			storageKey: file.storageKey,
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

	private async assertKnowledgeAccess(projectId: string, agentId: string): Promise<void> {
		this.agentSandboxRuntimeService.assertSandboxConfiguration(projectId, agentId);
		const agentExists = await this.agentRepository.existsBy({ id: agentId, projectId });
		if (!agentExists) {
			throw new NotFoundError(`Agent "${agentId}" not found`);
		}
	}

	private async acquireKnowledgeRuntime(
		projectId: string,
		agentId: string,
	): Promise<AgentKnowledgeMirrorRuntime> {
		const runtime = await this.agentSandboxRuntimeService.acquireKnowledgeSandbox(
			projectId,
			agentId,
		);
		return { ...runtime, paths: getAgentKnowledgePaths(runtime.provider) };
	}
}

function matchKnowledgeFilesByGlob(
	files: AgentKnowledgeFileReference[],
	request: GlobKnowledgeFilesRequest,
): AgentKnowledgeFileReference[] {
	const caseSensitive = request.caseSensitive === true;
	const source = globPatternToRegexSource(request.pattern);
	const flags = caseSensitive ? undefined : 'i';
	const patternTokens = tokenizeKnowledgeFilePattern(request.pattern, caseSensitive);
	const deadline = performance.now() + GLOB_MATCH_TIMEOUT_MS;
	const matchesGlob = (fileName: string): boolean => {
		if (performance.now() >= deadline) {
			throw new Error('Regular expression execution timed out');
		}

		const matches = safeRegex.test(source, fileName, flags);
		if (performance.now() >= deadline) {
			throw new Error('Regular expression execution timed out');
		}

		return matches;
	};
	return files
		.filter((file) => matchesGlob(file.file) || matchesGlob(file.displayName))
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

function globPatternToRegexSource(pattern: string): string {
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
	return source;
}
