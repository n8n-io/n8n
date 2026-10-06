import {
	MAX_SESSION_OUTPUT_FILE_BYTES,
	MAX_SESSION_OUTPUT_FILE_COUNT,
	MAX_SESSION_OUTPUT_PERSIST_BYTES,
	mergeSessionFiles,
	toSessionFileDto,
	type SessionFileDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { SourceType } from '@n8n/db';
import { Service } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import type { WorkspaceFilesystem } from '@n8n/agents';
import { BinaryDataService, FileLocation } from 'n8n-core';
import { OperationalError, type IBinaryData } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentSessionOutputFile } from './entities/agent-session-output-file.entity';
import { AgentSessionOutputFileRepository } from './repositories/agent-session-output-file.repository';
import { absoluteSessionOutputDir, mimeTypeForOutputFileName } from './session-output-directory';

const OUTPUT_SOURCE_TYPE: SourceType = 'agent_session_output';

const CAP_FILE = 'Output File exceeds 50 MB';
const CAP_COUNT = 'Session Output Files exceed 100 files';
const CAP_TOTAL = 'Session Output Files exceed 500 MB';
const CAP_NAME = 'Output File name exceeds 255 characters';

export interface AgentSessionOutputIdentity {
	agentId: string | null;
	projectId: string;
}

interface BoundRun {
	runId: string;
	emit?: (files: SessionFileDto[]) => void;
}

interface AttachedWorkspace extends AgentSessionOutputIdentity {
	filesystem: WorkspaceFilesystem;
	workspaceRoot: string;
}

function buildOutputFileLocation(agentId: string | null, fileId: string) {
	return FileLocation.ofCustom({
		pathSegments: ['agents', agentId ?? 'inline', 'outputs', fileId],
		sourceType: OUTPUT_SOURCE_TYPE,
		sourceId: fileId,
	});
}

function collisionFileName(writerId: string, fileName: string): string {
	const base = fileName.includes('/') ? fileName.slice(fileName.lastIndexOf('/') + 1) : fileName;
	const prefix = `${writerId}-`;
	return `${prefix}${base}`.slice(0, 255);
}

function toBuffer(content: string | Buffer): Buffer {
	return typeof content === 'string' ? Buffer.from(content) : content;
}

@Service()
export class AgentSessionOutputFilesService {
	private readonly bound = new Map<string, BoundRun>();
	private readonly attached = new Map<string, AttachedWorkspace>();

	constructor(
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		private readonly repository: AgentSessionOutputFileRepository,
		private readonly attachments: AgentChatAttachmentService,
	) {}

	bindRun(ctx: {
		sessionId: string;
		runId: string;
		emit?: (files: SessionFileDto[]) => void;
	}): void {
		this.bound.set(ctx.sessionId, { runId: ctx.runId, emit: ctx.emit });
	}

	unbindRun(sessionId: string): void {
		this.bound.delete(sessionId);
	}

	registerWorkspace(sessionId: string, workspace: AttachedWorkspace): void {
		this.attached.set(sessionId, workspace);
	}

	async listSessionFiles(
		threadId: string,
		scope: { projectId: string; agentId: string },
	): Promise<SessionFileDto[]> {
		const rows = await this.repository.findByThread(threadId, scope);
		return rows.map((row) => toSessionFileDto(row, 'output'));
	}

	async findByIdInThread(
		fileId: string,
		scope: { projectId: string; threadId: string },
	): Promise<AgentSessionOutputFile | null> {
		return await this.repository.findByIdInThread(fileId, scope);
	}

	async getStream(file: AgentSessionOutputFile): Promise<Readable> {
		return await this.binaryDataService.getAsStream(file.binaryDataId);
	}

	async deleteStoredData(
		binaryDataIds: string[],
		logContext: Record<string, string>,
	): Promise<void> {
		if (binaryDataIds.length === 0) return;
		await this.binaryDataService.deleteManyByBinaryDataId(binaryDataIds).catch((error: unknown) =>
			this.logger.warn('Failed to delete agent session output bytes', {
				...logContext,
				error,
			}),
		);
	}

