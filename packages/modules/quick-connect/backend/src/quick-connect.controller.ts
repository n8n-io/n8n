import { GetQuickConnectApiKeyDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { QuickConnectService } from './quick-connect.service';

@RestController('/quick-connect')
export class QuickConnectController {
	constructor(private readonly quickConnectService: QuickConnectService) {}

	@Post('/')
	async getCredentialData(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: GetQuickConnectApiKeyDto,
	) {
		return await this.quickConnectService.getCredentialData(body.quickConnectType, req.user);
	}
}
