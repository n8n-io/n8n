import type { AgentFileDto, KnowledgeCollectionFileDto } from '@n8n/api-types';
import { getPromptWorkspaceRoot, type SandboxProvider } from '@n8n/agents/sandbox';
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
		throw new Error(`Invalid ${label} for agent knowledge storage`);
	}
}

/** A mirror path has at most a collection directory and a file name. */
const MAX_MIRROR_PATH_SEGMENTS = 2;

/**
 * A mirror path is the name of a file of the agent, or `<dir>/<name>` for a
 * file of a collection. Each segment is checked on its own.
 */
export function assertKnowledgeMirrorPath(mirrorPath: string, label: string): void {
	const segments = mirrorPath.split('/');
	if (segments.length > MAX_MIRROR_PATH_SEGMENTS) {
		throw new Error(`Invalid ${label} for agent knowledge storage`);
	}
	for (const segment of segments) {
		assertKnowledgePathSegment(segment, label);
	}
}

/** The directory of a mirror path, or undefined for a file at the root of the mirror. */
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
 * The content file name of a stored name, or undefined when the stored name
 * cannot be one. Every upload runs `toKnowledgeContentFileName` before the
 * row is written, so only a row changed by hand gets here with such a name.
 * The read paths skip that row, so that it cannot stop the retrieval of the
 * other knowledge of the agent.
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
