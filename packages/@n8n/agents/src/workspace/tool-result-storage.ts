import { createHash } from 'node:crypto';

import type { WorkspaceFilesystem } from './types';

export type ToolResultKind = 'result' | 'error' | 'message';

export interface ToolResultStorageScope {
	threadId?: string;
	runId: string;
	toolCallId: string;
	abortSignal?: AbortSignal;
}

const TOOL_RESULTS_DIRECTORY = 'tool-results';
const HASHED_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TOOL_RESULT_FILE_PATTERN = /^([A-Za-z0-9_-]{43})\.(result|error|message)\.json$/;

function hashPathSegment(value: string): string {
	return createHash('sha256').update(value).digest('base64url');
}

export function getToolResultThreadDirectory(threadId: string): string {
	return `${TOOL_RESULTS_DIRECTORY}/threads/${hashPathSegment(threadId)}`;
}

export function isToolResultPath(path: string): boolean {
	const segments = path.split('/');
	if (segments[0] !== TOOL_RESULTS_DIRECTORY) return false;

	if (segments[1] === 'threads' && segments.length === 5) {
		return (
			HASHED_PATH_SEGMENT_PATTERN.test(segments[2]) &&
			HASHED_PATH_SEGMENT_PATTERN.test(segments[3]) &&
			TOOL_RESULT_FILE_PATTERN.test(segments[4])
		);
	}

	if (segments[1] === 'runs' && segments.length === 4) {
		return (
			HASHED_PATH_SEGMENT_PATTERN.test(segments[2]) && TOOL_RESULT_FILE_PATTERN.test(segments[3])
		);
	}

	return false;
}

function getToolResultPath(scope: ToolResultStorageScope, kind: ToolResultKind): string {
	const runDirectory = scope.threadId
		? `${getToolResultThreadDirectory(scope.threadId)}/${hashPathSegment(scope.runId)}`
		: `${TOOL_RESULTS_DIRECTORY}/runs/${hashPathSegment(scope.runId)}`;

	return `${runDirectory}/${hashPathSegment(scope.toolCallId)}.${kind}.json`;
}

export async function storeToolResult(
	filesystem: WorkspaceFilesystem,
	scope: ToolResultStorageScope,
	kind: ToolResultKind,
	serialized: string,
): Promise<string> {
	const path = getToolResultPath(scope, kind);
	await filesystem.writeFile(path, serialized, {
		recursive: true,
		overwrite: true,
		abortSignal: scope.abortSignal,
	});
	return path;
}
