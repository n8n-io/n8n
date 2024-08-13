import { Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AiAssistantService } from '@/services/aiAsisstant.service';
import { AiAssistantRequest } from '@/requests';
import { Response } from 'express';
import type { AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';
import { Readable, promises } from 'node:stream';

@RestController('/ai-assistant')
export class AiAssistantController {
	constructor(private readonly aiAssistantService: AiAssistantService) {}

	@Post('/chat')
	async chat(req: AiAssistantRequest.Chat, res: Response) {
		try {
			const stream = await this.aiAssistantService.chat(req.body, req.user);

			if (stream.body) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				await promises.pipeline(Readable.fromWeb(stream.body), res);
			}
		} catch (e) {
			// todo add sentry reporting
			throw new BadRequestError('Something went wrong');
		}
	}

	@Post('/chat/apply-suggestion')
	async applySuggestion(
		req: AiAssistantRequest.ApplySuggestion,
	): Promise<AiAssistantSDK.ApplySuggestionResponse> {
		try {
			return await this.aiAssistantService.applySuggestion(req.body, req.user);
		} catch (e) {
			// todo add sentry reporting
			throw new BadRequestError('Something went wrong');
		}
	}
}
