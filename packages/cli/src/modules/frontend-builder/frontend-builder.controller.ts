import type { FrontendBuilderMessageResponse } from '@n8n/api-types';
import { FrontendBuilderMessageRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Param, Post, ProjectScope, RestController } from '@n8n/decorators';

import { FrontendBuilderService } from './frontend-builder.service';

@RestController('/workflows/:workflowId/frontend')
export class FrontendBuilderController {
	constructor(private readonly service: FrontendBuilderService) {}

	@Post('/messages')
	@ProjectScope('workflow:update')
	async sendMessage(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
		@Body body: FrontendBuilderMessageRequestDto,
	): Promise<FrontendBuilderMessageResponse> {
		const result = await this.service.sendMessage(workflowId, body);
		// TODO(slice-2): the real v0 API may return zero or multiple assistant
		// messages per call (partial/thinking + final, or async). The fake
		// always returns exactly one, so this works for now. Revisit the
		// contract — likely return `newMessages: FrontendBuilderMessage[]`
		// or just the full message list — once we see real responses.
		const assistantMessage = result.messages[result.messages.length - 1];
		return {
			chatId: result.chatId,
			demoUrl: result.demoUrl,
			assistantMessage,
		};
	}
}
