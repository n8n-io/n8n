import { Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AiAssistantService } from '@/services/aiAsisstant.service';
import { AiAssistantRequest } from '@/requests';
import { Response } from 'express';

@RestController('/ai-assistant')
export class AiAssistantController {
	constructor(private readonly aiAssistantService: AiAssistantService) {}

	@Post('/chat')
	async chat(req: AiAssistantRequest.Chat, res: Response) {
		try {
			const buffer = await this.aiAssistantService.chat(req.body, req.user);
			res.send(buffer);
		} catch (e) {
			throw new BadRequestError('Something went wrong');
		}
	}

	@Post('/chat/apply-suggestion')
	async applySuggestion(req: AiAssistantRequest.ApplySuggestion) {
		try {
			return await this.aiAssistantService.applySuggestion(req.body, req.user);
		} catch (e) {
			throw new BadRequestError('Something went wrong');
		}
	}
}
