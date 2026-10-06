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

import { InstanceAiChatAttachmentService } from './instance-ai-chat-attachment.service';
import { InstanceAiSessionOutputFile } from './entities/instance-ai-session-output-file.entity';
import { InstanceAiSessionOutputFileRepository } from './repositories/instance-ai-session-output-file.repository';
import { absoluteSessionOutputDir, mimeTypeForOutputFileName } from './session-output-directory';

const OUTPUT_SOURCE_TYPE: SourceType = 'instance_ai_session_output';

const CAP_FILE = 'Output File exceeds 50 MB';
const CAP_COUNT = 'Session Output Files exceed 100 files';
const CAP_TOTAL = 'Session Output Files exceed 500 MB';
const CAP_NAME = 'Output File name exceeds 255 characters';

interface BoundRun {
	runId: string;
	emit?: (files: SessionFileDto[]) => void;
}

interface AttachedWorkspace {
	filesystem: WorkspaceFilesystem;
	workspaceRoot: string;
}

function buildOutputFileLocation(threadId: string, fileId: string) {
	return FileLocation.ofCustom({
		pathSegments: ['instance-ai', threadId, 'outputs', fileId],
		sourceType: OUTPUT_SOURCE_TYPE,
		sourceId: fileId,
	});
}

function toBuffer(content: string | Buffer): Buffer {
	return typeof content === 'string' ? Buffer.from(content) : content;
}

@Service()
export class InstanceAiSessionOutputFilesService {
	private readonly bound = new Map<string, BoundRun>();
	private readonly attached = new Map<string, AttachedWorkspace>();

	constructor(
		private readonly logger: Logger,
		private readonly binaryDataService: BinaryDataService,
		private readonly repository: InstanceAiSessionOutputFileRepository,
		private readonly attachments: InstanceAiChatAttachmentService,
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

	async listSessionFiles(threadId: string): Promise<SessionFileDto[]> {
		const rows = await this.repository.findByThread(threadId);
		return rows.map((row) => toSessionFileDto(row, 'output'));
	}

	async findByIdInThread(
		fileId: string,
		threadId: string,
	): Promise<InstanceAiSessionOutputFile | null> {
		return await this.repository.findByIdInThread(fileId, threadId);
	}

	async getStream(file: InstanceAiSessionOutputFile): Promise<Readable> {
		return await this.binaryDataService.getAsStream(file.binaryDataId);
	}

	async deleteByThread(threadId: string): Promise<void> {
		await this.deleteOutputs(await this.repository.findByThread(threadId), { threadId });
	}

	async deleteByThreadIds(threadIds: string[]): Promise<void> {
		if (threadIds.length === 0) return;
		await this.deleteOutputs(await this.repository.findByThreadIds(threadIds), {
			threadIds: threadIds.join(','),
		});
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
		this.registerWorkspace(params.sessionId, {
			filesystem: params.filesystem,
			workspaceRoot: params.workspaceRoot,
		});

		const result = await this.copyOutputDir({
			sessionId: params.sessionId,
			writerId: params.writerId,
			runId: bound.runId,
			filesystem: params.filesystem,
			workspaceRoot: params.workspaceRoot,
			deleteMissing: false,
			forceFileName: params.mutatedOutputFileName,
		});
		if (result.changed) await this.emitList(params.sessionId);
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
			filesystem: attached.filesystem,
			workspaceRoot: attached.workspaceRoot,
			deleteMissing: true,
		});
		if (result.changed) await this.emitList(sessionId);
	}

	private async emitList(sessionId: string): Promise<void> {
		const emit = this.bound.get(sessionId)?.emit;
		if (!emit) return;
		emit(
			mergeSessionFiles(
				await this.attachments.listSessionFiles(sessionId),
				await this.listSessionFiles(sessionId),
			),
		);
	}

	private async deleteOutputs(
		files: InstanceAiSessionOutputFile[],
		logContext: Record<string, string>,
	): Promise<void> {
		if (files.length === 0) return;
		await this.repository.delete(files.map((file) => file.id));
		await this.binaryDataService
			.deleteManyByBinaryDataId(files.map((file) => file.binaryDataId))
			.catch((error: unknown) =>
				this.logger.warn('Failed to delete Instance AI session output bytes', {
					...logContext,
					error,
				}),
			);
	}

	private async copyOutputDir(params: {
		sessionId: string;
		writerId: string;
		runId: string;
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
			const durable = await this.repository.findByThread(params.sessionId);
			const stale = durable.filter((row) => !onDisk.has(row.fileName));
			if (stale.length > 0) {
				await this.deleteOutputs(stale, { threadId: params.sessionId });
				changed = true;
			}
		}

		return { changed, errorsByFile };
	}

	private async copyOneFile(params: {
		sessionId: string;
		writerId: string;
		runId: string;
		filesystem: WorkspaceFilesystem;
		outputAbs: string;
		fileName: string;
		force?: boolean;
	}): Promise<{ error?: string; copied: boolean }> {
		if (params.fileName.length > 255 || params.fileName.length === 0) {
			return { error: CAP_NAME, copied: false };
		}

		const existing = await this.repository.findByThreadAndFileName(
			params.sessionId,
			params.fileName,
		);

		let size: number;
		try {
			const stat = await params.filesystem.stat(`${params.outputAbs}/${params.fileName}`);
			size = stat.size;
		} catch {
			return { copied: false };
		}
		if (size > MAX_SESSION_OUTPUT_FILE_BYTES) return { error: CAP_FILE, copied: false };

		if (!existing) {
			const count = await this.repository.countByThread(params.sessionId);
			if (count >= MAX_SESSION_OUTPUT_FILE_COUNT) return { error: CAP_COUNT, copied: false };
		}

		const total = await this.repository.sumFileSizeBytesByThread(params.sessionId);
		const nextTotal = total - (existing?.fileSizeBytes ?? 0) + size;
		if (nextTotal > MAX_SESSION_OUTPUT_PERSIST_BYTES) return { error: CAP_TOTAL, copied: false };

		if (!params.force && existing && existing.fileSizeBytes === size) {
			return { copied: false };
		}

		let content: string | Buffer;
		try {
			content = await params.filesystem.readFile(`${params.outputAbs}/${params.fileName}`);
		} catch {
			return { copied: false };
		}
		const data = toBuffer(content);
		const mimeType = mimeTypeForOutputFileName(params.fileName);
		const fileId = existing?.id ?? generateNanoId();
		const binaryData: IBinaryData = { data: '', mimeType, fileName: params.fileName };
		const stored = await this.binaryDataService.store(
			buildOutputFileLocation(params.sessionId, fileId),
			data,
			binaryData,
		);
		if (!stored.id) {
			throw new OperationalError(
				'Instance AI session output files require a persisted binary data storage mode',
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
						threadId: params.sessionId,
						runId: params.runId,
						writerId: params.writerId,
						fileName: params.fileName,
						mimeType,
						fileSizeBytes: data.byteLength,
						binaryDataId: stored.id,
					}),
				);
			}
		} catch (error) {
			await this.binaryDataService.deleteManyByBinaryDataId([stored.id]).catch(() => undefined);
			throw error;
		}

		if (previousBinaryId && previousBinaryId !== stored.id) {
			await this.binaryDataService
				.deleteManyByBinaryDataId([previousBinaryId])
				.catch((error: unknown) =>
					this.logger.warn('Failed to delete replaced Instance AI session output bytes', {
						binaryDataId: previousBinaryId,
						error,
					}),
				);
		}
		return { copied: true };
	}
}
