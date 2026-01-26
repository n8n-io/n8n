import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import axios from 'axios';
import type { ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';

import { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError, ITokenIdentifier } from './identifier-interface';
import { OAuth2OptionsSchema, sha256 } from './oauth2-utils';

// Use minimum of 30 seconds to avoid cache thrashing
// Cap at 5 minutes to ensure periodic revalidation
const MIN_TOKEN_CACHE_TIMEOUT = 30 * Time.seconds.toMilliseconds;
const MAX_TOKEN_CACHE_TIMEOUT = 5 * Time.minutes.toMilliseconds;
const DEFAULT_CACHE_TIMEOUT = 60 * Time.seconds.toMilliseconds; // 60 seconds
const METADATA_CACHE_TIMEOUT = 1 * Time.hours.toMilliseconds; // 1 hour

export const OAuth2UserInfoOptionsSchema = z.object({
	...OAuth2OptionsSchema.shape,
	validation: z.literal('oauth2-userinfo'),
});

type OAuth2UserInfoOptions = z.infer<typeof OAuth2UserInfoOptionsSchema>;

const OAuth2MetadataSchema = z.object({
	issuer: z.string().url(),
	userinfo_endpoint: z.string().url(),
});

type OAuth2Metadata = z.infer<typeof OAuth2MetadataSchema>;

export const UserInfoResponseSchema = z
	.object({
		// Standard optional fields
		sub: z.string().optional(),
	})
	.passthrough();

export type UserInfoResponse = z.infer<typeof UserInfoResponseSchema>;

const CACHE_PREFIX = 'oauth2-userinfo-identifier';

@Service()
export class OAuth2UserInfoIdentifier implements ITokenIdentifier {
	constructor(
		private readonly logger: Logger,
		private readonly cache: CacheService,
	) {}

	async validateOptions(identifierOptions: Record<string, unknown>): Promise<void> {
		const options = this.parseOptions(identifierOptions);
		const metadata = await this.fetchMetadata(options, true);
		if (!metadata.userinfo_endpoint) {
			this.logger.error('Metadata does not contain an userinfo endpoint');
			throw new IdentifierValidationError('Metadata does not contain an userinfo endpoint');
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

		let ttl = DEFAULT_CACHE_TIMEOUT;
		const { subject, ttl: ttlOverwrite } = await this.resolveBasedOnUserInfo(
			metadata,
			options,
			context,
		);
		if (ttlOverwrite) {
			ttl = ttlOverwrite;
		}

		await this.cache.set(identifierCacheKey, subject, ttl);
		return subject;
	}

	// ------------------------ Private Methods ----------------------- //

	private parseOptions(options: Record<string, unknown>): OAuth2UserInfoOptions {
		try {
			return OAuth2UserInfoOptionsSchema.parse(options);
		} catch (error) {
			this.logger.error('Invalid OAuth2 identifier options', { error });
			throw new IdentifierValidationError('Invalid OAuth2 identifier options', {
				cause: error,
			});
		}
	}

	private async fetchMetadata(
		options: OAuth2UserInfoOptions,
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
			timeout: 10 * Time.seconds.toMilliseconds,
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
				await this.cache.set(cacheKey, metadata, METADATA_CACHE_TIMEOUT);
			}
			return metadata;
		} catch (error) {
			this.logger.error('Invalid OAuth2 metadata format', { error });
			throw new IdentifierValidationError('Invalid OAuth2 metadata format', { cause: error });
		}
	}

	private parseUserInfoResponse(data: unknown): UserInfoResponse {
		try {
			return UserInfoResponseSchema.parse(data);
		} catch (error) {
			this.logger.error('Invalid userinfo response format', { error });
			throw new IdentifierValidationError('Invalid userinfo response format');
		}
	}

	private async resolveBasedOnUserInfo(
		metadata: OAuth2Metadata,
		options: OAuth2UserInfoOptions,
		context: ICredentialContext,
	): Promise<{ subject: string; ttl?: number }> {
		const response = await axios.get(metadata.userinfo_endpoint, {
			headers: { authorization: `Bearer ${context.identity}` },
			validateStatus: () => true,
			timeout: 10 * Time.seconds.toMilliseconds,
		});

		if (response.status !== 200) {
			this.logger.error('UserInfo failed', {
				status: response.status,
				data: response.data,
			});
			throw new IdentifierValidationError('UserInfo query failed');
		}

		// TODO: Add support for JWT responses in addition to JSON
		const userData = this.parseUserInfoResponse(response.data);
		const subject = userData[options.subjectClaim];
		if (!subject) {
			this.logger.error(`UserInfo response missing subject claim (${options.subjectClaim})`);
			throw new IdentifierValidationError(
				`UserInfo response missing subject claim (${options.subjectClaim})`,
			);
		}

		const subjectStr = String(subject);

		this.logger.debug('UserInfo successfully', { subject: subjectStr });

		let ttl: number | undefined = undefined;
		if (userData.exp && typeof userData.exp === 'number') {
			const expiresIn = userData.exp * 1000 - Date.now();
			if (expiresIn > 0) {
				ttl = Math.max(MIN_TOKEN_CACHE_TIMEOUT, Math.min(expiresIn, MAX_TOKEN_CACHE_TIMEOUT));
			} else {
				ttl = MIN_TOKEN_CACHE_TIMEOUT;
			}
		}

		return { subject: subjectStr, ttl };
	}
}