	async sync(params: {
		sessionId: string;
		writerId: string;
		filesystem: WorkspaceFilesystem;
		workspaceRoot: string;
		mutatedOutputFileName?: string;
	}): Promise<{ errors: string[]; mutatedError?: string }> {
		const bound = this.bound.get(params.sessionId);
		if (!bound) return { errors: [] };
		const attached = this.attached.get(params.sessionId);
		if (!attached) return { errors: [] };

		const result = await this.copyOutputDir({
			sessionId: params.sessionId,
			writerId: params.writerId,
			runId: bound.runId,
			identity: attached,
			filesystem: params.filesystem,
			workspaceRoot: params.workspaceRoot,
			deleteMissing: false,
			forceFileName: params.mutatedOutputFileName,
		});
		if (result.changed) await this.emitList(params.sessionId, attached);
		const mutatedError = params.mutatedOutputFileName
			? result.errorsByFile.get(params.mutatedOutputFileName)
			: undefined;
		return { errors: [...new Set(result.errorsByFile.values())], mutatedError };
	}

	async reconcile(sessionId: string): Promise<void> {
		const bound = this.bound.get(sessionId);
		const attached = this.attached.get(sessionId);
		if (!bound || !attached) return;
		const result = await this.copyOutputDir({
			sessionId,
			writerId: 'parent',
			runId: bound.runId,
			identity: attached,
			filesystem: attached.filesystem,
			workspaceRoot: attached.workspaceRoot,
			deleteMissing: true,
		});
		if (result.changed) await this.emitList(sessionId, attached);
	}

	private async emitList(sessionId: string, identity: AgentSessionOutputIdentity): Promise<void> {
		const emit = this.bound.get(sessionId)?.emit;
		if (!emit || !identity.agentId) return;
		const files = mergeSessionFiles(
			await this.attachments.listSessionFiles(sessionId, {
				projectId: identity.projectId,
				agentId: identity.agentId,
			}),
			await this.listSessionFiles(sessionId, {
				projectId: identity.projectId,
				agentId: identity.agentId,
			}),
		);
		emit(files);
	}

	private async copyOutputDir(params: {
		sessionId: string;
		writerId: string;
		runId: string;
		identity: AgentSessionOutputIdentity;
		filesystem: WorkspaceFilesystem;
		workspaceRoot: string;
		deleteMissing: boolean;
		forceFileName?: string;
	}): Promise<{ changed: boolean; errorsByFile: Map<string, string> }> {
		const outputAbs = absoluteSessionOutputDir(params.workspaceRoot, params.sessionId);
		const errorsByFile = new Map<string, string>();
		let changed = false;

		try {
			await params.filesystem.mkdir(outputAbs, { recursive: true });
		} catch {
			return { changed, errorsByFile };
		}

		let entries: Awaited<ReturnType<WorkspaceFilesystem['readdir']>>;
		try {
			entries = await params.filesystem.readdir(outputAbs, { recursive: true });
		} catch {
			return { changed, errorsByFile };
		}

		const onDisk = new Set<string>();
		for (const entry of entries) {
			if (entry.type !== 'file') continue;
			const fileName = entry.name.replaceAll('\\', '/');
			onDisk.add(fileName);
			const copy = await this.copyOneFile({
				...params,
				outputAbs,
				fileName,
				force: params.forceFileName === fileName,
			});
			if (copy.error) errorsByFile.set(fileName, copy.error);
			if (copy.copied) changed = true;
		}

		if (params.deleteMissing) {
			const durable = await this.repository.findByThread(params.sessionId, {
				projectId: params.identity.projectId,
			});
			const stale = durable.filter((row) => !onDisk.has(row.fileName));
			if (stale.length > 0) {
				await this.repository.delete(stale.map((row) => row.id));
				await this.deleteStoredData(
					stale.map((row) => row.binaryDataId),
					{ threadId: params.sessionId },
				);
				changed = true;
			}
		}

		return { changed, errorsByFile };
	}

