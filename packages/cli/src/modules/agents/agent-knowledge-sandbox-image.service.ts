import { loadDaytona } from '@n8n/ai-utilities/sandbox';
import { Service } from '@n8n/di';
import type { CreateSandboxFromImageParams } from '@daytonaio/sdk';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path/posix';

import {
	KNOWLEDGE_CSV_RUNNER_BAKE_ROOT,
	KNOWLEDGE_CSV_RUNNER_PATH,
	getKnowledgeCsvRunnerAssetPath,
	getKnowledgeCsvRunnerContentHash,
} from './agent-knowledge-sandbox-runtime';
import {
	disposeKnowledgeRunnerImageContext,
	stageFilesForKnowledgeRunnerImage,
} from './agent-knowledge-sandbox-image-context';

const DEFAULT_DAYTONA_BASE_IMAGE = 'daytonaio/sandbox:0.5.0';
const KNOWLEDGE_CSV_RUNNER_FILE_NAME = 'knowledge-csv-runner.cjs';

type DaytonaImage = CreateSandboxFromImageParams['image'];

@Service()
export class AgentKnowledgeSandboxImageService {
	private cachedImageByKey = new Map<string, Promise<DaytonaImage>>();
	private stagingDirByKey = new Map<string, string>();

	async prepareDaytonaImage(baseImage?: string): Promise<DaytonaImage> {
		const resolvedBase = baseImage ?? DEFAULT_DAYTONA_BASE_IMAGE;
		const cacheKey = this.buildCacheKey(resolvedBase, getKnowledgeCsvRunnerContentHash());
		const cached = this.cachedImageByKey.get(cacheKey);
		if (cached) return await cached;

		const promise = this.buildDaytonaImage(resolvedBase, cacheKey);
		this.cachedImageByKey.set(cacheKey, promise);
		return await promise;
	}

	private buildCacheKey(baseImage: string, runnerHash: string): string {
		return createHash('sha256').update(`${baseImage}:${runnerHash}`).digest('hex').slice(0, 16);
	}

	private async buildDaytonaImage(baseImage: string, cacheKey: string): Promise<DaytonaImage> {
		const runnerContent = await readFile(getKnowledgeCsvRunnerAssetPath(), 'utf8');
		const runnerDir = dirname(KNOWLEDGE_CSV_RUNNER_PATH);
		const files = new Map<string, string>([[KNOWLEDGE_CSV_RUNNER_FILE_NAME, runnerContent]]);

		const previousStagingDir = this.stagingDirByKey.get(cacheKey);
		if (previousStagingDir) {
			await disposeKnowledgeRunnerImageContext(previousStagingDir).catch(() => {});
		}

		const { stagingDir } = await stageFilesForKnowledgeRunnerImage(files, cacheKey);
		this.stagingDirByKey.set(cacheKey, stagingDir);

		const { Image } = loadDaytona();
		return Image.base(baseImage)
			.addLocalDir(stagingDir, KNOWLEDGE_CSV_RUNNER_BAKE_ROOT)
			.runCommands(
				`mkdir -p ${runnerDir} && cp -a ${KNOWLEDGE_CSV_RUNNER_BAKE_ROOT}/. ${runnerDir}/ && chmod 0555 ${KNOWLEDGE_CSV_RUNNER_PATH}`,
			);
	}
}
