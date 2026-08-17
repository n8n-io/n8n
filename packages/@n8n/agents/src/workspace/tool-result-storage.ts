import { createHash } from 'node:crypto';

import type { FileEntry, WorkspaceFilesystem } from './types';
import { raceWithAbort } from '../sdk/abort';

export type ToolResultKind = 'result' | 'error' | 'message';

export interface ToolResultStorageScope {
	runId: string;
	toolCallId: string;
	abortSignal?: AbortSignal;
}

const TOOL_RESULTS_DIRECTORY = 'tool-results';
const TOOL_RESULT_RUNS_DIRECTORY = `${TOOL_RESULTS_DIRECTORY}/runs`;
const HASHED_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const TOOL_RESULT_FILE_PATTERN = /^([A-Za-z0-9_-]{43})\.(result|error|message)\.json$/;
const MAX_RECONCILIATION_CANDIDATES = 100;
const TOOL_RESULT_CLEANUP_TIMEOUT_MS = 1_000;
const TOOL_RESULT_RECONCILIATION_TIMEOUT_MS = 5_000;

function hashPathSegment(value: string): string {
	return createHash('sha256').update(value).digest('base64url');
}

export function getToolResultRunDirectory(runId: string): string {
	return `${TOOL_RESULT_RUNS_DIRECTORY}/${hashPathSegment(runId)}`;
}

export function isToolResultPath(path: string): boolean {
	const segments = path.split('/');
	return (
		segments.length === 4 &&
		segments[0] === TOOL_RESULTS_DIRECTORY &&
		segments[1] === 'runs' &&
		HASHED_PATH_SEGMENT_PATTERN.test(segments[2]) &&
		TOOL_RESULT_FILE_PATTERN.test(segments[3])
	);
}

function getToolResultPath(scope: ToolResultStorageScope, kind: ToolResultKind): string {
	return `${getToolResultRunDirectory(scope.runId)}/${hashPathSegment(scope.toolCallId)}.${kind}.json`;
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

export async function removeToolResultRun(
	filesystem: WorkspaceFilesystem,
	runId: string,
): Promise<void> {
	const abortSignal = AbortSignal.timeout(TOOL_RESULT_CLEANUP_TIMEOUT_MS);
	await raceWithAbort(async () => {
		const runDirectory = getToolResultRunDirectory(runId);
		if (!(await filesystem.exists(runDirectory, { abortSignal }))) return;
		await filesystem.rmdir(runDirectory, { recursive: true, force: true, abortSignal });
	}, abortSignal);
}

export async function reconcileToolResultRuns(
	filesystem: WorkspaceFilesystem,
	protectedRunIds: Iterable<string>,
	ttlMs: number,
): Promise<void> {
	const abortSignal = AbortSignal.timeout(TOOL_RESULT_RECONCILIATION_TIMEOUT_MS);
	await raceWithAbort(async () => {
		let entries: FileEntry[];
		try {
			entries = await filesystem.readdir(TOOL_RESULT_RUNS_DIRECTORY, { abortSignal });
		} catch {
			return;
		}

		const protectedDirectories = new Set(
			Array.from(protectedRunIds, (runId) => hashPathSegment(runId)),
		);
		const cutoff = Date.now() - ttlMs;
		let examined = 0;

		for (const entry of entries) {
			if (examined >= MAX_RECONCILIATION_CANDIDATES) break;
			if (entry.type !== 'directory' || !HASHED_PATH_SEGMENT_PATTERN.test(entry.name)) {
				continue;
			}
			if (protectedDirectories.has(entry.name)) continue;
			examined++;

			const path = `${TOOL_RESULT_RUNS_DIRECTORY}/${entry.name}`;
			try {
				const { modifiedAt } = await filesystem.stat(path, { abortSignal });
				const modifiedAtMs = modifiedAt.getTime();
				if (!Number.isFinite(modifiedAtMs) || modifiedAtMs >= cutoff) continue;
				await filesystem.rmdir(path, { recursive: true, force: true, abortSignal });
			} catch {
				if (abortSignal.aborted) return;
			}
		}
	}, abortSignal);
}
