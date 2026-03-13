import { CodeEngineAnalyzeDto, CodeEngineRunDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { analyzeCodeString } from '@n8n/code-engine';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CodeEngineWebhooks } from '@/webhooks/code-engine-webhooks';

@RestController('/code-engine')
export class CodeEngineController {
	constructor(private readonly codeEngineWebhooks: CodeEngineWebhooks) {}

	@Post('/analyze')
	@GlobalScope('workflow:create')
	async analyze(_req: AuthenticatedRequest, _res: Response, @Body payload: CodeEngineAnalyzeDto) {
		try {
			return analyzeCodeString(payload.code);
		} catch (error) {
			throw new BadRequestError(error instanceof Error ? error.message : 'Failed to analyze code');
		}
	}

	@Post('/run')
	@GlobalScope('workflow:create')
	async run(_req: AuthenticatedRequest, _res: Response, @Body payload: CodeEngineRunDto) {
		const { testWebhookPath, staticGraph } = await this.codeEngineWebhooks.registerTestWebhook(
			payload.code,
			payload.pushRef,
		);

		return {
			waitingForWebhook: true,
			testWebhookUrl: `/webhook-test/${testWebhookPath}`,
			staticGraph,
		};
	}
}
