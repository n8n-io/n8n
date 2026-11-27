import type { AgentFileDto, KnowledgeCollectionFileDto } from '@n8n/api-types';
import { getPromptWorkspaceRoot, type SandboxProvider } from '@n8n/agents/sandbox';
import { UnexpectedError } from '@n8n/errors';
import path from 'node:path';

import type { AgentFile, KnowledgeFile } from '../entities';
import { KnowledgeUploadError } from './knowledge-upload.error';

export interface KnowledgeMirrorPaths {
	filesDir: string;
	manifestPath: string;
	stagingDir: string;
}

export function getKnowledgeMirrorPaths(provider: SandboxProvider): KnowledgeMirrorPaths {
	const home = path.dirname(getPromptWorkspaceRoot(provider));
	const mirrorDir = `${home}/knowledge-mirror`;
	return {
		filesDir: `${mirrorDir}/files`,
		manifestPath: `${mirrorDir}/manifest`,
		stagingDir: `${mirrorDir}/.staging`,
	};
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

export function assertKnowledgePathSegment(segment: string, label: string): void {
	if (
		!segment ||
		segment === '.' ||
		segment === '..' ||
		/[\\/]/.test(segment) ||
		hasControlCharacter(segment)
	) {
		throw new UnexpectedError(`Invalid ${label} for agent knowledge storage`);
	}
}

export function assertKnowledgeMirrorPath(mirrorPath: string, label: string): void {
	const segments = mirrorPath.split('/');
	// At most a collection directory and a file name.
	if (segments.length > 2) {
		throw new UnexpectedError(`Invalid ${label} for agent knowledge storage`);
	}
	for (const segment of segments) {
		assertKnowledgePathSegment(segment, label);
	}
}

/** Undefined for a file at the root of the mirror. */
export function getKnowledgeMirrorPathDir(mirrorPath: string): string | undefined {
	const separator = mirrorPath.indexOf('/');
	return separator === -1 ? undefined : mirrorPath.slice(0, separator);
}

function sanitizeStorageFileName(originalName: string): string {
	const basename = path.basename(originalName);
	const sanitized = Array.from(basename, sanitizePathCharacter).join('');
	// `path.basename` passes through `.`, `..`, and empty names, which would
	// resolve outside the scoped knowledge files directory when joined.
	if (!sanitized || sanitized === '.' || sanitized === '..') {
		throw new KnowledgeUploadError(
			`Invalid knowledge file name "${originalName}"`,
			'invalid_file_name',
		);
	}
	return sanitized;
}

export function toKnowledgeContentFileName(originalFileName: string): string {
	const sanitizedName = sanitizeStorageFileName(originalFileName);
	const extension = path.extname(sanitizedName).toLowerCase();
	if (extension === '.pdf') {
		const baseName = path.basename(sanitizedName, path.extname(sanitizedName));
		return `${baseName}.txt`;
	}
	return sanitizedName;
}

/**
 * Undefined for a stored name that cannot be a file name. Every upload checks
 * the name before the row is written, so only a row changed by hand fails.
 * The read paths skip it, so that one row cannot stop the retrieval of the rest.
 */
export function tryKnowledgeContentFileName(storedName: string): string | undefined {
	try {
		return toKnowledgeContentFileName(storedName);
	} catch {
		return undefined;
	}
}

export function toKnowledgeCollectionFileDto(file: KnowledgeFile): KnowledgeCollectionFileDto {
	return {
		id: file.id,
		collectionId: file.knowledgeCollectionId,
		fileName: file.name,
		mimeType: file.mimeType,
		fileSizeBytes: file.fileSizeBytes,
		createdAt: file.createdAt.toISOString(),
	};
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
