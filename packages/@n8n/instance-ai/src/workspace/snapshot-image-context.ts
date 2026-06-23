import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const SNAPSHOT_CONTEXT_PREFIX = 'n8n-snapshot-context-';

export interface SnapshotImageContext {
	stagingDir: string;
}

function workspaceRelativePath(filePath: string, workspaceRoot: string): string {
	const root = workspaceRoot.endsWith('/') ? workspaceRoot : `${workspaceRoot}/`;

	if (!filePath.startsWith(root)) {
		throw new Error(
			`snapshot-image-context: path ${filePath} is not under workspace root ${workspaceRoot}`,
		);
	}

	return filePath.slice(root.length);
}

/**
 * Writes sandbox workspace files to a host directory for Daytona `addLocalDir` / COPY.
 * When `cacheKey` is set, reuses `os.tmpdir()/n8n-snapshot-context-<cacheKey>` so repeated
 * image builds do not accumulate temp directories.
 */
export async function stageWorkspaceFilesForImage(
	files: Map<string, string>,
	workspaceRoot: string,
	cacheKey?: string,
): Promise<SnapshotImageContext> {
	let stagingDir: string;

	if (cacheKey) {
		stagingDir = join(tmpdir(), `${SNAPSHOT_CONTEXT_PREFIX}${cacheKey}`);

		await rm(stagingDir, { recursive: true, force: true });
		await mkdir(stagingDir, { recursive: true });
	} else {
		stagingDir = await mkdtemp(join(tmpdir(), `${SNAPSHOT_CONTEXT_PREFIX}temp-`));
	}

	for (const [filePath, content] of files) {
		const targetPath = join(stagingDir, workspaceRelativePath(filePath, workspaceRoot));

		await mkdir(dirname(targetPath), { recursive: true });
		await writeFile(targetPath, content, 'utf-8');
	}

	return { stagingDir };
}

export async function disposeSnapshotImageContext(stagingDir: string): Promise<void> {
	await rm(stagingDir, { recursive: true, force: true });
}
