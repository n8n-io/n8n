import type { AgentFileDto } from '@n8n/api-types';
import { getPromptWorkspaceRoot, type SandboxProvider } from '@n8n/agents/sandbox';
import path from 'node:path';

import { BadRequestError } from '@n8n/errors';

import type { AgentFile } from './entities/agent-file.entity';

export interface AgentKnowledgePaths {
	filesDir: string;
	manifest: string;
	stagingDir: string;
}

export interface AgentKnowledgeStagingPaths {
	root: string;
	filesDir: string;
	manifest: string;
	deleteList: string;
}

export function getAgentKnowledgePaths(provider: SandboxProvider): AgentKnowledgePaths {
	const home = path.dirname(getPromptWorkspaceRoot(provider));
	const mirrorDir = `${home}/knowledge-mirror`;
	return {
		filesDir: `${mirrorDir}/files`,
		manifest: `${mirrorDir}/manifest`,
		stagingDir: `${mirrorDir}/.staging`,
	};
}

/**
 * Per-sync staging layout. The knowledge files go in their own `files`
 * subdirectory so the finalize command can move them with one glob without
 * also picking up the sync's own manifest and delete list, and so removing
 * `root` cleans up everything the sync staged.
 */
export function getMirrorStagingPaths(
	paths: AgentKnowledgePaths,
	stagingId: string,
): AgentKnowledgeStagingPaths {
	assertKnowledgePathSegment(stagingId, 'knowledge mirror staging ID');
	const root = `${paths.stagingDir}/${stagingId}`;
	return {
		root,
		filesDir: `${root}/files`,
		manifest: `${root}/manifest`,
		deleteList: `${root}/delete-list`,
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
