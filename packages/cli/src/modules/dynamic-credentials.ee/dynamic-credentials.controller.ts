import { Options, Post, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CreateCsrfStateData, OauthService } from '@/oauth/oauth.service';
import { CredentialsEntity } from '@n8n/db';
import { DynamicCredentialResolverRepository } from './database/repositories/credential-resolver.repository';
import { DynamicCredentialResolverRegistry } from './services';
import { getBearerToken } from './utils';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

@RestController('/credentials')
export class DynamicCredentialsController {
	constructor(
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly oauthService: OauthService,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly cipher: Cipher,
	) {}

	// Add CORS headers helper
	private setCorsHeaders(res: Response) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Max-Age', '86400'); // 24 hours
	}

	/**
	 * OPTIONS /credentials/:id/authorize
	 *
	 * Handles CORS preflight requests
	 */
	@Options('/:id/authorize', { skipAuth: true })
	async handlePreflightAuthorize(_req: Request, res: Response): Promise<void> {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	@Post('/:id/authorize', { skipAuth: true })
	async authorizeCredential(req: Request, res: Response): Promise<string> {
		this.setCorsHeaders(res);
		const credential = await this.enterpriseCredentialsService.getOne(req.params.id);
		const token = getBearerToken(req);

		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		if (!credential.type.includes('OAuth2') && !credential.type.includes('OAuth1')) {
			throw new BadRequestError('Credential type not supported');
		}

		const resolverId = req.query.resolverId as string | undefined;
		if (!resolverId) {
			throw new BadRequestError('Missing resolverId query parameter');
		}

		const resolverEntity = await this.resolverRepository.findOneBy({
			id: resolverId,
		});

		if (!resolverEntity) {
			throw new NotFoundError('Resolver not found');
		}

		// Get resolver instance from registry
		const resolver = this.resolverRegistry.getResolverByTypename(resolverEntity.type);

		if (!resolver) {
			throw new NotFoundError('Resolver type not found');
		}

		if (resolver.validateIdentity) {
			// Decrypt and parse resolver configuration
			const decryptedConfig = this.cipher.decrypt(resolverEntity.config);
			const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			await resolver.validateIdentity(token, {
				resolverId,
				resolverName: resolverEntity.type,
				configuration: resolverConfig,
			});
		}

		const callerData: [CredentialsEntity, CreateCsrfStateData] = [
			credential,
			{
				cid: credential.id,
				origin: 'dynamic-credential',
				authorizationHeader: req.headers.authorization ?? '',
				credentialResolverId: req.query.resolverId,
			},
		];

		if (credential.type.includes('OAuth2')) {
			return await this.oauthService.generateAOauth2AuthUri(...callerData);
		}

		if (credential.type.includes('OAuth1')) {
			return await this.oauthService.generateAOauth1AuthUri(...callerData);
		}

		throw new BadRequestError('Credential type not supported');
	}
}
