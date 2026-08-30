import { CompleteCodexOAuthFlowDto, StartCodexOAuthFlowDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { OpenAiCodexOAuthService } from './openai-codex-oauth.service';

@RestController('/openai-codex-oauth')
export class OpenAiCodexOAuthController {
	constructor(private readonly service: OpenAiCodexOAuthService) {}

	/** Begins a sign-in and returns the URL the browser must open. */
	@Post('/start')
	async start(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: StartCodexOAuthFlowDto,
	): Promise<{ flowId: string; authUrl: string; listening: boolean }> {
		return await this.service.startFlow(body.credentialId, req.user);
	}

	/**
	 * Finishes a sign-in. Waits on the loopback listener, or consumes the
	 * redirect URL the user pasted when the callback could not be captured.
	 */
	@Post('/complete')
	async complete(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: CompleteCodexOAuthFlowDto,
	): Promise<{ credentialId: string }> {
		return await this.service.completeFlow(body.flowId, req.user, body.redirectInput);
	}
}
