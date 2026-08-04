import { Logger } from '@n8n/backend-common';
import { OutboundHttp, SsrfProtectionService, type HttpRequestClient } from '@n8n/backend-network';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { CacheService } from '@/services/cache/cache.service';

const REQUEST_TIMEOUT = 10 * Time.seconds.toMilliseconds;
const METADATA_CACHE_TTL = 1 * Time.hours.toMilliseconds;
const CACHE_PREFIX = 'cimd:metadata';

/**
 * Client ID Metadata Document (CIMD): the OAuth client metadata a client
 * publishes at its `client_id` URL. A superset of RFC 7591 client metadata; we
 * validate only the fields we consume and keep the rest permissive.
 */
const cimdMetadataSchema = z
	.object({
		// When present it must equal the client_id URL the document was fetched
		// from; validated in fetchMetadata rather than here.
		client_id: z.string().url().optional(),
		client_name: z.string().min(1).optional(),
		redirect_uris: z.array(z.string().url()).min(1),
		grant_types: z.array(z.string()).optional(),
		response_types: z.array(z.string()).optional(),
		token_endpoint_auth_method: z.string().optional(),
		scope: z.string().optional(),
		logo_uri: z.string().url().optional(),
		client_uri: z.string().url().optional(),
	})
	.passthrough();

export type CimdMetadata = z.infer<typeof cimdMetadataSchema>;

/** Raised when a client_id URL does not resolve to a valid, matching CIMD. */
export class CimdMetadataError extends OperationalError {}

/**
 * Fetches and caches Client ID Metadata Documents.
 *
 * The `client_id` URL is client-controlled and fetched before the user has
 * authenticated the client, so the request is always routed through the SSRF
 * filter — regardless of the global `N8N_SSRF_PROTECTION_ENABLED` flag — to keep
 * a hostile `client_id` from reaching internal addresses. Self-hosters whose
 * clients publish metadata on an internal host can allow it via
 * `N8N_SSRF_ALLOWED_*`.
 */
@Service()
export class CimdMetadataHttpClient {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly logger: Logger,
		private readonly cache: CacheService,
		outboundHttp: OutboundHttp,
		ssrfProtectionService: SsrfProtectionService,
	) {
		this.http = outboundHttp.requests({
			ssrf: ssrfProtectionService,
			timeout: REQUEST_TIMEOUT,
		});
	}

	/**
	 * Fetch, validate and read-through cache the CIMD at `clientId`. Throws
	 * {@link CimdMetadataError} if the URL is unreachable, the response is not a
	 * valid metadata document, or its `client_id` disagrees with the URL.
	 */
	async fetchMetadata(clientId: string): Promise<CimdMetadata> {
		const cacheKey = `${CACHE_PREFIX}:${clientId}`;
		const cached = await this.cache.get<CimdMetadata>(cacheKey);
		if (cached) {
			return cached;
		}

		const response = await this.http.request({
			url: clientId,
			method: 'GET',
			json: true,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});

		if (response.statusCode !== 200) {
			throw new CimdMetadataError(
				`Client metadata document at ${clientId} returned status ${response.statusCode}`,
			);
		}

		let metadata: CimdMetadata;
		try {
			metadata = cimdMetadataSchema.parse(response.body);
		} catch (error) {
			throw new CimdMetadataError(`Invalid client metadata document at ${clientId}`, {
				cause: error,
			});
		}

		// The document's self-asserted client_id, when present, must be the URL it
		// was fetched from — otherwise a document could impersonate another client.
		if (metadata.client_id !== undefined && metadata.client_id !== clientId) {
			throw new CimdMetadataError(
				`Client metadata document at ${clientId} declares a mismatched client_id`,
			);
		}

		await this.cache.set(cacheKey, metadata, METADATA_CACHE_TTL);
		this.logger.debug('Resolved CIMD client', { clientId });
		return metadata;
	}
}
