import { CreateQuickConnectCredentialDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { QuickConnectService } from './quick-connect.service';

@RestController('/quick-connect')
export class QuickConnectController {
	constructor(private readonly quickConnectService: QuickConnectService) {}

	@Post('/create')
	async createCredential(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body body: CreateQuickConnectCredentialDto,
	): Promise<{ id: string }> {
		return await this.quickConnectService.createCredential(
			body.credentialType,
			req.user,
			body.projectId,
		);
	}
}
