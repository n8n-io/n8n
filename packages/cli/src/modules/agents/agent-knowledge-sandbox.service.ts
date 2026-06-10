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
import { AiService } from '@/services/ai.service';

import {
	AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH,
	assertKnowledgePathSegment,
	buildKnowledgeVolumeSubpath,
	fromVolumeStorageReference,
	KNOWLEDGE_FILES_DIR,
	type AgentKnowledgeFilesystem,
} from './agent-knowledge-storage';
import {
	assertValidKnowledgeFilePath,
	DEFAULT_FIND_FILES_LIMIT,
	DEFAULT_SEARCH_TEXT_LIMIT,
	MAX_CONTEXT_LINES,
	MAX_OPERATION_OUTPUT_CHARS,
	MAX_READ_LINE_CHARS,
	MAX_SEARCH_LINE_CHARS,
	parseFindKnowledgeFilesRequest,
	parseReadKnowledgeRequest,
	parseSearchKnowledgeRequest,
	truncateKnowledgeText,
	type AgentKnowledgeFileReference,
	type AgentKnowledgeLine,
	type FindKnowledgeFilesRequest,
	type FindKnowledgeFilesResult,
	type ReadKnowledgeRangeResult,
	type ReadKnowledgeRequest,
	type ReadKnowledgeResult,
	type SearchKnowledgeMatch,
	type SearchKnowledgeRequest,
	type SearchKnowledgeResult,
} from './agent-knowledge-retrieval';
import { AgentFileRepository } from './repositories/agent-file.repository';