	private async copyOneFile(params: {
		sessionId: string;
		writerId: string;
		runId: string;
		identity: AgentSessionOutputIdentity;
		filesystem: WorkspaceFilesystem;
		outputAbs: string;
		fileName: string;
		force?: boolean;
	}): Promise<{ error?: string; copied: boolean }> {
		if (params.fileName.length > 255 || params.fileName.length === 0) {
			return { error: CAP_NAME, copied: false };
		}

		const persistName = await this.resolvePersistName(
			params.sessionId,
			params.fileName,
			params.writerId,
		);
		const existing = await this.repository.findByThreadAndFileName(params.sessionId, persistName);

		let size: number;
		try {
			const stat = await params.filesystem.stat(`${params.outputAbs}/${params.fileName}`);
			size = stat.size;
		} catch {
			return { copied: false };
		}
		if (size > MAX_SESSION_OUTPUT_FILE_BYTES) return { error: CAP_FILE, copied: false };

		const scope = { projectId: params.identity.projectId };
		if (!existing) {
			const count = await this.repository.countByThread(params.sessionId, scope);
			if (count >= MAX_SESSION_OUTPUT_FILE_COUNT) return { error: CAP_COUNT, copied: false };
		}

		const total = await this.repository.sumFileSizeBytesByThread(params.sessionId, scope);
		const nextTotal = total - (existing?.fileSizeBytes ?? 0) + size;
		if (nextTotal > MAX_SESSION_OUTPUT_PERSIST_BYTES) return { error: CAP_TOTAL, copied: false };

		if (
			!params.force &&
			existing &&
			existing.fileSizeBytes === size &&
			existing.writerId === params.writerId
		) {
			return { copied: false };
		}

		let content: string | Buffer;
		try {
			content = await params.filesystem.readFile(`${params.outputAbs}/${params.fileName}`);
		} catch {
			return { copied: false };
		}
		const data = toBuffer(content);
		const mimeType = mimeTypeForOutputFileName(persistName);
		const fileId = existing?.id ?? generateNanoId();
		const binaryData: IBinaryData = { data: '', mimeType, fileName: persistName };
		const stored = await this.binaryDataService.store(
			buildOutputFileLocation(params.identity.agentId, fileId),
			data,
			binaryData,
		);
		if (!stored.id) {
			throw new OperationalError(
				'Agent session output files require a persisted binary data storage mode',
			);
		}

		const previousBinaryId = existing?.binaryDataId;
		try {
			if (existing) {
				existing.runId = params.runId;
				existing.writerId = params.writerId;
				existing.mimeType = mimeType;
				existing.fileSizeBytes = data.byteLength;
				existing.binaryDataId = stored.id;
				await this.repository.save(existing);
			} else {
				await this.repository.save(
					this.repository.create({
						id: fileId,
						agentId: params.identity.agentId,
						projectId: params.identity.projectId,
						threadId: params.sessionId,
						runId: params.runId,
						writerId: params.writerId,
						fileName: persistName,
						mimeType,
						fileSizeBytes: data.byteLength,
						binaryDataId: stored.id,
					}),
				);
			}
		} catch (error) {
			await this.deleteStoredData([stored.id], { binaryDataId: stored.id });
			throw error;
		}

		if (previousBinaryId && previousBinaryId !== stored.id) {
			await this.deleteStoredData([previousBinaryId], { binaryDataId: previousBinaryId });
		}
		return { copied: true };
	}

	private async resolvePersistName(
		threadId: string,
		fileName: string,
		writerId: string,
	): Promise<string> {
		const existing = await this.repository.findByThreadAndFileName(threadId, fileName);
		if (!existing || existing.writerId === writerId) return fileName;
		return collisionFileName(writerId, fileName);
	}
}
