import { Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AiAssistantService } from '@/services/aiAsisstant.service';
import { AiAssistantRequest } from '@/requests';

@RestController('/ai-assistant')
export class AiAssistantController {
	constructor(private readonly aiAssistantService: AiAssistantService) {}

	@Post('/chat')
	async chat(req: AiAssistantRequest.Chat) {
		try {
			return await this.aiAssistantService.chat(req.body, req.user);
		} catch (e) {
			throw new BadRequestError('Something went wrong');
		}
	}
}
