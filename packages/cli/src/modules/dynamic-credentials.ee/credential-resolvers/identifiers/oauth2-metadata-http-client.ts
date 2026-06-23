import { Logger } from '@n8n/backend-common';
import { OutboundHttp, SsrfProtectionService, type HttpRequestClient } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { IHttpRequestOptions, IN8nHttpFullResponse } from 'n8n-workflow';
import type { z } from 'zod';

import { IdentifierValidationError } from './identifier-interface';

import { CacheService } from '@/services/cache/cache.service';

export const REQUEST_TIMEOUT = 10 * Time.seconds.toMilliseconds;
const METADATA_CACHE_TIMEOUT = 1 * Time.hours.toMilliseconds; // 1 hour

interface FetchMetadataParams {
	metadataUri: string;
	/** Cache-key namespace for the calling identifier (e.g. `oauth2-userinfo-identifier`). */
	cachePrefix: string;
	/** Skip reading/writing the metadata cache — used on the validation path. */
	skipCache: boolean;
}

/**
 * Shared HTTP entrypoint for the OAuth2 token identifiers.
 */
@Service()
export class OAuth2MetadataHttpClient {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly logger: Logger,
		private readonly cache: CacheService,
		outboundHttp: OutboundHttp,
		ssrfProtectionService: SsrfProtectionService,
		ssrfProtectionConfig: SsrfProtectionConfig,
	) {
		// We opt into SSRF protection (when the environment enables it) because the attack risk is higher here.
		// This matters for the second hop too: the introspection/userinfo endpoints come from
		// the remote metadata server, so they are fully third-party-controlled.
		// Self-hosted users pointing the resolver at an internal IdP can allowlist via SsrfProtectionConfig.
		this.http = outboundHttp.requests({
			ssrf: ssrfProtectionConfig.enabled ? ssrfProtectionService : 'disabled',
		});
	}

	/**
	 * @returns the full response without throwing on non-2xx.
	 */
	async requestFull(options: IHttpRequestOptions): Promise<IN8nHttpFullResponse> {
		return await this.http.request({
			...options,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});
	}

	/**
	 * Fetches an OAuth2 server's discovery metadata through the SSRF-guarded
	 * client, validates it against the caller's `schema`, and read-through caches
	 * the result.
	 */
	async fetchMetadata<T>(
		schema: z.ZodType<T>,
		{ metadataUri, cachePrefix, skipCache }: FetchMetadataParams,
	): Promise<T> {
		const cacheKey = `${cachePrefix}:metadata:${metadataUri}`;
		if (!skipCache) {
			const cached = await this.cache.get<T>(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const response = await this.requestFull({
			url: metadataUri,
			method: 'GET',
			json: true,
			timeout: REQUEST_TIMEOUT,
		});

		if (response.statusCode !== 200) {
			this.logger.error(
				`Failed to fetch OAuth2 metadata from ${metadataUri}, status code: ${response.statusCode}`,
			);
			throw new IdentifierValidationError(
				`Failed to fetch OAuth2 metadata, status code: ${response.statusCode}`,
			);
		}

		try {
			const metadata = schema.parse(response.body);
			if (!skipCache) {
				await this.cache.set(cacheKey, metadata, METADATA_CACHE_TIMEOUT);
			}
			return metadata;
		} catch (error) {
			this.logger.error('Invalid OAuth2 metadata format', { error });
			throw new IdentifierValidationError('Invalid OAuth2 metadata format', { cause: error });
		}
	}
}
