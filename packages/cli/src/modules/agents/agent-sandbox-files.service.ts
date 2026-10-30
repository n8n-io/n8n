import { CORE_WORKSPACE_TOOL_NAMES, type Workspace } from '@n8n/agents';
import {
	AGENT_SANDBOX_FILES_FLAG,
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Container, Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { extension, lookup } from 'mime-types';
import { OperationalError, UserError } from 'n8n-workflow';
import { posix } from 'node:path';

import { PostHogClient } from '@/posthog';

import {
	AgentChatAttachmentService,
	AgentFileLimitError,
	hashFileContent,
} from './agent-chat-attachment.service';
import type { AgentChatAttachment } from './entities/agent-chat-attachment.entity';
import type { TimelineEvent } from './execution-recorder';
import { resolveInboundMimeType } from './utils/inbound-attachments';

/** Directory in the workspace root where an agent puts the files that it makes. */
export const SANDBOX_OUTPUTS_DIR = 'outputs';

/** Directory in the workspace root where `import_files` copies conversation files. */
export const SANDBOX_INPUTS_DIR = 'inputs';

export interface SandboxOutputFile {
	/** Path relative to `outputs/`. */
	path: string;
	/** SHA-256 of the bytes, hex. */
	hash: string;
}

/** Prefix of a file reference that names a file in `outputs/` instead of a fileId. */
export const SANDBOX_FILE_REF_PREFIX = 'sandbox:';

/** Workspace instructions about files. Only runs with a workspace get them. */
export const SANDBOX_FILES_INSTRUCTIONS = [
	`Put each file that you make for the user in ${SANDBOX_OUTPUTS_DIR}/ of your workspace, for example ${SANDBOX_OUTPUTS_DIR}/report.pdf. When your turn ends, n8n stores the new files of ${SANDBOX_OUTPUTS_DIR}/ as conversation files.`,
	`To use a file of ${SANDBOX_OUTPUTS_DIR}/ in this turn where another tool takes a fileId, give ${SANDBOX_FILE_REF_PREFIX}<path relative to ${SANDBOX_OUTPUTS_DIR}/>, for example ${SANDBOX_FILE_REF_PREFIX}report.pdf.`,
	`To use a conversation file, such as a user upload, in your workspace, copy it to ${SANDBOX_INPUTS_DIR}/ with import_files.`,
].join(' ');

export interface ActiveRun {
	agentId: string | null;
	getWorkspace: () => Workspace | undefined;
}

export interface SandboxFileScope {
	agentId: string | null;
	projectId: string;
	/** Thread whose workspace holds the file. */
	threadId: string;
}

// Lists and hashes in the sandbox, so unchanged bytes never leave it.
// Daytona images have sha256sum (coreutils). Without it, the script lists the
// paths after a marker line, and n8n reads and hashes each file.
const NO_SHA256SUM_MARKER = '__n8n_no_sha256sum__';
const LIST_OUTPUTS_SCRIPT = [
	`[ -d ${SANDBOX_OUTPUTS_DIR} ] || exit 0`,
	`if command -v sha256sum >/dev/null 2>&1; then find ${SANDBOX_OUTPUTS_DIR} -type f -exec sha256sum {} +`,
	`else echo ${NO_SHA256SUM_MARKER}; find ${SANDBOX_OUTPUTS_DIR} -type f; fi`,
].join('; ');
const SHA256SUM_LINE = /^([0-9a-f]{64}) {2}(.+)$/;

/** The end-of-turn sync stops after this time. The next turn stores the rest. */
const SYNC_BUDGET_MS = 30 * Time.seconds.toMilliseconds;

/**
 * {@link AgentSandboxFilesService.resolveFileRefs} for tools that are built
 * outside the container. Plain fileIds need no service.
 */
export async function resolveSandboxFileRefs(
	refs: string[],
	scope: { projectId: string; threadId: string },
): Promise<string[]> {
	if (!refs.some((ref) => ref.startsWith(SANDBOX_FILE_REF_PREFIX))) return refs;
	return await Container.get(AgentSandboxFilesService).resolveFileRefs(refs, scope);
}

/** Only a turn that used the workspace can have changed `outputs/`. Other turns leave the sandbox asleep. */
export function usedWorkspace(timeline: TimelineEvent[]): boolean {
	return timeline.some(
		(event) => event.type === 'tool-call' && CORE_WORKSPACE_TOOL_NAMES.has(event.name),
	);
}

/**
 * Normalise a path relative to a workspace directory. Return undefined for a
 * path that leaves the directory.
 */
export function normalizeOutputPath(path: string): string | undefined {
	const normalized = posix.normalize(path);
	if (normalized.startsWith('/') || normalized === '.' || normalized.split('/')[0] === '..') {
		return undefined;
	}
	return normalized;
}

/**
 * Moves files between the workspace of an agent run and its conversation
 * files. Holds no state: each call takes the scoped workspace of the run.
 */
@Service()
export class AgentSandboxFilesService {
	/**
	 * The runs of this process, by thread, so that a tool can resolve a
	 * `sandbox:` reference of its thread.
	 * ponytail: in-process, for the duration of a run. A tool always runs in
	 * the process of its turn. Pass the workspace in the tool context if that
	 * changes.
	 */
	private readonly activeRuns = new Map<string, ActiveRun>();

	constructor(
		private readonly logger: Logger,
		private readonly attachmentService: AgentChatAttachmentService,
		private readonly agentsConfig: AgentsConfig,
		private readonly postHogClient: PostHogClient,
	) {}

	/** The sandbox files feature waits for its UX. Off by default. */
	async isEnabled(): Promise<boolean> {
		return (await this.postHogClient.getFeatureFlagForInstance(AGENT_SANDBOX_FILES_FLAG)) === true;
	}

	/**
	 * Copy conversation files into `inputs/` of the workspace. Each key is a
	 * path relative to `inputs/`, each value a fileId that the thread can read.
	 * @throws {UserError} when a file is not readable, a path leaves `inputs/`,
	 * or the files are larger than the import cap together.
	 */
	async importFiles(
		workspace: Workspace,
		files: Record<string, string>,
		scope: { projectId: string; threadId: string },
	): Promise<Array<{ path: string; fileId: string; sizeBytes: number }>> {
		const filesystem = workspace.filesystem;
		if (!filesystem) throw new UserError('This run has no workspace filesystem');
		const entries = await Promise.all(
			Object.entries(files).map(async ([path, fileId]) => {
				const relativePath = normalizeOutputPath(path);
				if (!relativePath) throw new UserError(`"${path}" is not a path in ${SANDBOX_INPUTS_DIR}/`);
				if (fileId.startsWith(SANDBOX_FILE_REF_PREFIX)) {
					const outputPath = fileId.slice(SANDBOX_FILE_REF_PREFIX.length);
					throw new UserError(
						`"${fileId}" is already in your workspace at ${SANDBOX_OUTPUTS_DIR}/${outputPath}`,
					);
				}
				const file = await this.attachmentService.getReadable(fileId, scope);
				if (!file) throw new UserError(`File "${fileId}" not found in this conversation`);
				return { path: posix.join(SANDBOX_INPUTS_DIR, relativePath), file };
			}),
		);
		const maxMb = this.agentsConfig.maxImportMb;
		const totalBytes = entries.reduce((sum, { file }) => sum + file.fileSizeBytes, 0);
		if (totalBytes > maxMb * 1024 * 1024) {
			throw new UserError(`One import copies up to ${maxMb} MB. Import fewer files at a time`);
		}
		const imported: Array<{ path: string; fileId: string; sizeBytes: number }> = [];
		for (const { path, file } of entries) {
			// ponytail: loads each file into memory, up to the import cap. Stream it if the cap grows.
			await filesystem.writeFile(path, await this.attachmentService.getBuffer(file), {
				recursive: true,
				overwrite: true,
			});
			imported.push({ path, fileId: file.id, sizeBytes: file.fileSizeBytes });
		}
		return imported;
	}

	/** Register the workspace of a running thread. Call {@link untrackRun} when the run ends. */
	trackRun(threadId: string, run: ActiveRun): void {
		this.activeRuns.set(threadId, run);
	}

	untrackRun(threadId: string, run: ActiveRun): void {
		if (this.activeRuns.get(threadId) === run) this.activeRuns.delete(threadId);
	}

	/**
	 * Replace each `sandbox:<path>` reference with the fileId of that file of
	 * `outputs/`, stored on demand. Other values are fileIds and stay as they
	 * are: a fileId never contains ":".
	 * @throws {UserError} when a referenced file cannot be stored.
	 */
	async resolveFileRefs(
		refs: string[],
		scope: { projectId: string; threadId: string },
	): Promise<string[]> {
		// One at a time, so a path given twice is stored once.
		const fileIds: string[] = [];
		for (const ref of refs) fileIds.push(await this.resolveFileRef(ref, scope));
		return fileIds;
	}

	private async resolveFileRef(
		ref: string,
		scope: { projectId: string; threadId: string },
	): Promise<string> {
		if (!ref.startsWith(SANDBOX_FILE_REF_PREFIX)) return ref;
		if (!(await this.isEnabled())) {
			throw new UserError(`File "${ref}" not found in this conversation`);
		}
		const run = this.activeRuns.get(scope.threadId);
		const workspace = run?.getWorkspace();
		if (!run || !workspace) {
			throw new UserError(`"${ref}" can't be used here: this run has no sandbox`);
		}
		const path = ref.slice(SANDBOX_FILE_REF_PREFIX.length);
		try {
			const file = await this.store(workspace, path, { ...scope, agentId: run.agentId });
			return file.id;
		} catch (error) {
			if (error instanceof UserError) throw error;
			throw new UserError(`"${ref}" could not be read from ${SANDBOX_OUTPUTS_DIR}/`);
		}
	}

	/**
	 * Store the new files of `outputs/` at the end of a turn. A file is new
	 * when the thread cannot read a file with the same bytes. Never throws:
	 * a file that fails is logged, and the next turn tries it again.
	 */
	async syncOutputs(workspace: Workspace, scope: SandboxFileScope): Promise<void> {
		if (!(await this.isEnabled())) return;
		const signal = AbortSignal.timeout(SYNC_BUDGET_MS);
		try {
			const files = await this.list(workspace, signal);
			const known = await this.attachmentService.findReadableByHashes(
				files.map((file) => file.hash),
				scope,
			);
			const seen = new Set(known.keys());
			for (const file of files) {
				if (seen.has(file.hash)) continue;
				if (signal.aborted) {
					this.logger.warn('Stopped storing agent sandbox files: the time budget ran out', {
						threadId: scope.threadId,
					});
					return;
				}
				seen.add(file.hash);
				// ponytail: a file over a count or total cap still gets read before the cap check. The time budget limits the cost.
				await this.store(workspace, file.path, scope, signal).catch((error: unknown) => {
					this.logger.warn('Failed to store an agent sandbox file', {
						threadId: scope.threadId,
						path: file.path,
						error: error instanceof Error ? error.message : String(error),
					});
				});
			}
		} catch (error) {
			this.logger.warn('Failed to sync agent sandbox files', {
				threadId: scope.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Files in `outputs/` with their hashes. Empty when `outputs/` does not exist. */
	async list(workspace: Workspace, abortSignal?: AbortSignal): Promise<SandboxOutputFile[]> {
		const sandbox = workspace.sandbox;
		if (!sandbox?.executeCommand) return [];
		const result = await sandbox.executeCommand('sh', ['-c', LIST_OUTPUTS_SCRIPT], { abortSignal });
		if (!result.success) {
			throw new OperationalError('Failed to list the sandbox outputs directory', {
				extra: { exitCode: result.exitCode },
			});
		}
		const [first, ...rest] = result.stdout.split('\n');
		if (first === NO_SHA256SUM_MARKER) return await this.hashInN8n(workspace, rest, abortSignal);
		const files: SandboxOutputFile[] = [];
		for (const line of [first, ...rest]) {
			// ponytail: sha256sum escapes names with a newline or a backslash (the line starts with "\"). Those files are not synced.
			const match = SHA256SUM_LINE.exec(line);
			const path = match?.[2].slice(SANDBOX_OUTPUTS_DIR.length + 1);
			if (match && path) files.push({ path, hash: match[1] });
		}
		return files;
	}

	/**
	 * Hash each listed file in n8n, for a sandbox without sha256sum. A file
	 * over the size cap is skipped, because it cannot be stored.
	 * ponytail: reads each file every turn, and again to store it. Fine for
	 * the rare image without coreutils.
	 */
	private async hashInN8n(
		workspace: Workspace,
		lines: string[],
		abortSignal?: AbortSignal,
	): Promise<SandboxOutputFile[]> {
		const filesystem = workspace.filesystem;
		if (!filesystem) return [];
		const files: SandboxOutputFile[] = [];
		for (const line of lines) {
			const path = line.startsWith(`${SANDBOX_OUTPUTS_DIR}/`)
				? line.slice(SANDBOX_OUTPUTS_DIR.length + 1)
				: '';
			if (!path) continue;
			const { size } = await filesystem.stat(line, { abortSignal });
			if (size > this.attachmentService.maxGeneratedFileBytes) continue;
			const content = await filesystem.readFile(line, { abortSignal });
			const data = typeof content === 'string' ? Buffer.from(content) : content;
			files.push({ path, hash: hashFileContent(data) });
		}
		return files;
	}

	/**
	 * Store one file of `outputs/` as a conversation file. When the thread can
	 * read a file with the same bytes, return that file instead.
	 * @throws {AgentFileLimitError} when the file is over a cap.
	 */
	async store(
		workspace: Workspace,
		path: string,
		scope: SandboxFileScope,
		abortSignal?: AbortSignal,
	): Promise<AgentChatAttachment> {
		const filesystem = workspace.filesystem;
		const relativePath = normalizeOutputPath(path);
		if (!filesystem || !relativePath) {
			throw new UserError(`"${path}" is not a file in ${SANDBOX_OUTPUTS_DIR}/`);
		}
		const sandboxPath = posix.join(SANDBOX_OUTPUTS_DIR, relativePath);
		const maxBytes = this.attachmentService.maxGeneratedFileBytes;
		const stat = await filesystem.stat(sandboxPath, { abortSignal });
		if (stat.type !== 'file') {
			throw new UserError(`"${path}" is not a file in ${SANDBOX_OUTPUTS_DIR}/`);
		}
		if (stat.size > maxBytes) {
			throw new AgentFileLimitError(
				`File "${relativePath}" is larger than ${maxBytes / 1024 / 1024} MB`,
			);
		}
		const content = await filesystem.readFile(sandboxPath, { abortSignal });
		const data = typeof content === 'string' ? Buffer.from(content) : content;
		// The file can grow between the stat and the read.
		if (data.byteLength > maxBytes) {
			throw new AgentFileLimitError(
				`File "${relativePath}" is larger than ${maxBytes / 1024 / 1024} MB`,
			);
		}

		const contentHash = hashFileContent(data);
		const existing = await this.attachmentService.findReadableByHashes([contentHash], scope);
		const found = existing.get(contentHash);
		if (found) return found;

		const id = generateNanoId();
		const mimeType = await resolveInboundMimeType(lookup(relativePath) || undefined, data);
		const fileName =
			relativePath.length > MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH
				? `${id}.${extension(mimeType) || 'bin'}`
				: relativePath;
		return await this.attachmentService.storeInbound({
			...scope,
			id,
			source: 'sandbox',
			fileName,
			mimeType,
			data,
			contentHash,
		});
	}
}
