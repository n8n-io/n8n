import { AuthenticatedRequest } from '@n8n/db';
import { Delete, Param, ProjectScope, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { TestWebhooks } from '@/webhooks/test-webhooks';

@RestController('/test-webhook')
export class TestWebhooksController {
	constructor(private readonly testWebhooks: TestWebhooks) {}

	@Delete('/:workflowId')
	@ProjectScope('workflow:execute')
	async cancel(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('workflowId') workflowId: string,
	) {
		await this.testWebhooks.cancelWebhook(workflowId);
	}
}
