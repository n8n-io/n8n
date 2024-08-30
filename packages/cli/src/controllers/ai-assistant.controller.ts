import { Post, RestController } from '@/decorators';
import { AiAssistantService } from '@/services/ai-assistant.service';
import { AiAssistantRequest } from '@/requests';
import { Response } from 'express';
import type { AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import { Readable, promises } from 'node:stream';
import { InternalServerError } from 'express-openapi-validator/dist/openapi.validator';
import { strict as assert } from 'node:assert';
import { ErrorReporterProxy } from 'n8n-workflow';

@RestController('/ai-assistant')
export class AiAssistantController {
	constructor(private readonly aiAssistantService: AiAssistantService) {}

	@Post('/chat', { rateLimit: { limit: 100 } })
	async chat(req: AiAssistantRequest.Chat, res: Response) {
		try {
			const stream = await this.aiAssistantService.chat(req.body, req.user);

			if (stream.body) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				await promises.pipeline(Readable.fromWeb(stream.body), res);
			}
		} catch (e) {
			// todo add sentry reporting
			assert(e instanceof Error);
			ErrorReporterProxy.error(e);
			throw new InternalServerError({ message: `Something went wrong: ${e.message}` });
		}
	}

	@Post('/chat/apply-suggestion')
	async applySuggestion(
		req: AiAssistantRequest.ApplySuggestion,
	): Promise<AiAssistantSDK.ApplySuggestionResponse> {
		try {
			return await this.aiAssistantService.applySuggestion(req.body, req.user);
		} catch (e) {
			assert(e instanceof Error);
			ErrorReporterProxy.error(e);
			throw new InternalServerError({ message: `Something went wrong: ${e.message}` });
		}
	}
}
