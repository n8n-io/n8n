import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import axios from 'axios';
import { type ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';

import { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError, ITokenIdentifier } from './identifier-interface';
import { OAuth2OptionsSchema, sha256 } from './oauth2-utils';

export const OAuth2IntrospectionOptionsSchema = z.object({
	...OAuth2OptionsSchema.shape,
	clientId: z.string(),
	clientSecret: z.string(),
});

type OAuth2IntrospectionOptions = z.infer<typeof OAuth2IntrospectionOptionsSchema>;

const OAuth2MetadataSchema = z.object({
	issuer: z.string().url(),
	introspection_endpoint: z.string().url(),
	// This could be an well defined enum, but to make sure we are not failing validation
	// of unknown values, we keep it as string
	introspection_endpoint_auth_methods_supported: z.array(z.string()).optional(),
});

type OAuth2Metadata = z.infer<typeof OAuth2MetadataSchema>;

export const TokenIntrospectionResponseSchema = z
	.object({
		// Core fields
		active: z.boolean(),

		// Standard optional fields
		scope: z.string().optional(),
		client_id: z.string().optional(),
		username: z.string().optional(),
		token_type: z.string().optional(),
		exp: z.number().int().optional(),
		iat: z.number().int().optional(),
		nbf: z.number().int().optional(),
		sub: z.string().optional(),
		aud: z.union([z.string(), z.array(z.string())]).optional(),
		iss: z.string().optional(),
		jti: z.string().optional(),
	})
	.passthrough(); // Allow additional custom claims

export type TokenIntrospectionResponse = z.infer<typeof TokenIntrospectionResponseSchema>;

const CACHE_PREFIX = 'oauth2-introspection-identifier';

@Service()
export class OAuth2TokenIntrospectionIdentifier implements ITokenIdentifier {
	constructor(
		private readonly logger: Logger,
		private readonly cache: CacheService,
	) {}

	async validateOptions(identifierOptions: Record<string, unknown>): Promise<void> {
		const options = this.parseOptions(identifierOptions);
		const metadata = await this.fetchMetadata(options, true);
		if (!metadata.introspection_endpoint) {
			this.logger.error('Metadata does not contain an introspection endpoint');
			throw new IdentifierValidationError('Metadata does not contain an introspection endpoint');
		}
		if (metadata.introspection_endpoint_auth_methods_supported) {
			const supportedMethods = metadata.introspection_endpoint_auth_methods_supported;
			if (
				!supportedMethods.includes('client_secret_basic') &&
				!supportedMethods.includes('client_secret_post')
			) {
				this.logger.error(
					'No supported client authentication method for introspection endpoint, supported options are client_secret_basic and client_secret_post',
				);
				throw new IdentifierValidationError(
					'No supported client authentication method for introspection endpoint, supported options are client_secret_basic and client_secret_post',
				);
			}
		}
	}

	async resolve(
		context: ICredentialContext,
		identifierOptions: Record<string, unknown>,
	): Promise<string> {
		const options = this.parseOptions(identifierOptions);
		const metadata = await this.fetchMetadata(options);

		const hashedToken = sha256(context.identity);

		const identifierCacheKey = `${CACHE_PREFIX}:subject:${metadata.issuer}:${hashedToken}`;
		const cached = await this.cache.get<string>(identifierCacheKey);
		if (cached) {
			return cached;
		}

		let ttl = 300;
		const { subject, ttl: ttlOverwrite } = await this.resolveBasedOnTokenIntrospection(
			metadata,
			options,
			context,
		);
		if (ttlOverwrite) {
			ttl = ttlOverwrite;
		}

		if (!subject) {
			this.logger.error('No valid method to validate token found in metadata');
			throw new IdentifierValidationError('No valid method to validate token found in metadata');
		}

		await this.cache.set(identifierCacheKey, subject, ttl);
		return subject;
	}

	// ------------------------ Private Methods ----------------------- //

	private parseOptions(options: Record<string, unknown>): OAuth2IntrospectionOptions {
		try {
			return OAuth2IntrospectionOptionsSchema.parse(options);
		} catch (error) {
			this.logger.error('Invalid OAuth2 identifier options', { error });
			throw new IdentifierValidationError('Invalid OAuth2 identifier options', {
				cause: error,
			});
		}
	}

	private async fetchMetadata(
		options: OAuth2IntrospectionOptions,
		skipCache: boolean = false,
	): Promise<OAuth2Metadata> {
		const cacheKey = `${CACHE_PREFIX}:metadata:${options.metadataUri}`;
		if (!skipCache) {
			const cached = await this.cache.get<OAuth2Metadata>(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const response = await axios.get(options.metadataUri, {
			validateStatus: () => true,
		});

		if (response.status !== 200) {
			this.logger.error(
				`Failed to fetch OAuth2 metadata from ${options.metadataUri}, status code: ${response.status}`,
			);
			throw new IdentifierValidationError(
				`Failed to fetch OAuth2 metadata, status code: ${response.status}`,
			);
		}

		try {
			const metadata = OAuth2MetadataSchema.parse(response.data);
			if (!skipCache) {
				await this.cache.set(cacheKey, metadata, 3600); // Cache for 1 hour
			}
			return metadata;
		} catch (error) {
			this.logger.error('Invalid OAuth2 metadata format', { error });
			throw new IdentifierValidationError('Invalid OAuth2 metadata format', { cause: error });
		}
	}

	private buildClientBasicRequest(options: OAuth2IntrospectionOptions): {
		headers: Record<string, string>;
		params: Record<string, string>;
	} {
		const authHeaders: Record<string, string> = {};
		const authParams: Record<string, string> = {};

		const credentials = Buffer.from(`${options.clientId}:${options.clientSecret}`).toString(
			'base64',
		);
		authHeaders['Authorization'] = `Basic ${credentials}`;

		return { headers: authHeaders, params: authParams };
	}

	private buildClientPostRequest(options: OAuth2IntrospectionOptions): {
		headers: Record<string, string>;
		params: Record<string, string>;
	} {
		const authHeaders: Record<string, string> = {};
		const authParams: Record<string, string> = {};

		authParams['client_id'] = options.clientId;
		authParams['client_secret'] = options.clientSecret;

		return { headers: authHeaders, params: authParams };
	}

	private parseIntrospectionResponse(data: unknown): TokenIntrospectionResponse {
		try {
			return TokenIntrospectionResponseSchema.parse(data);
		} catch (error) {
			this.logger.error('Invalid token introspection response format', { error });
			throw new IdentifierValidationError('Invalid token introspection response format');
		}
	}

	private async resolveBasedOnTokenIntrospection(
		metadata: OAuth2Metadata,
		options: OAuth2IntrospectionOptions,
		context: ICredentialContext,
	) {
		// Use token introspection to validate and get subject
		const useBasic =
			metadata.introspection_endpoint_auth_methods_supported?.includes('client_secret_basic');
		const usePost =
			metadata.introspection_endpoint_auth_methods_supported?.includes('client_secret_post');

		let authHeaders: Record<string, string> = {};
		let authParams: Record<string, string> = {};

		if (useBasic) {
			const result = this.buildClientBasicRequest(options);
			authHeaders = result.headers;
			authParams = result.params;
		} else if (usePost) {
			const result = this.buildClientPostRequest(options);
			authHeaders = result.headers;
			authParams = result.params;
		} else {
			this.logger.error('No supported client authentication method for introspection endpoint');
			throw new IdentifierValidationError(
				'No supported client authentication method for introspection endpoint',
			);
		}

		const params = new URLSearchParams({
			token: context.identity,
			...authParams,
		});

		const response = await axios.post(metadata.introspection_endpoint, params, {
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...authHeaders },
		});

		if (response.status !== 200) {
			this.logger.error('Token introspection failed', {
				status: response.status,
				data: response.data,
			});
			throw new IdentifierValidationError('Token introspection failed');
		}

		const introspectionData = this.parseIntrospectionResponse(response.data);

		if (!introspectionData.active) {
			this.logger.error('Token is not active according to introspection response');
			throw new IdentifierValidationError('Token is not active');
		}

		const subject = introspectionData[options.subjectClaim as keyof TokenIntrospectionResponse];
		if (!subject) {
			this.logger.error(
				`Token introspection response missing subject claim (${options.subjectClaim})`,
			);
			throw new IdentifierValidationError(
				`Token introspection response missing subject claim (${options.subjectClaim})`,
			);
		}

		const subjectStr = String(subject);

		this.logger.debug('Token introspected successfully', { subject: subjectStr });

		let ttl: number | undefined = undefined;
		if (introspectionData.exp) {
			const expiresIn = introspectionData.exp * 1000 - Date.now();
			if (expiresIn > 0) {
				ttl = Math.floor(expiresIn / 1000);
			}
		}

		return { subject: subjectStr, ttl };
	}
}
