import { AiChatRequestDto, AiApplySuggestionRequestDto, AiAskRequestDto } from '@n8n/api-types';
import type { AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import { Response } from 'express';
import { strict as assert } from 'node:assert';
import { WritableStream } from 'node:stream/web';

import { Body, Post, RestController } from '@/decorators';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { AuthenticatedRequest } from '@/requests';
import { AiService } from '@/services/ai.service';

export type FlushableResponse = Response & { flush: () => void };

@RestController('/ai')
export class AiController {
	constructor(private readonly aiService: AiService) {}

	@Post('/chat', { rateLimit: { limit: 100 } })
	async chat(req: AuthenticatedRequest, res: FlushableResponse, @Body payload: AiChatRequestDto) {
		try {
			const aiResponse = await this.aiService.chat(payload, req.user);
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
			throw new InternalServerError(e.message, e);
		}
	}

	@Post('/chat/apply-suggestion')
	async applySuggestion(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: AiApplySuggestionRequestDto,
	): Promise<AiAssistantSDK.ApplySuggestionResponse> {
		try {
			return await this.aiService.applySuggestion(payload, req.user);
		} catch (e) {
			assert(e instanceof Error);
			throw new InternalServerError(e.message, e);
		}
	}

	@Post('/ask-ai')
	async askAi(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: AiAskRequestDto,
	): Promise<AiAssistantSDK.AskAiResponsePayload> {
		try {
			return await this.aiService.askAi(payload, req.user);
		} catch (e) {
			assert(e instanceof Error);
			throw new InternalServerError(e.message, e);
		}
	}
}
