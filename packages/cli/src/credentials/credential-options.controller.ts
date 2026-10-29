import { CredentialOptionsRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Param, Post, ProjectScope, RestController } from '@n8n/decorators';

import { CredentialOptionsService } from './credential-options.service';

@RestController('/credentials')
export class CredentialOptionsController {
	constructor(private readonly credentialOptionsService: CredentialOptionsService) {}

	@Post('/options/projects/:projectId')
	@ProjectScope('credential:create')
	async lookupProjectDraft(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('projectId') projectId: string,
		@Body request: CredentialOptionsRequestDto,
	) {
		return await this.credentialOptionsService.lookupDraft(req.user, request, projectId);
	}

	@Post('/options/instance')
	@GlobalScope('credential:manageInstance')
	async lookupInstanceDraft(
		req: AuthenticatedRequest,
		_res: unknown,
		@Body request: CredentialOptionsRequestDto,
	) {
		return await this.credentialOptionsService.lookupDraft(req.user, request, null);
	}

	@Post('/:credentialId/options')
	@ProjectScope('credential:read')
	async lookupStored(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('credentialId') credentialId: string,
		@Body request: CredentialOptionsRequestDto,
	) {
		return await this.credentialOptionsService.lookupStored(req.user, credentialId, request);
	}
}
