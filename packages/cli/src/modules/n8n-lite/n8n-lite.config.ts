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

	/**
	 * AWS region for "Deploy as lambda". n8n reads the AWS credentials from the
	 * standard AWS environment variables, for example `AWS_ACCESS_KEY_ID` and
	 * `AWS_SECRET_ACCESS_KEY`.
	 */
	@Env('N8N_LITE_AWS_REGION')
	awsRegion: string = 'eu-central-1';

	/** ARN of the IAM role that each deployed Lambda function runs as. */
	@Env('N8N_LITE_LAMBDA_ROLE_ARN')
	lambdaRoleArn: string = '';

	/**
	 * ARN of the AWS Lambda Web Adapter layer for arm64. When empty, n8n uses
	 * version 30 of the public layer in `N8N_LITE_AWS_REGION`.
	 */
	@Env('N8N_LITE_LAMBDA_ADAPTER_LAYER_ARN')
	lambdaAdapterLayerArn: string = '';

	/**
	 * Slack bot token for the Slack nodes of a deployed Lambda function. n8n
	 * sets it as `LITE_SLACK_TOKEN` on the function. The token starts with `xoxb-`.
	 */
	@Env('N8N_LITE_SLACK_TOKEN')
	slackToken: string = '';
}
