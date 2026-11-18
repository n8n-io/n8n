import { Config, Env } from '@n8n/config';

@Config
export class N8nLiteConfig {
	/**
	 * Folder that holds the prebuilt n8n-lite runners, one file for each target,
	 * for example `n8n-lite-runner-linux-arm64` and `n8n-lite-runner-darwin-arm64`.
	 */
	@Env('N8N_LITE_RUNNER_DIR')
	runnerDir: string = '';

	/**
	 * Base URL that a lite binary uses to send its run reports to n8n. When
	 * empty, n8n uses its own instance base URL.
	 */
	@Env('N8N_LITE_REPORT_BASE_URL')
	reportBaseUrl: string = '';
}
