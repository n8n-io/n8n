import type { AgentFileDto } from '@n8n/api-types';
import path from 'node:path';
import { OperationalError } from 'n8n-workflow';

import type { AgentFile } from './entities/agent-file.entity';

export const KNOWLEDGE_MOUNT_PATH = '/home/daytona/workspace/agent-knowledge';
export const KNOWLEDGE_FILES_DIR = `${KNOWLEDGE_MOUNT_PATH}/files`;

export const AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH = KNOWLEDGE_MOUNT_PATH;
export const AGENT_KNOWLEDGE_VOLUME_SUBPATH_PREFIX = 'agent-knowledge';

const DAYTONA_VOLUME_STORAGE_PREFIX = 'daytona-volume:';

export interface AgentKnowledgeFilesystem {
	readFile(filePath: string): Promise<Buffer>;
	writeFile(filePath: string, content: Buffer | string): Promise<void>;
	deleteFile(filePath: string, recursive?: boolean): Promise<void>;
	ensureDir(dirPath: string): Promise<void>;
}

export function buildKnowledgeVolumeSubpath(projectId: string, agentId: string): string {
	return `${AGENT_KNOWLEDGE_VOLUME_SUBPATH_PREFIX}/projects/${projectId}/agents/${agentId}/knowledge`;
}

export function assertKnowledgePathSegment(segment: string, label: string): void {
	if (
		!segment ||
		segment === '.' ||
		segment === '..' ||
		/[\\/]/.test(segment) ||
		/[\u0000-\u001f]/.test(segment)
	) {
		throw new Error(`Invalid ${label} for agent knowledge storage`);
	}
}

export function sanitizeStorageFileName(originalName: string): string {
	const basename = path.basename(originalName);
	return basename.replace(/[\u0000-\u001f\\/]/g, '_');
}

export function toVolumeStorageReference(storageFileName: string): string {
	return `${DAYTONA_VOLUME_STORAGE_PREFIX}${storageFileName}`;
}

export function fromVolumeStorageReference(binaryDataId: string): string {
	if (!binaryDataId.startsWith(DAYTONA_VOLUME_STORAGE_PREFIX)) {
		throw new OperationalError('Unknown agent file storage reference');
	}
	return binaryDataId.slice(DAYTONA_VOLUME_STORAGE_PREFIX.length);
}

export function storageFileNameForOriginalFileName(originalFileName: string): string {
	const sanitizedName = sanitizeStorageFileName(originalFileName);
	const extension = path.extname(sanitizedName).toLowerCase();
	if (extension === '.pdf') {
		const baseName = path.basename(sanitizedName, path.extname(sanitizedName));
		return `${baseName}.txt`;
	}
	return sanitizedName;
}

export function toAgentFileDto(file: AgentFile): AgentFileDto {
	return {
		id: file.id,
		agentId: file.agentId,
		fileName: file.fileName,
		mimeType: file.mimeType,
		fileSizeBytes: file.fileSizeBytes,
		createdAt: file.createdAt.toISOString(),
	};
}

export function isFilesystemNotFoundError(error: unknown): boolean {
	return (
		error instanceof Error &&
		'statusCode' in error &&
		(error as { statusCode: unknown }).statusCode === 404
	);
}
