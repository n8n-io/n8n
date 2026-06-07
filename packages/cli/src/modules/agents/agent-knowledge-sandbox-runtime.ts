import { existsSync } from 'node:fs';
import path from 'node:path';

/** Fixed path inside sandbox images for the knowledge CSV runner. */
export const KNOWLEDGE_CSV_RUNNER_PATH = '/opt/n8n/sandbox-runners/knowledge-csv-runner.cjs';

export const KNOWLEDGE_CSV_RUNNER_VERSION = 1;

export const KNOWLEDGE_CSV_RUNNER_TIMEOUT_MS = 15_000;

export const MAX_CSV_RUNNER_OUTPUT_BYTES = 64 * 1024;

export const KNOWLEDGE_CSV_RUNNER_MISSING_MESSAGE = `Agent knowledge sandbox image does not include CSV runner v${KNOWLEDGE_CSV_RUNNER_VERSION}. Update the sandbox image.`;

/**
 * n8n-sandbox runtime images (`n8nio/n8n-sandbox-service-sandbox`) must ship the runner at
 * {@link KNOWLEDGE_CSV_RUNNER_PATH}. Image builds for that service live outside this monorepo.
 */
export const N8N_SANDBOX_CSV_RUNNER_IMAGE_CONTRACT =
	'n8nio/n8n-sandbox-service-sandbox must include /opt/n8n/sandbox-runners/knowledge-csv-runner.cjs';

const RUNNER_ASSET_FILE_NAME = 'knowledge-csv-runner.cjs';

export function getKnowledgeCsvRunnerAssetPath(): string {
	const candidates = [
		path.join(__dirname, 'sandbox-runners', RUNNER_ASSET_FILE_NAME),
		path.join(
			__dirname,
			'..',
			'..',
			'..',
			'src',
			'modules',
			'agents',
			'sandbox-runners',
			RUNNER_ASSET_FILE_NAME,
		),
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}
	return candidates[0];
}
