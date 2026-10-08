import type { InstanceAiShareThreadResponse } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { GlobalScope, Param, Post, RestController } from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import type { Response } from 'express';

import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { ThreadSharingService } from './thread-sharing.service';

@RestController('/instance-ai')
export class ThreadSharingController {
	constructor(
		private readonly sharing: ThreadSharingService,
		private readonly settingsService: InstanceAiSettingsService,
	) {}

	/** Share the owner's chat with its team project. Members can then read it and answer its cards. */
	@Post('/threads/:threadId/share')
	@GlobalScope('instanceAi:message')
	async shareThread(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('threadId') threadId: string,
	): Promise<InstanceAiShareThreadResponse> {
		if (!this.settingsService.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
		}
		return { thread: await this.sharing.share(req.user, threadId) };
	}
}
