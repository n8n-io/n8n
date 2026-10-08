import {
	selectWorkingSet,
	type SessionFileDto,
	type SessionFilesListResponse,
	type SessionUploadsManifest,
	type WorkingSetCandidate,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { WorkspaceFilesystem } from '@n8n/agents';
import { BinaryDataService } from 'n8n-core';
import { dirname as posixDirname, join as posixJoin } from 'node:path/posix';

import { InstanceAiChatAttachmentService } from './instance-ai-chat-attachment.service';
import type { InstanceAiChatAttachment } from './entities/instance-ai-chat-attachment.entity';
import {
	absoluteSessionUploadDir,
	parentDirOf,
	sessionUploadsManifestRel,
} from './session-output-directory';

interface AttachedWorkspace {
	filesystem: WorkspaceFilesystem;
	workspaceRoot: string;
}

interface MaterializeState {
	signature: string;
	manifest: SessionUploadsManifest;
}

@Service()
export class InstanceAiSessionUploadFilesService {
	private readonly attached = new Map<string, AttachedWorkspace>();
	private readonly last = new Map<string, MaterializeState>();
	private readonly inFlight = new Map<string, Promise<{ changed: boolean }>>();

	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly binaryDataService: BinaryDataService,
		private readonly attachments: InstanceAiChatAttachmentService,
	) {}

	registerWorkspace(sessionId: string, workspace: AttachedWorkspace): void {
		this.attached.set(sessionId, workspace);
	}

	decorateList(sessionId: string, files: SessionFileDto[]): SessionFilesListResponse {
		const manifest = this.last.get(sessionId)?.manifest;
		const onDiskIds = new Set(manifest?.onDisk.map((entry) => entry.id) ?? []);
		const decorated = files.map((file) => ({
			...file,
			onDisk: file.kind === 'attachment' && onDiskIds.has(file.id),
		}));
		return {
			files: decorated,
			...(manifest?.skipped.length ? { workingSetSkipped: manifest.skipped } : {}),
		};
	}

	async materialize(params: {
		sessionId: string;
		filesystem: WorkspaceFilesystem;
		workspaceRoot: string;
	}): Promise<{ changed: boolean }> {
		if (!this.globalConfig.instanceAi.sessionFilesEnabled) return { changed: false };
		const attached = this.attached.get(params.sessionId);
		if (!attached) return { changed: false };

		const pending = this.inFlight.get(params.sessionId);
		if (pending) return await pending;

		const run = this.materializeNow({
			sessionId: params.sessionId,
			filesystem: params.filesystem,
			workspaceRoot: params.workspaceRoot,
		});
		this.inFlight.set(params.sessionId, run);
		try {
			return await run;
		} finally {
			this.inFlight.delete(params.sessionId);
		}
	}

	private async materializeNow(params: {
		sessionId: string;
		filesystem: WorkspaceFilesystem;
		workspaceRoot: string;
	}): Promise<{ changed: boolean }> {
		const rows = await this.attachments.listForWorkingSet(params.sessionId);
		const signature = workingSetSignature(rows);
		if (this.last.get(params.sessionId)?.signature === signature) {
			return { changed: false };
		}

		const candidates: WorkingSetCandidate[] = rows.map((row) => ({
			id: row.id,
			messageId: row.messageId,
			fileName: row.fileName,
			sizeBytes: row.fileSizeBytes,
			createdAt: row.createdAt,
		}));
		const selected = selectWorkingSet(candidates, params.sessionId);
		const onDisk: SessionUploadsManifest['onDisk'] = [];
		const skipped = [...selected.skipped];

		for (const entry of selected.onDisk) {
			const row = rows.find((item) => item.id === entry.id);
			if (!row) {
				skipped.push({
					id: entry.id,
					messageId: entry.messageId,
					fileName: entry.fileName,
					sizeBytes: entry.sizeBytes,
					reason: 'unavailable',
				});
				continue;
			}
			try {
				const bytes = await this.binaryDataService.getAsBuffer({
					id: row.binaryDataId,
					data: '',
					mimeType: row.mimeType,
				});
				const abs = posixJoin(params.workspaceRoot, entry.path);
				await params.filesystem.mkdir(parentDirOf(abs), { recursive: true });
				await params.filesystem.writeFile(abs, bytes, { overwrite: true });
				onDisk.push(entry);
			} catch (error) {
				this.logger.warn('Failed to materialize session upload', {
					sessionId: params.sessionId,
					attachmentId: entry.id,
					error,
				});
				skipped.push({
					id: entry.id,
					messageId: entry.messageId,
					fileName: entry.fileName,
					sizeBytes: entry.sizeBytes,
					reason: 'unavailable',
				});
			}
		}

		const manifest: SessionUploadsManifest = { onDisk, skipped };
		const uploadAbs = absoluteSessionUploadDir(params.workspaceRoot, params.sessionId);
		await params.filesystem.mkdir(uploadAbs, { recursive: true });
		await params.filesystem.writeFile(
			posixJoin(params.workspaceRoot, sessionUploadsManifestRel(params.sessionId)),
			`${JSON.stringify(manifest, null, 2)}\n`,
			{ overwrite: true },
		);
		await evictStaleUploads(params.filesystem, uploadAbs, params.sessionId, manifest);

		this.last.set(params.sessionId, { signature, manifest });
		return { changed: true };
	}
}

function workingSetSignature(rows: InstanceAiChatAttachment[]): string {
	return rows.map((row) => `${row.id}:${row.fileSizeBytes}`).join('|');
}

async function evictStaleUploads(
	filesystem: WorkspaceFilesystem,
	uploadAbs: string,
	sessionId: string,
	manifest: SessionUploadsManifest,
): Promise<void> {
	const prefix = `uploads/${sessionId}/`;
	const keep = new Set<string>([
		'manifest.json',
		...manifest.onDisk.map((entry) =>
			entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : entry.path,
		),
	]);

	let entries: Awaited<ReturnType<WorkspaceFilesystem['readdir']>>;
	try {
		entries = await filesystem.readdir(uploadAbs, { recursive: true });
	} catch {
		return;
	}

	const staleDirs = new Set<string>();
	for (const entry of entries) {
		if (entry.type !== 'file') continue;
		const relative = entry.name.replaceAll('\\', '/');
		if (keep.has(relative)) continue;
		const abs = posixJoin(uploadAbs, relative);
		await filesystem.deleteFile(abs).catch(() => undefined);
		staleDirs.add(posixDirname(abs));
	}

	for (const dir of staleDirs) {
		if (dir === uploadAbs) continue;
		await filesystem.rmdir(dir).catch(() => undefined);
	}
}
