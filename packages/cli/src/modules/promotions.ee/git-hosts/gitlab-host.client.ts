import { promotionGitHostBaseUrlSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	OutboundHttp,
	retryabilityFromError,
	type HttpRequestClient,
	type TypedHttpFullResponse,
} from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { errorChain } from '@n8n/utils/errors/error-chain';
import { sleep } from '@n8n/utils/sleep';
import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';

import type {
	GitHostAccess,
	GitHostClient,
	GitHostRepositoryPage,
	GitHostRepositoryQuery,
} from './git-host.types';

const REQUEST_TIMEOUT_MS = 15_000;
const REQUEST_RETRY_DELAY_MS = 200;
const RETRYABLE_ERROR_CODES = new Set([
	'ECONNABORTED',
	'ECONNREFUSED',
	'ECONNRESET',
	'EAI_AGAIN',
	'ETIMEDOUT',
]);
const TLS_ERROR_CODES = new Set([
	'CERT_HAS_EXPIRED',
	'DEPTH_ZERO_SELF_SIGNED_CERT',
	'ERR_TLS_CERT_ALTNAME_INVALID',
	'SELF_SIGNED_CERT_IN_CHAIN',
	'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
	'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);
const KNOWN_ERROR_CODES = new Set([...RETRYABLE_ERROR_CODES, ...TLS_ERROR_CODES, 'ENOTFOUND']);

const projectsSchema = z.array(
	z.object({
		id: z.number(),
		path_with_namespace: z.string(),
		http_url_to_repo: promotionGitHostBaseUrlSchema,
	}),
);

/**
 * Reads the GitLab REST API (v4) with a group access token. The token's bot user is
 * a member of the group, so a `membership` query lists the group's projects,
 * subgroups included.
 */
@Service()
export class GitLabHostClient implements GitHostClient {
	private readonly http: HttpRequestClient;

	constructor(
		outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		// An admin sets the base URL, and a self-hosted GitLab often runs on an internal network.
		this.http = outboundHttp.requests({ useDefaultSsrfPolicy: 'unsafe' });
	}

	async validateAccess(access: GitHostAccess): Promise<void> {
		const { body } = await this.get(access, 'user', {});
		if (!z.object({ id: z.number() }).safeParse(body).success) {
			throw new BadRequestError('GitLab returned an unexpected response. Check the GitLab URL.');
		}
		// A user lookup proves authentication. Listing also checks API read access.
		await this.listRepositories(access, { offset: 0, limit: 1 });
	}

	async listRepositories(
		access: GitHostAccess,
		{ search, offset, limit }: GitHostRepositoryQuery,
	): Promise<GitHostRepositoryPage> {
		const { body, headers } = await this.get(access, 'projects', {
			membership: true,
			simple: true,
			archived: false,
			order_by: 'last_activity_at',
			sort: 'desc',
			per_page: limit,
			page: offset / limit + 1,
			...(search && { search, search_namespaces: true }),
		});

		const projects = projectsSchema.safeParse(body);
		if (!projects.success) {
			throw new BadRequestError('GitLab returned an unexpected response. Check the base URL.');
		}

		return {
			repositories: projects.data.map((project) => ({
				id: String(project.id),
				fullPath: project.path_with_namespace,
				remoteUrl: project.http_url_to_repo,
			})),
			// GitLab leaves this header empty on the last page.
			hasNextPage: Boolean(headers['x-next-page']),
		};
	}

	private async get(
		access: GitHostAccess,
		path: string,
		qs: IDataObject,
		attempt = 0,
	): Promise<TypedHttpFullResponse<unknown>> {
		const { baseUrl, accessToken } = access;
		let response;
		try {
			response = await this.http.request<unknown>({
				method: 'GET',
				url: apiUrl(baseUrl, path),
				qs,
				headers: { 'PRIVATE-TOKEN': accessToken },
				json: true,
				timeout: REQUEST_TIMEOUT_MS,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				// A redirect must not forward the token to another host.
				disableFollowRedirect: true,
			});
		} catch (error) {
			const codes = errorChain(error).flatMap(({ code }) =>
				typeof code === 'string' ? [code] : [],
			);
			const code =
				codes.find((value) => TLS_ERROR_CODES.has(value)) ??
				codes.find((value) => KNOWN_ERROR_CODES.has(value)) ??
				'UNKNOWN';
			// These calls only read data. Retry one transient failure without retrying credentials or certificates.
			if (
				attempt === 0 &&
				code !== 'ENOTFOUND' &&
				!TLS_ERROR_CODES.has(code) &&
				retryabilityFromError(error).retryable === 'yes'
			) {
				this.logger.debug(`Retrying GitLab request after ${code}`, { path });
				await sleep(REQUEST_RETRY_DELAY_MS);
				return await this.get(access, path, qs, 1);
			}
			// Request errors can carry tokens. Do not log their headers or messages.
			this.logger.warn(`GitLab request failed before a response (${code})`, { path });
			if (TLS_ERROR_CODES.has(code)) {
				throw new BadRequestError(
					'Could not verify the GitLab certificate. Check the certificate and configure a trusted certificate authority on the n8n server.',
				);
			}
			if (['ETIMEDOUT', 'ECONNABORTED'].includes(code)) {
				throw new ServiceUnavailableError(
					'The GitLab request timed out. Check that GitLab is available and try again.',
				);
			}
			if (code === 'ENOTFOUND') {
				throw new BadRequestError(
					'Could not resolve the GitLab hostname. Check the GitLab URL and the n8n server DNS settings.',
				);
			}
			if (code === 'UNKNOWN') {
				throw new ServiceUnavailableError(
					'Could not complete the GitLab API request. Try again. If it keeps failing, check the n8n server logs.',
				);
			}
			throw new ServiceUnavailableError(
				'Could not reach GitLab at the base URL. Check the URL and try again.',
			);
		}

		if (response.statusCode >= 200 && response.statusCode < 300) return response;

		this.logger.warn('GitLab request failed', { path, status: response.statusCode });
		throw statusError(response.statusCode);
	}
}

/** Keeps a subpath in the base URL, such as `https://example.com/gitlab`. */
function apiUrl(baseUrl: string, path: string) {
	return new URL(`api/v4/${path}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function statusError(status: number) {
	if (status >= 300 && status < 400) {
		return new BadRequestError('GitLab redirected the request. Use the final GitLab URL.');
	}
	if (status === 401) {
		return new BadRequestError(
			'GitLab rejected the access token. Update the provider with a valid token.',
		);
	}
	if (status === 403) {
		return new BadRequestError(
			'The access token cannot read the GitLab API. Use a token with the read_api scope.',
		);
	}
	if (status === 404) {
		return new BadRequestError('No GitLab API was found at the base URL. Check the URL.');
	}
	if (status === 429 || status >= 500) {
		return new ServiceUnavailableError('GitLab is not available. Try again later.');
	}
	return new BadRequestError(`GitLab answered with an unexpected status: ${status}`);
}