interface AgentKnowledgeCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
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
const OUTPUT_TRUNCATED_MARKER = '__N8N_AGENT_KNOWLEDGE_OUTPUT_TRUNCATED__';
const SHELL_OUTPUT_LIMIT_CHARS = MAX_OPERATION_OUTPUT_CHARS - OUTPUT_TRUNCATED_MARKER.length - 2;

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
		private readonly instanceSettings: InstanceSettings,
		private readonly agentFileRepository: AgentFileRepository,
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

	async findKnowledgeFiles(
		projectId: string,
		agentId: string,
		request: FindKnowledgeFilesRequest,
	): Promise<FindKnowledgeFilesResult> {
		const validatedRequest = parseFindKnowledgeFilesRequest(request);
		this.assertKnowledgeSandboxEnabled();
		this.assertKnowledgeVolumeConfigured();
		this.assertValidPathSegments(projectId, agentId);

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

		if (references.files.length === 0 || scopedFiles?.length === 0) {
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

		if (result.exitCode !== 0) {
			throw new OperationalError(
				`Agent knowledge search failed${stderr.text ? `: ${stderr.text}` : ''}`,
			);
		}

		const parsed = parseRipgrepJsonOutput(stdout.text, references.byFile);
		const matches = parsed.matches.slice(offset, offset + limit);

		return {
			matches,
			limit,
			offset,
			hasMore:
				parsed.matches.length > offset + limit ||
				stdout.truncated ||
				stderr.truncated ||
				parsed.incomplete,
			truncated: stdout.truncated || stderr.truncated || parsed.incomplete,
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
		const { sandbox } = await this.acquireSandbox(projectId, agentId, userId);
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
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

	private async loadKnowledgeReferenceLookup(
		projectId: string,
		agentId: string,
	): Promise<AgentKnowledgeReferenceLookup> {
		this.assertKnowledgeSandboxEnabled();
		this.assertKnowledgeVolumeConfigured();
		this.assertValidPathSegments(projectId, agentId);

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
			readFile: async (filePath) => await sandbox.fs.downloadFile(filePath),
			writeFile: async (filePath, content) => {
				const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
				const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
				if (parentDir) {
					await sandbox.fs.createFolder(parentDir, '755').catch(() => undefined);
				}
				await sandbox.fs.uploadFile(buffer, filePath);
			},
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

				const reusableSandbox = await this.resolveReusableSandbox(daytona, sandbox, connection);
				this.logger.debug('Reused agent knowledge sandbox', { projectId, agentId });
				return { sandbox: reusableSandbox, reused: true };
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

function buildSearchKnowledgeCommand(
	request: SearchKnowledgeRequest,
	files: AgentKnowledgeFileReference[] | undefined,
): string {
	const matchLimit = (request.offset ?? 0) + (request.limit ?? DEFAULT_SEARCH_TEXT_LIMIT) + 1;
	const args = [
		'rg',
		'--json',
		'--fixed-strings',
		'--line-number',
		'--color=never',
		'--hidden',
		'--max-count',
		String(matchLimit),
		'--max-columns',
		String(MAX_SEARCH_LINE_CHARS + 1),
		'--max-columns-preview',
		...(request.caseSensitive === true ? [] : ['--ignore-case']),
		...(request.contextLines && request.contextLines > 0
			? ['--context', String(request.contextLines)]
			: []),
		'--',
		quoteShellArg(request.query),
		...(files?.map((file) => quoteShellArg(`./${file.file}`)) ?? [quoteShellArg('.')]),
	];

	return args.join(' ');
}

function knowledgeFileMatchesQuery(
	file: AgentKnowledgeFileReference,
	query: string,
	compactQuery: string,
): boolean {
	const storageName = file.file.toLocaleLowerCase();
	const displayName = file.displayName.toLocaleLowerCase();

	return (
		storageName.includes(query) ||
		displayName.includes(query) ||
		(compactQuery.length > 0 &&
			(compactKnowledgeFileLookupText(storageName).includes(compactQuery) ||
				compactKnowledgeFileLookupText(displayName).includes(compactQuery)))
	);
}

function compactKnowledgeFileLookupText(value: string): string {
	return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildReadKnowledgeCommand(file: string, request: ReadKnowledgeRequest): string {
	const script = request.ranges
		.map(
			(range, index) =>
				`NR >= ${range.startLine} && NR <= ${range.endLine} { printf "${index}\\t%d\\t%s\\n", NR, substr($0, 1, ${
					MAX_READ_LINE_CHARS + 1
				}) }`,
		)
		.join(' ');

	return `awk ${quoteShellArg(script)} ${quoteShellArg(`./${file}`)}`;
}

function parseRipgrepJsonOutput(
	output: string,
	filesByPath: Map<string, AgentKnowledgeFileReference>,
): { matches: SearchKnowledgeMatch[]; incomplete: boolean } {
	const matches: SearchKnowledgeMatch[] = [];
	const contextBeforeByFile = new Map<string, AgentKnowledgeLine[]>();
	let incomplete = false;

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;

		let event: unknown;
		try {
			event = JSON.parse(line);
		} catch {
			incomplete = true;
			continue;
		}

		if (!isRecord(event) || !isRecord(event.data)) continue;

		if (event.type === 'match') {
			const file = resolveRipgrepFile(event.data, filesByPath);
			const lineNumber = readNumber(event.data.line_number);
			const text = readRipgrepText(event.data);
			if (!file || lineNumber === undefined || text === undefined) continue;

			const contextBefore = contextBeforeByFile.get(file.file) ?? [];
			const truncatedText = truncateKnowledgeText(
				stripTrailingNewline(text),
				MAX_SEARCH_LINE_CHARS,
			);
			const startLine =
				contextBefore.length > 0 ? Math.min(contextBefore[0].lineNumber, lineNumber) : lineNumber;
			const match: SearchKnowledgeMatch = {
				file: file.file,
				fileId: file.fileId,
				displayName: file.displayName,
				lineNumber,
				text: truncatedText.text,
				textTruncated: truncatedText.truncated,
				...(contextBefore.length > 0 ? { contextBefore: [...contextBefore] } : {}),
				citation: {
					file: file.file,
					fileId: file.fileId,
					displayName: file.displayName,
					startLine,
					endLine: lineNumber,
				},
			};
			matches.push(match);
			contextBeforeByFile.set(file.file, []);
			continue;
		}

		if (event.type === 'context') {
			const file = resolveRipgrepFile(event.data, filesByPath);
			const lineNumber = readNumber(event.data.line_number);
			const text = readRipgrepText(event.data);
			if (!file || lineNumber === undefined || text === undefined) continue;

			const lineEntry = makeKnowledgeLine(lineNumber, text, MAX_SEARCH_LINE_CHARS);
			const lastMatch = matches[matches.length - 1];
			if (lastMatch?.file === file.file && lineNumber > lastMatch.lineNumber) {
				lastMatch.contextAfter = [...(lastMatch.contextAfter ?? []), lineEntry];
				lastMatch.citation.endLine = Math.max(lastMatch.citation.endLine, lineNumber);
				continue;
			}

			const contextBefore = contextBeforeByFile.get(file.file) ?? [];
			contextBefore.push(lineEntry);
			contextBeforeByFile.set(file.file, contextBefore.slice(-MAX_CONTEXT_LINES));
		}
	}

	return { matches, incomplete };
}

function parseReadKnowledgeOutput(
	output: string,
	file: AgentKnowledgeFileReference,
	request: ReadKnowledgeRequest,
): ReadKnowledgeRangeResult[] {
	const ranges = request.ranges.map<ReadKnowledgeRangeResult>((range) => ({
		startLine: range.startLine,
		endLine: range.endLine,
		lines: [],
		citation: {
			file: file.file,
			fileId: file.fileId,
			displayName: file.displayName,
			startLine: range.startLine,
			endLine: range.endLine,
		},
	}));

	for (const line of output.split(/\r?\n/)) {
		if (!line) continue;
		const [rangeIndexText, lineNumberText, ...textParts] = line.split('\t');
		const rangeIndex = Number(rangeIndexText);
		const lineNumber = Number(lineNumberText);
		if (!Number.isInteger(rangeIndex) || !Number.isInteger(lineNumber) || !ranges[rangeIndex]) {
			continue;
		}

		ranges[rangeIndex].lines.push(
			makeKnowledgeLine(lineNumber, textParts.join('\t'), MAX_READ_LINE_CHARS),
		);
	}

	return ranges;
}

function makeKnowledgeLine(
	lineNumber: number,
	text: string,
	maxLength: number,
): AgentKnowledgeLine {
	const truncated = truncateKnowledgeText(stripTrailingNewline(text), maxLength);
	return { lineNumber, text: truncated.text, truncated: truncated.truncated };
}

function resolveRipgrepFile(
	data: Record<string, unknown>,
	filesByPath: Map<string, AgentKnowledgeFileReference>,
): AgentKnowledgeFileReference | undefined {
	const path = readTextObject(data.path);
	if (!path) return undefined;
	return filesByPath.get(normalizeRipgrepPath(path));
}

function readRipgrepText(data: Record<string, unknown>): string | undefined {
	return readTextObject(data.lines);
}

function readTextObject(value: unknown): string | undefined {
	if (!isRecord(value) || typeof value.text !== 'string') return undefined;
	return value.text;
}

function readNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isInteger(value) ? value : undefined;
}

function normalizeRipgrepPath(filePath: string): string {
	if (filePath.startsWith(`${KNOWLEDGE_FILES_DIR}/`)) {
		return filePath.slice(KNOWLEDGE_FILES_DIR.length + 1);
	}
	if (filePath.startsWith('./')) {
		return filePath.slice(2);
	}
	return filePath;
}

function stripTrailingNewline(text: string): string {
	return text.replace(/\r?\n$/, '');
}

function quoteShellArg(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function truncateOperationOutput(text: string): { text: string; truncated: boolean } {
	const markerIndex = text.indexOf(OUTPUT_TRUNCATED_MARKER);
	const markerTruncated = markerIndex !== -1;
	const textWithoutMarker = markerTruncated
		? text.replaceAll(OUTPUT_TRUNCATED_MARKER, '').trimEnd()
		: text;

	if (textWithoutMarker.length <= MAX_OPERATION_OUTPUT_CHARS) {
		return { text: textWithoutMarker, truncated: markerTruncated };
	}

	return { text: textWithoutMarker.slice(0, MAX_OPERATION_OUTPUT_CHARS), truncated: true };
}

function buildOutputLimitedShellCommand(command: string): string {
	const capOutputScript = [
		'BEGIN { used = 0 }',
		'{',
		'  line = $0 "\\n"',
		'  remaining = max - used',
		'  if (remaining <= 0) { print "1" > truncated_file; exit 0 }',
		'  if (length(line) > remaining) {',
		'    printf "%s", substr(line, 1, remaining)',
		'    print "1" > truncated_file',
		'    exit 0',
		'  }',
		'  printf "%s", line',
		'  used += length(line)',
		'}',
	].join(' ');

	return [
		'status_file=$(mktemp)',
		'truncated_file=$(mktemp)',
		`{ ${command}; printf '%s' "$?" > "$status_file"; } | awk -v max=${SHELL_OUTPUT_LIMIT_CHARS} -v truncated_file="$truncated_file" ${quoteShellArg(
			capOutputScript,
		)}`,
		'status=$(cat "$status_file" 2>/dev/null || printf 0)',
		`if [ -s "$truncated_file" ]; then echo ${quoteShellArg(
			OUTPUT_TRUNCATED_MARKER,
		)} >&2; status=0; fi`,
		'rm -f "$status_file" "$truncated_file"',
		'exit "$status"',
	].join('; ');
}

function buildScopedKnowledgeShellCommand(command: string): string {
	return `if [ ! -d ${KNOWLEDGE_FILES_DIR} ]; then echo 'Agent knowledge files directory is unavailable' >&2; exit 2; fi; cd ${KNOWLEDGE_FILES_DIR} && ${buildOutputLimitedShellCommand(
		command,
	)}`;
}

function readCommandStderr(artifacts: { stdout?: string; stderr?: string } | undefined): string {
	if (!artifacts || !('stderr' in artifacts)) {
		return '';
	}

	const stderr = artifacts.stderr;
	return typeof stderr === 'string' ? stderr : '';
}
