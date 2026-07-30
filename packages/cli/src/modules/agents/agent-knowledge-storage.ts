import type { AgentFileDto } from '@n8n/api-types';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { AgentFile } from './entities/agent-file.entity';

// Local sandbox disk mirroring the persisted knowledge files, so repeated
// reads/searches avoid re-fetching from the knowledge file store each time.
export const KNOWLEDGE_MIRROR_DIR = '/home/daytona/knowledge-mirror';
export const KNOWLEDGE_MIRROR_FILES_DIR = `${KNOWLEDGE_MIRROR_DIR}/files`;
export const KNOWLEDGE_MIRROR_MANIFEST = `${KNOWLEDGE_MIRROR_DIR}/manifest`;

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
