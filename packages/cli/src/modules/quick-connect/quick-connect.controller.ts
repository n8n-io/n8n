import { CreateQuickConnectCredentialDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { QuickConnectService } from './quick-connect.service';

@RestController('/quick-connect')
export class QuickConnectController {
	constructor(private readonly quickConnectService: QuickConnectService) {}

	@Post('/create-api-key')
	async createApiKey(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: CreateQuickConnectCredentialDto,
	) {
		return await this.quickConnectService.getApiKey(body.quickConnectType, req.user);
	}
}
