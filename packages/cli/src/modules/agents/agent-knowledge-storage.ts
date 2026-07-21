import type { AgentFileDto } from '@n8n/api-types';
import type { SourceType } from '@n8n/db';
import { FileLocation } from 'n8n-core';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { AgentFile } from './entities/agent-file.entity';

// Local sandbox disk mirroring the DB-backed knowledge files, so repeated
// reads/searches avoid re-fetching from BinaryDataService each time.
export const KNOWLEDGE_MIRROR_DIR = '/home/daytona/knowledge-mirror';
export const KNOWLEDGE_MIRROR_FILES_DIR = `${KNOWLEDGE_MIRROR_DIR}/files`;
export const KNOWLEDGE_MIRROR_MANIFEST = `${KNOWLEDGE_MIRROR_DIR}/manifest`;

// Typed against `SourceType` so a drift from the `binary_data` schema enum
// (see `packages/@n8n/db/src/entities/binary-data-file.ts`) is a compile error.
const AGENT_FILE_SOURCE_TYPE: SourceType = 'agent_file';

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

/** One directory per file, so deleting a single file never touches others. */
export function buildKnowledgeFileLocation(agentId: string, fileId: string) {
	return FileLocation.ofCustom({
		pathSegments: ['agents', agentId, 'knowledge-files', fileId],
		sourceType: AGENT_FILE_SOURCE_TYPE,
		sourceId: fileId,
	});
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
