import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const IMAGE_CONTEXT_PREFIX = 'n8n-knowledge-runner-context-';

export interface KnowledgeRunnerImageContext {
	stagingDir: string;
}

/**
 * Writes files to a host directory for Daytona `addLocalDir` / COPY during image build.
 */
export async function stageFilesForKnowledgeRunnerImage(
	files: Map<string, string>,
	cacheKey?: string,
): Promise<KnowledgeRunnerImageContext> {
	let stagingDir: string;

	if (cacheKey) {
		stagingDir = join(tmpdir(), `${IMAGE_CONTEXT_PREFIX}${cacheKey}`);
		await mkdir(stagingDir, { recursive: true });
	} else {
		stagingDir = await mkdtemp(join(tmpdir(), `${IMAGE_CONTEXT_PREFIX}temp-`));
	}

	for (const [relativePath, content] of files) {
		const targetPath = join(stagingDir, relativePath);
		await mkdir(dirname(targetPath), { recursive: true });
		await writeFile(targetPath, content, 'utf8');
	}

	return { stagingDir };
}

export async function disposeKnowledgeRunnerImageContext(stagingDir: string): Promise<void> {
	await rm(stagingDir, { recursive: true, force: true });
}
