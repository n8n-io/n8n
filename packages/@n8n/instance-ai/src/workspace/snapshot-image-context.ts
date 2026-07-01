import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const SNAPSHOT_CONTEXT_PREFIX = 'n8n-snapshot-context-';

export interface SnapshotImageContext {
	stagingDir: string;
}

/**
 * Concurrent sandbox creations for the same n8n version stage identical files
 * (`cacheKey` is the n8n version or a content hash, so same key ⇒ same content).
 * Dedupe by key so the destructive `rm`+`mkdir`+`writeFile` runs exactly once per
 * key per process; concurrent and subsequent callers await it and reuse the same
 * directory read-only. Without this, overlapping stagings raced on the shared path
 * — one caller's recursive `rm` deleting files another was writing (ENOTEMPTY) or
 * that Daytona was still reading for `addLocalDir` (ENOENT).
 */
const stagingByCacheKey = new Map<string, Promise<SnapshotImageContext>>();

function workspaceRelativePath(filePath: string, workspaceRoot: string): string {
	const root = workspaceRoot.endsWith('/') ? workspaceRoot : `${workspaceRoot}/`;

	if (!filePath.startsWith(root)) {
		throw new Error(
			`snapshot-image-context: path ${filePath} is not under workspace root ${workspaceRoot}`,
		);
	}

	return filePath.slice(root.length);
}

async function writeStagedFiles(
	stagingDir: string,
	files: Map<string, string>,
	workspaceRoot: string,
): Promise<void> {
	for (const [filePath, content] of files) {
		const targetPath = join(stagingDir, workspaceRelativePath(filePath, workspaceRoot));

		await mkdir(dirname(targetPath), { recursive: true });
		await writeFile(targetPath, content, 'utf-8');
	}
}

/**
 * Writes sandbox workspace files to a host directory for Daytona `addLocalDir` / COPY.
 * When `cacheKey` is set, reuses `os.tmpdir()/n8n-snapshot-context-<cacheKey>` and stages
 * the files exactly once per key per process (see `stagingByCacheKey`), so repeated and
 * concurrent image builds share one read-only directory instead of racing rm/write on it.
 */
export async function stageWorkspaceFilesForImage(
	files: Map<string, string>,
	workspaceRoot: string,
	cacheKey?: string,
): Promise<SnapshotImageContext> {
	if (!cacheKey) {
		const stagingDir = await mkdtemp(join(tmpdir(), `${SNAPSHOT_CONTEXT_PREFIX}temp-`));
		await writeStagedFiles(stagingDir, files, workspaceRoot);
		return { stagingDir };
	}

	const inFlightOrDone = stagingByCacheKey.get(cacheKey);
	if (inFlightOrDone) return await inFlightOrDone;

	const staging = (async () => {
		const stagingDir = join(tmpdir(), `${SNAPSHOT_CONTEXT_PREFIX}${cacheKey}`);
		await rm(stagingDir, { recursive: true, force: true });
		await mkdir(stagingDir, { recursive: true });
		await writeStagedFiles(stagingDir, files, workspaceRoot);
		return { stagingDir };
	})().catch((error) => {
		// Don't leave a rejected promise cached — let the next caller retry from scratch.
		stagingByCacheKey.delete(cacheKey);
		throw error;
	});

	stagingByCacheKey.set(cacheKey, staging);
	return await staging;
}

export async function disposeSnapshotImageContext(stagingDir: string): Promise<void> {
	await rm(stagingDir, { recursive: true, force: true });
}
