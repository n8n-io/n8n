import type { AgentFileDto } from '@n8n/api-types';
import path from 'node:path';
import { OperationalError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { AgentFile } from './entities/agent-file.entity';

export const AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH = '/home/daytona/workspace/agent-knowledge';
export const KNOWLEDGE_FILES_DIR = `${AGENT_KNOWLEDGE_VOLUME_MOUNT_PATH}/files`;

const AGENT_KNOWLEDGE_VOLUME_SUBPATH_PREFIX = 'agent-knowledge';

const DAYTONA_VOLUME_STORAGE_PREFIX = 'daytona-volume:';

export interface AgentKnowledgeFileUpload {
	/** Local temp file path when `string`; in-memory content when `Buffer`. */
	source: Buffer | string;
	destination: string;
}

export interface AgentKnowledgeFilesystem {
	uploadFiles(files: AgentKnowledgeFileUpload[]): Promise<void>;
	deleteFile(filePath: string, recursive?: boolean): Promise<void>;
	ensureDir(dirPath: string): Promise<void>;
}

export function hasControlCharacter(value: string): boolean {
	for (const character of value) {
		if (character.charCodeAt(0) < 32) {
			return true;
		}
	}
	return false;
}

function sanitizePathCharacter(character: string): string {
	if (character === '/' || character === '\\' || character.charCodeAt(0) < 32) {
		return '_';
	}
	return character;
}

export function buildKnowledgeVolumeSubpath(
	instanceId: string,
	projectId: string,
	agentId: string,
): string {
	return `${instanceId}/${AGENT_KNOWLEDGE_VOLUME_SUBPATH_PREFIX}/projects/${projectId}/agents/${agentId}/knowledge`;
}

export function assertKnowledgePathSegment(segment: string, label: string): void {
	if (
		!segment ||
		segment === '.' ||
		segment === '..' ||
		/[\\/]/.test(segment) ||
		hasControlCharacter(segment)
	) {
		throw new Error(`Invalid ${label} for agent knowledge storage`);
	}
}

function sanitizeStorageFileName(originalName: string): string {
	const basename = path.basename(originalName);
	const sanitized = Array.from(basename, sanitizePathCharacter).join('');
	// `path.basename` passes through `.`, `..`, and empty names, which would
	// resolve outside the scoped knowledge files directory when joined.
	if (!sanitized || sanitized === '.' || sanitized === '..') {
		throw new BadRequestError(`Invalid knowledge file name "${originalName}"`);
	}
	return sanitized;
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
