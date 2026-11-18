import type * as LambdaSdk from '@aws-sdk/client-lambda';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import { zipSync } from 'fflate';

import { N8nLiteConfig } from './n8n-lite.config';
import { N8nLiteService } from './n8n-lite.service';

const ADAPTER_LAYER_VERSION = 30;
const LAMBDA_PORT = '8080';
// Regular file with mode 755, in the upper 16 bits of the zip external attributes.
const EXECUTABLE_ATTRS = (0o100755 << 16) >>> 0;
const LOCAL_HOSTS = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/;

export interface LambdaDeployment {
	functionName: string;
	functionUrl: string;
	webhookUrl: string;
}

/**
 * Deploys a lite binary as an AWS Lambda function with a public function URL.
 * The AWS Lambda Web Adapter layer forwards each request to the runner's HTTP server.
 */
@Service()
export class N8nLiteLambdaService {
	constructor(
		private readonly config: N8nLiteConfig,
		private readonly liteService: N8nLiteService,
	) {}

	async deploy(workflowId: string, user: User): Promise<LambdaDeployment> {
		if (!this.config.lambdaRoleArn) {
			throw new BadRequestError(
				'Set N8N_LITE_LAMBDA_ROLE_ARN to the IAM role that the Lambda function runs as',
			);
		}

		const { binary, reportUrl, webhookPath } = await this.liteService.buildBinary(
			workflowId,
			user,
			'linux-arm64',
		);
		if (webhookPath === undefined) {
			throw new BadRequestError('Only a workflow with a Webhook trigger can run on Lambda');
		}
		if (LOCAL_HOSTS.test(reportUrl)) {
			throw new BadRequestError(
				`The Lambda function cannot reach ${reportUrl}. Set N8N_LITE_REPORT_BASE_URL to a public URL of this n8n, e.g. a tunnel`,
			);
		}

		const zip = zipSync({
			bootstrap: [new Uint8Array(binary), { os: 3, attrs: EXECUTABLE_ATTRS }],
		});

		try {
			return await this.deployZip(`n8n-lite-${workflowId}`, zip, webhookPath);
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			const message = error instanceof Error ? error.message : String(error);
			throw new BadRequestError(`AWS Lambda: ${message}`);
		}
	}

	private async deployZip(functionName: string, zip: Uint8Array, webhookPath: string) {
		const lambda = await import('@aws-sdk/client-lambda');
		const client = new lambda.LambdaClient({ region: this.config.awsRegion });
		const waiter = { client, maxWaitTime: 120 };
		const environment = (publicUrl?: string) => ({
			Variables: {
				LITE_PORT: LAMBDA_PORT,
				LITE_REPORT_BEFORE_RESPONSE: '1',
				...(this.config.slackToken ? { LITE_SLACK_TOKEN: this.config.slackToken } : {}),
				...(publicUrl ? { LITE_PUBLIC_URL: publicUrl } : {}),
			},
		});

		const exists = await client
			.send(new lambda.GetFunctionCommand({ FunctionName: functionName }))
			.then(
				() => true,
				(error: unknown) => {
					if (error instanceof lambda.ResourceNotFoundException) return false;
					throw error;
				},
			);

		if (exists) {
			await client.send(
				new lambda.UpdateFunctionCodeCommand({
					FunctionName: functionName,
					ZipFile: zip,
					Architectures: ['arm64'],
				}),
			);
			await lambda.waitUntilFunctionUpdatedV2(waiter, { FunctionName: functionName });
		} else {
			await client.send(
				new lambda.CreateFunctionCommand({
					FunctionName: functionName,
					Runtime: 'provided.al2023',
					Architectures: ['arm64'],
					Handler: 'bootstrap',
					Role: this.config.lambdaRoleArn,
					Code: { ZipFile: zip },
					Layers: [this.adapterLayerArn()],
					MemorySize: 128,
					Timeout: 30,
					Environment: environment(),
				}),
			);
			await lambda.waitUntilFunctionActiveV2(waiter, { FunctionName: functionName });
		}

		const functionUrl = await this.ensureFunctionUrl(lambda, client, functionName);
		const baseUrl = functionUrl.replace(/\/+$/, '');

		// The runner puts this URL into the `webhookUrl` field of each run.
		await client.send(
			new lambda.UpdateFunctionConfigurationCommand({
				FunctionName: functionName,
				Environment: environment(baseUrl),
			}),
		);
		await lambda.waitUntilFunctionUpdatedV2(waiter, { FunctionName: functionName });

		return { functionName, functionUrl, webhookUrl: `${baseUrl}/webhook/${webhookPath}` };
	}

	private async ensureFunctionUrl(
		lambda: typeof LambdaSdk,
		client: LambdaSdk.LambdaClient,
		functionName: string,
	) {
		try {
			const existing = await client.send(
				new lambda.GetFunctionUrlConfigCommand({ FunctionName: functionName }),
			);
			if (existing.FunctionUrl) return existing.FunctionUrl;
		} catch (error) {
			if (!(error instanceof lambda.ResourceNotFoundException)) throw error;
		}

		const created = await client.send(
			new lambda.CreateFunctionUrlConfigCommand({ FunctionName: functionName, AuthType: 'NONE' }),
		);

		// A public function URL needs both permissions.
		const permissions = [
			{
				StatementId: 'n8n-lite-url',
				Action: 'lambda:InvokeFunctionUrl',
				FunctionUrlAuthType: 'NONE',
			},
			{ StatementId: 'n8n-lite-invoke', Action: 'lambda:InvokeFunction' },
		] as const;
		for (const permission of permissions) {
			try {
				await client.send(
					new lambda.AddPermissionCommand({
						FunctionName: functionName,
						Principal: '*',
						...permission,
					}),
				);
			} catch (error) {
				if (!(error instanceof lambda.ResourceConflictException)) throw error;
			}
		}

		if (!created.FunctionUrl) throw new BadRequestError('AWS did not return a function URL');
		return created.FunctionUrl;
	}

	private adapterLayerArn() {
		return (
			this.config.lambdaAdapterLayerArn ||
			`arn:aws:lambda:${this.config.awsRegion}:753240598075:layer:LambdaAdapterLayerArm64:${ADAPTER_LAYER_VERSION}`
		);
	}
}
