import { Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AiAssistantService } from '@/services/aiAsisstant.service';
import { AiAssistantRequest } from '@/requests';
import { Response } from 'express';
import type { AiAssistantSDK } from '@n8n_io/ai-assistant-sdk';

@RestController('/ai-assistant')
export class AiAssistantController {
	constructor(private readonly aiAssistantService: AiAssistantService) {}

	@Post('/chat')
	async chat(req: AiAssistantRequest.Chat, res: Response) {
		try {
			await this.aiAssistantService.chat(
				req.body,
				req.user,
				(streamRes: string) => {
					res.write(streamRes);
				},
				() => {
					res.end();
				},
			);
		} catch (e) {
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
			throw new BadRequestError('Something went wrong');
		}
	}
}
