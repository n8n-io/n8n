import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const SNAPSHOT_CONTEXT_PREFIX = 'n8n-snapshot-context-';

export interface SnapshotImageContext {
	stagingDir: string;
}

/**
 * Dedupe staging by key: the destructive `rm`+`mkdir`+`writeFile` runs once per
 * key, and concurrent callers await it and reuse the directory read-only. Same key
 * ⇒ same content, so reuse both avoids re-writing and prevents rm/write races.
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
 * With a `cacheKey`, stages into `os.tmpdir()/n8n-snapshot-context-<cacheKey>` once per key
 * (see `stagingByCacheKey`) so repeated and concurrent builds share one directory.
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
		// Evict a rejected staging so the next caller retries.
		stagingByCacheKey.delete(cacheKey);
		throw error;
	});

	stagingByCacheKey.set(cacheKey, staging);
	return await staging;
}

export async function disposeSnapshotImageContext(stagingDir: string): Promise<void> {
	await rm(stagingDir, { recursive: true, force: true });
}
