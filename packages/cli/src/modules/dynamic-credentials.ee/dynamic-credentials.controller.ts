import { Post, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { OauthService } from '@/oauth/oauth.service';

@RestController('/credentials')
export class DynamicCredentialsController {
	constructor(
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly oauthService: OauthService,
	) {}

	@Post('/:id/authorize', { skipAuth: true })
	async authorizeCredential(req: Request, _res: Response): Promise<string> {
		const credential = await this.enterpriseCredentialsService.getOne(req.params.id);

		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		if (!credential.type.includes('OAuth2') && !credential.type.includes('OAuth1')) {
			throw new BadRequestError('Credential type not supported');
		}

		if (credential.type.includes('OAuth2')) {
			return await this.oauthService.generateAOauth2AuthUri(credential, {
				cid: credential.id,
				authorizationHeader: req.headers.authorization,
			});
		}

		if (credential.type.includes('OAuth1')) {
			return await this.oauthService.generateAOauth1AuthUri(credential, {
				cid: credential.id,
				authorizationHeader: req.headers.authorization,
			});
		}

		throw new BadRequestError('Credential type not supported');
	}
}
