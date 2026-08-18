import { ShareCredentialPublicDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Licensed,
	Param,
	ProjectScope,
	Put,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { apiKeyScopesSatisfy } from '@/public-api/public-api-route-resolver';

@PublicApiController('/credentials')
export class CredentialsPublicController {
	constructor(
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
	) {}

	@Put('/:credentialId/share')
	@Licensed('feat:sharing')
	@ApiKeyScope({ anyOf: ['credential:share', 'credential:unshare'] })
	@ProjectScope('credential:read')
	@ApiSummary('Share a credential with projects')
	@ApiDescription(
		'Replaces the set of projects a credential is shared with. Projects in `shareWithIds` that the credential is not yet shared with are added, and projects it is currently shared with that are absent from `shareWithIds` are removed. The owning project is unaffected. Adding projects requires the `credential:share` scope, removing them requires `credential:unshare`.',
	)
	@ApiTags(['Credential'])
	@ApiResponse(204)
	@ApiErrorResponse(403)
	@ApiErrorResponse(404)
	async shareCredential(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('credentialId') credentialId: string,
		@Body body: ShareCredentialPublicDto,
	): Promise<void> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:read'],
		);

		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		const diff = this.enterpriseCredentialsService.getSharedWithProjectsDiff(
			credential,
			body.shareWithIds,
		);

		// `@ApiKeyScope` only gates entry with `anyOf`, so each direction of the diff
		// is authorized against the API key separately here.
		const apiKeyScopes = req.tokenGrant?.apiKeyScopes ?? [];

		if (diff.toShare.length > 0 && !apiKeyScopesSatisfy(apiKeyScopes, 'credential:share')) {
			throw new ForbiddenError();
		}

		if (diff.toUnshare.length > 0 && !apiKeyScopesSatisfy(apiKeyScopes, 'credential:unshare')) {
			throw new ForbiddenError();
		}

		await this.enterpriseCredentialsService.setSharedWithProjects(req.user, credential, diff);
	}
}
