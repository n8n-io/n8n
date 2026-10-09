import {
	promotionGitHostBaseUrlSchema,
	type PromotionBranch,
	type PromotionRepository,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	OutboundHttp,
	SsrfBlockedHostnameError,
	SsrfBlockedIpError,
	retryabilityFromError,
	type HttpRequestClient,
	type TypedHttpFullResponse,
} from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { errorChain } from '@n8n/utils/errors/error-chain';
import { sleep } from '@n8n/utils/sleep';
import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError, NotFoundError, ServiceUnavailableError } from '@n8n/errors';

import type {
	GitHostAccess,
	GitHostClient,
	GitHostDiscoveryQuery,
	GitHostPage,
} from './git-host.types';

const requestTimeoutMs = 15_000;
const retryDelayMs = 200;
const maxRetryDelayMs = 1_000;
const maxResponseBodyBytes = 1024 * 1024;
const discoveryResponseSizeErrorMessage =
	'The results are too large to load. Start again with fewer items.';
const tlsErrorCodes = new Set([
	'CERT_HAS_EXPIRED',
	'DEPTH_ZERO_SELF_SIGNED_CERT',
	'ERR_TLS_CERT_ALTNAME_INVALID',
	'SELF_SIGNED_CERT_IN_CHAIN',
	'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
	'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);
const knownErrorCodes = new Set([
	...tlsErrorCodes,
	'ECONNABORTED',
	'ECONNREFUSED',
	'ECONNRESET',
	'EAI_AGAIN',
	'ETIMEDOUT',
	'EHOSTUNREACH',
	'ENETDOWN',
	'ENETUNREACH',
	'EPIPE',
	'ENOTFOUND',
	'ERR_RESPONSE_TOO_LARGE',
]);
const identitySchema = z.object({ id: z.number().int().positive() });
const projectSchema = identitySchema.extend({
	name: z.string().min(1),
	path_with_namespace: z.string().min(1),
	http_url_to_repo: promotionGitHostBaseUrlSchema,
	default_branch: z.string().nullable().default(null),
});
const branchSchema = z.object({ name: z.string().min(1), default: z.boolean() });

@Service()
export class GitLabHostClient implements GitHostClient {
	private readonly http: HttpRequestClient;

	constructor(
		outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		this.http = outboundHttp.requests();
	}

	async validateAccess(access: GitHostAccess): Promise<void> {
		const user = await this.get(access, 'user', {});
		if (!identitySchema.safeParse(user.body).success) throw unexpectedResponse();
		// /user checks auth, but not read_api access.
		const projects = await this.get(access, 'projects', {
			membership: true,
			simple: true,
			per_page: 1,
			page: 1,
		});
		if (!z.array(identitySchema).safeParse(projects.body).success) throw unexpectedResponse();
	}

	async listRepositories(
		access: GitHostAccess,
		{ offset, limit, search }: GitHostDiscoveryQuery,
	): Promise<GitHostPage<PromotionRepository>> {
		const response = await this.get(
			access,
			'projects',
			{
				simple: true,
				order_by: 'id',
				sort: 'asc',
				per_page: limit,
				page: offset / limit + 1,
				...(search && { search, search_namespaces: true }),
			},
			discoveryResponseSizeErrorMessage,
		);
		const projects = z.array(projectSchema).max(limit).safeParse(response.body);
		if (!projects.success) throw unexpectedResponse();
		return {
			data: projects.data.map((project) => ({
				id: String(project.id),
				name: project.name,
				fullPath: project.path_with_namespace,
				remoteUrl: project.http_url_to_repo,
				defaultBranch: project.default_branch,
			})),
			hasNextPage: hasNextPage(response, offset, limit, projects.data.length),
		};
	}

	async listBranches(
		access: GitHostAccess,
		repositoryId: string,
		{ offset, limit, search }: GitHostDiscoveryQuery,
	): Promise<GitHostPage<PromotionBranch>> {
		const response = await this.get(
			access,
			`projects/${encodeURIComponent(repositoryId)}/repository/branches`,
			{
				per_page: limit,
				page: offset / limit + 1,
				...(search && { search }),
			},
			discoveryResponseSizeErrorMessage,
		);
		const branches = z.array(branchSchema).max(limit).safeParse(response.body);
		if (!branches.success) throw unexpectedResponse();
		return {
			data: branches.data.map((branch) => ({ name: branch.name, isDefault: branch.default })),
			hasNextPage: hasNextPage(response, offset, limit, branches.data.length),
		};
	}

	private async get(
		access: GitHostAccess,
		path: string,
		qs: IDataObject,
		responseSizeErrorMessage = 'GitLab returned a response that is too large. Check the GitLab URL.',
		attempt = 0,
	): Promise<TypedHttpFullResponse<unknown>> {
		let response;
		try {
			response = await this.http.request<unknown>({
				method: 'GET',
				url: new URL(
					`api/v4/${path}`,
					access.baseUrl.endsWith('/') ? access.baseUrl : `${access.baseUrl}/`,
				).toString(),
				qs,
				headers: { 'PRIVATE-TOKEN': access.accessToken },
				json: true,
				timeout: requestTimeoutMs,
				maxResponseBodyBytes,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				// Never forward the token through redirects.
				disableFollowRedirect: true,
			});
		} catch (error) {
			const chain = errorChain(error);
			if (
				chain.some(
					(cause) =>
						cause instanceof SsrfBlockedIpError || cause instanceof SsrfBlockedHostnameError,
				)
			) {
				this.logger.warn('GitLab request blocked by instance network policy', { path });
				throw new BadRequestError(
					'The instance network policy blocks this GitLab URL. Ask an administrator to allow the GitLab hostname or IP address.',
				);
			}
			const codes = chain.flatMap(({ code }) => (typeof code === 'string' ? [code] : []));
			const code =
				codes.find((value) => tlsErrorCodes.has(value)) ??
				codes.find((value) => knownErrorCodes.has(value)) ??
				'UNKNOWN';
			if (
				attempt === 0 &&
				code !== 'ENOTFOUND' &&
				!tlsErrorCodes.has(code) &&
				retryabilityFromError(error).retryable === 'yes'
			) {
				await sleep(retryDelayMs);
				return await this.get(access, path, qs, responseSizeErrorMessage, 1);
			}
			// Request errors can contain the token.
			this.logger.warn(`GitLab request failed before a response (${code})`, { path });
			if (code === 'ERR_RESPONSE_TOO_LARGE') {
				throw new BadRequestError(responseSizeErrorMessage);
			}
			if (tlsErrorCodes.has(code)) {
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
		const { retryable, retryAfterMs } = retryabilityFromError(response);
		const delayMs = retryAfterMs ?? retryDelayMs;
		// Do not retry early or keep validation open for a long server-requested wait.
		if (attempt === 0 && retryable === 'yes' && delayMs <= maxRetryDelayMs) {
			await sleep(delayMs);
			return await this.get(access, path, qs, responseSizeErrorMessage, 1);
		}
		this.logger.warn('GitLab request failed', { path, status: response.statusCode });
		throw statusError(response.statusCode, path);
	}
}

function unexpectedResponse() {
	return new BadRequestError('GitLab returned an unexpected response. Check the GitLab URL.');
}

function hasNextPage(
	response: TypedHttpFullResponse<unknown>,
	offset: number,
	limit: number,
	length: number,
) {
	const nextPage = response.headers['x-next-page'];
	// Some proxies omit pagination headers. A full page can still have a successor.
	if (nextPage === undefined) return length === limit;
	if (nextPage === '' || nextPage === '0') return false;
	if (typeof nextPage !== 'string' || !/^\d+$/.test(nextPage)) throw unexpectedResponse();
	if (Number(nextPage) !== offset / limit + 2) throw unexpectedResponse();
	return true;
}

function statusError(status: number, path: string) {
	if (status === 408)
		return new ServiceUnavailableError(
			'The GitLab request timed out. Check that GitLab is available and try again.',
		);
	if (status >= 300 && status < 400)
		return new BadRequestError('GitLab redirected the request. Use the final GitLab URL.');
	if (status === 401)
		return new BadRequestError(
			'GitLab rejected the access token. Update the provider with a valid token.',
		);
	if (status === 403 && path.startsWith('projects/'))
		return new BadRequestError(
			"The token can't read this GitLab repository. Check its read_api scope and repository access.",
		);
	if (status === 403)
		return new BadRequestError(
			'The access token cannot read the GitLab API. Use a token with the read_api scope.',
		);
	if (status === 404 && path.startsWith('projects/'))
		return new NotFoundError(
			'GitLab repository not found. Check that the token can access this repository.',
		);
	if (status === 404)
		return new BadRequestError('No GitLab API was found at the base URL. Check the URL.');
	if (status === 429 || status >= 500)
		return new ServiceUnavailableError('GitLab is not available. Try again later.');
	return new BadRequestError(
		`GitLab returned status ${status}. Check the provider settings and try again.`,
	);
}
