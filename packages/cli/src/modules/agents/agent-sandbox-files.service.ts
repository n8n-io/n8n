import { CORE_WORKSPACE_TOOL_NAMES, type Workspace } from '@n8n/agents';
import { MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { extension, lookup } from 'mime-types';
import { OperationalError, UserError } from 'n8n-workflow';
import { posix } from 'node:path';

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

export interface SandboxOutputFile {
	/** Path relative to `outputs/`. */
	path: string;
	/** SHA-256 of the bytes, hex. */
	hash: string;
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

/** Only a turn that used the workspace can have changed `outputs/`. Other turns leave the sandbox asleep. */
export function usedWorkspace(timeline: TimelineEvent[]): boolean {
	return timeline.some(
		(event) => event.type === 'tool-call' && CORE_WORKSPACE_TOOL_NAMES.has(event.name),
	);
}

/**
 * Normalise a path relative to `outputs/`. Return undefined for a path that
 * leaves `outputs/`.
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
	constructor(
		private readonly logger: Logger,
		private readonly attachmentService: AgentChatAttachmentService,
	) {}

	/**
	 * Store the new files of `outputs/` at the end of a turn. A file is new
	 * when the thread cannot read a file with the same bytes. Never throws:
	 * a file that fails is logged, and the next turn tries it again.
	 */
	async syncOutputs(workspace: Workspace, scope: SandboxFileScope): Promise<void> {
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
