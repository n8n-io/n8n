import type { AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import type { Response } from 'express';
import { ErrorReporterProxy } from 'n8n-workflow';
import { strict as assert } from 'node:assert';
import { WritableStream } from 'node:stream/web';

import { Post, RestController } from '@/decorators';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { AiAssistantRequest } from '@/requests';
import { AiAssistantService } from '@/services/ai-assistant.service';

type FlushableResponse = Response & { flush: () => void };

@RestController('/ai-assistant')
export class AiAssistantController {
	constructor(private readonly aiAssistantService: AiAssistantService) {}

	@Post('/chat', { rateLimit: { limit: 100 } })
	async chat(req: AiAssistantRequest.Chat, res: FlushableResponse) {
		try {
			const aiResponse = await this.aiAssistantService.chat(req.body, req.user);
			if (aiResponse.body) {
				res.header('Content-type', 'application/json-lines').flush();
				await aiResponse.body.pipeTo(
					new WritableStream({
						write(chunk) {
							res.write(chunk);
							res.flush();
						},
					}),
				);
				res.end();
			}
		} catch (e) {
			assert(e instanceof Error);
			ErrorReporterProxy.error(e);
			throw new InternalServerError(`Something went wrong: ${e.message}`);
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
			throw new InternalServerError(`Something went wrong: ${e.message}`);
		}
	}
}
