import { Delete, Options, Post, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CreateCsrfStateData, OauthService } from '@/oauth/oauth.service';
import { CredentialsEntity } from '@n8n/db';
import { DynamicCredentialResolverRepository } from './database/repositories/credential-resolver.repository';
import { DynamicCredentialResolverRegistry } from './services';
import { getDynamicCredentialMiddlewares } from './utils';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { DynamicCredentialCorsService } from './services/dynamic-credential-cors.service';
import { DynamicCredentialWebService } from './services/dynamic-credential-web.service';

@RestController('/credentials')
export class DynamicCredentialsController {
	constructor(
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly oauthService: OauthService,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly cipher: Cipher,
		private readonly dynamicCredentialCorsService: DynamicCredentialCorsService,
		private readonly dynamicCredentialWebService: DynamicCredentialWebService,
	) {}

	private async findCredentialToUse(credentialId: string): Promise<CredentialsEntity> {
		const credential = await this.enterpriseCredentialsService.getOne(credentialId);

		if (!credential) {
			throw new NotFoundError('Credential not found');
		}

		if (
			!credential.type.toLowerCase().includes('oauth2') &&
			!credential.type.toLowerCase().includes('oauth1')
		) {
			throw new BadRequestError('Credential type not supported');
		}
		return credential;
	}

	private async getResolverInstance(resolverId: string | undefined) {
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
		return { resolver, resolverEntity };
	}

	/**
	 * OPTIONS /credentials/:id/revoke
	 *
	 * Handles CORS preflight requests
	 */
	@Options('/:id/revoke', { skipAuth: true })
	handlePreflightCredentialRevoke(req: Request, res: Response): void {
		this.dynamicCredentialCorsService.preflightHandler(req, res, ['delete', 'options']);
	}

	@Delete('/:id/revoke', {
		allowUnauthenticated: true,
		middlewares: getDynamicCredentialMiddlewares(),
	})
	async revokeCredential(req: Request, res: Response): Promise<void> {
		this.dynamicCredentialCorsService.applyCorsHeadersIfEnabled(req, res, ['delete', 'options']);
		const credentialContext = this.dynamicCredentialWebService.getCredentialContextFromRequest(req);
		const credential = await this.findCredentialToUse(req.params.id);

		const resolverId = req.query.resolverId as string | undefined;
		const { resolver, resolverEntity } = await this.getResolverInstance(resolverId);

		if (resolver.deleteSecret) {
			// Decrypt and parse resolver configuration
			const decryptedConfig = this.cipher.decrypt(resolverEntity.config);
			const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			await resolver.deleteSecret(credential.id, credentialContext, {
				configuration: resolverConfig,
				resolverId: resolverEntity.id,
				resolverName: resolverEntity.type,
			});
		}

		res.status(204).send(); // 204 No Content indicates successful deletion
	}

	/**
	 * OPTIONS /credentials/:id/authorize
	 *
	 * Handles CORS preflight requests
	 */
	@Options('/:id/authorize', { skipAuth: true })
	handlePreflightCredentialAuthorize(req: Request, res: Response): void {
		this.dynamicCredentialCorsService.preflightHandler(req, res, ['post', 'options']);
	}

	@Post('/:id/authorize', {
		allowUnauthenticated: true,
		middlewares: getDynamicCredentialMiddlewares(),
	})
	async authorizeCredential(req: Request, res: Response): Promise<string> {
		this.dynamicCredentialCorsService.applyCorsHeadersIfEnabled(req, res, ['post', 'options']);
		const credentialContext = this.dynamicCredentialWebService.getCredentialContextFromRequest(req);
		const credential = await this.findCredentialToUse(req.params.id);

		const resolverId = req.query.resolverId as string | undefined;
		const { resolver, resolverEntity } = await this.getResolverInstance(resolverId);

		if (resolver.validateIdentity) {
			// Decrypt and parse resolver configuration
			const decryptedConfig = this.cipher.decrypt(resolverEntity.config);
			const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			await resolver.validateIdentity(credentialContext, {
				resolverId: resolverEntity.id,
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

		if (credential.type.toLowerCase().includes('oauth2')) {
			return await this.oauthService.generateAOauth2AuthUri(...callerData);
		}

		if (credential.type.toLowerCase().includes('oauth1')) {
			return await this.oauthService.generateAOauth1AuthUri(...callerData);
		}

		throw new BadRequestError('Credential type not supported');
	}
}
