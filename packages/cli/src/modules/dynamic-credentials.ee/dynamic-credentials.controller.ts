import { Post, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { OauthService } from '@/oauth/oauth.service';
import { OAuth2CredentialData } from '@n8n/client-oauth2';

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
			console.log('Credential type not supported', credential.type);
			throw new BadRequestError('Credential type not supported');
		}

		const oauthCredentials: OAuth2CredentialData =
			await this.oauthService.getOAuthCredentials<OAuth2CredentialData>(credential);

		if (credential.type.includes('OAuth2')) {
			return this.oauthService.generateAOauth2AuthUri(credential, oauthCredentials);
		}

		throw new BadRequestError('Credential type not supported');
	}
}
