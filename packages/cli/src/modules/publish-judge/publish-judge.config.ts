import { Config, Env } from '@n8n/config';

@Config
export class PublishJudgeConfig {
	/** How long a publish waits for a judge workflow to answer, in milliseconds. */
	@Env('N8N_PUBLISH_JUDGE_TIMEOUT_MS')
	timeoutMs: number = 30_000;
}
