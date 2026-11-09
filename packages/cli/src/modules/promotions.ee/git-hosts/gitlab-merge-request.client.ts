import { Logger } from '@n8n/backend-common';
import {
	OutboundHttp,
	SsrfBlockedHostnameError,
	SsrfBlockedIpError,
	type HttpRequestClient,
	type TypedHttpFullResponse,
} from '@n8n/backend-network';
import { Service } from '@n8n/di';
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
	ServiceUnavailableError,
	TooManyRequestsError,
	UnexpectedError,
} from '@n8n/errors';
import { errorChain } from '@n8n/utils/errors/error-chain';
import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';
import { z } from 'zod';

import type { GitHostAccess } from './git-host.types';
import {
	mergeRequestSchema,
	type GitLabMergeRequest,
	type MergeRequestInput,
	type MergeRequestRef,
} from './gitlab-merge-request.types';

const requestTimeoutMs = 15_000;
const maxResponseBodyBytes = 1024 * 1024;
/** GitLab rejects a longer merge request title. */
const mergeRequestTitleMaxLength = 255;

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

const stringOrList = z.union([z.string(), z.array(z.string())]);
const errorBodySchema = z.object({
	message: z.union([stringOrList, z.record(stringOrList)]),
});

const reviewIdPattern = /^(?<projectId>\d+)!(?<iid>\d+)$/;

type ApiRequest = {
	method: IHttpRequestMethods;
	path: string;
	qs?: IDataObject;
	body?: IDataObject;
	timeoutMs?: number;
};

/** Stores one merge request as `<projectId>!<iid>`. The id stays valid after a rename. */
export const toGitLabReviewId = ({ projectId, iid }: MergeRequestRef) => `${projectId}!${iid}`;

/** Rejects an id that does not name a GitLab merge request. */
export const parseGitLabReviewId = (remoteReviewId: string): MergeRequestRef => {
	const groups = reviewIdPattern.exec(remoteReviewId)?.groups;
	if (!groups) {
		throw new BadRequestError('This promotion review does not reference a GitLab merge request.');
	}
	return { projectId: Number(groups.projectId), iid: Number(groups.iid) };
};

/**
 * The ref that holds the merge request head. It outlives the source branch, but GitLab deletes it
 * 14 days after the merge request closes or merges.
 */
export const gitLabReviewHeadRef = ({ iid }: MergeRequestRef) => `refs/merge-requests/${iid}/head`;

/** Opens, reads, and merges GitLab merge requests. GitLab records each write as the token's user. */
@Service()
export class GitLabMergeRequestClient {
	private readonly http: HttpRequestClient;

	constructor(
		outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		this.http = outboundHttp.requests();
		this.logger = this.logger.scoped('promotions');
	}

	/** Opens one merge request. The project is the path from the remote URL. */
	async createMergeRequest(
		access: GitHostAccess,
		{ projectPath, sourceBranch, targetBranch, title, description }: MergeRequestInput,
	): Promise<GitLabMergeRequest> {
		const { body } = await this.request(access, {
			method: 'POST',
			path: `projects/${encodeURIComponent(projectPath)}/merge_requests`,
			body: {
				source_branch: sourceBranch,
				target_branch: targetBranch,
				title: title.slice(0, mergeRequestTitleMaxLength),
				description,
				// Keep the source branch until the connection can choose this.
				remove_source_branch: false,
			},
		});
		return this.parse(body);
	}

	async getMergeRequest(
		access: GitHostAccess,
		{ projectId, iid }: MergeRequestRef,
		{ timeoutMs }: { timeoutMs?: number } = {},
	): Promise<GitLabMergeRequest> {
		const { body } = await this.request(access, {
			method: 'GET',
			path: `projects/${projectId}/merge_requests/${iid}`,
			timeoutMs,
		});
		return this.parse(body);
	}

	/** GitLab answers 409 when the head is no longer `sha`. */
	async approve(access: GitHostAccess, { projectId, iid }: MergeRequestRef, sha: string) {
		await this.request(access, {
			method: 'POST',
			path: `projects/${projectId}/merge_requests/${iid}/approve`,
			body: { sha },
		});
	}

	/** Merges only the head `sha`, then deletes the source branch. */
	async merge(
		access: GitHostAccess,
		{ projectId, iid }: MergeRequestRef,
		sha: string,
	): Promise<GitLabMergeRequest> {
		const { body } = await this.request(access, {
			method: 'PUT',
			path: `projects/${projectId}/merge_requests/${iid}/merge`,
			body: { sha, should_remove_source_branch: true },
		});
		return this.parse(body);
	}

	async createNote(access: GitHostAccess, { projectId, iid }: MergeRequestRef, body: string) {
		await this.request(access, {
			method: 'POST',
			path: `projects/${projectId}/merge_requests/${iid}/notes`,
			body: { body },
		});
	}

	private parse(body: unknown): GitLabMergeRequest {
		const parsed = mergeRequestSchema.safeParse(body);
		if (parsed.success) return parsed.data;
		this.logger.warn('GitLab merge request response did not match the expected shape', {
			issues: parsed.error.issues.map(({ path }) => path.join('.')),
		});
		throw new UnexpectedError('GitLab returned an unexpected merge request response.');
	}

	private async request(
		access: GitHostAccess,
		{ method, path, qs, body, timeoutMs }: ApiRequest,
	): Promise<TypedHttpFullResponse<unknown>> {
		let response: TypedHttpFullResponse<unknown>;
		try {
			response = await this.http.request<unknown>({
				method,
				url: new URL(
					`api/v4/${path}`,
					access.baseUrl.endsWith('/') ? access.baseUrl : `${access.baseUrl}/`,
				).toString(),
				qs,
				body,
				headers: { 'PRIVATE-TOKEN': access.accessToken },
				json: true,
				timeout: timeoutMs ?? requestTimeoutMs,
				maxResponseBodyBytes,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				// A redirect must not forward the token to another host.
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
				this.logger.warn('GitLab merge request call blocked by instance network policy', {
					method,
					path,
				});
				throw new BadRequestError(
					'The instance network policy blocks this GitLab URL. Ask an administrator to allow the GitLab hostname or IP address.',
				);
			}
			const codes = chain.flatMap(({ code }) => (typeof code === 'string' ? [code] : []));
			const code =
				codes.find((value) => tlsErrorCodes.has(value)) ??
				codes.find((value) => knownErrorCodes.has(value)) ??
				'UNKNOWN';
			// Request errors can carry the token. Log the code, not the message.
			this.logger.warn(`GitLab merge request call failed before a response (${code})`, {
				method,
				path,
			});
			if (code === 'ERR_RESPONSE_TOO_LARGE') {
				throw new BadRequestError('GitLab returned a response that is too large.');
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
			throw new ServiceUnavailableError(
				'Could not reach GitLab. Check that GitLab is available and try again.',
			);
		}

		if (response.statusCode >= 200 && response.statusCode < 300) return response;

		this.logger.warn('GitLab merge request call failed', {
			method,
			path,
			status: response.statusCode,
		});
		throw statusError(response.statusCode, response.body, path);
	}
}

function statusError(status: number, body: unknown, path: string) {
	if (status >= 300 && status < 400) {
		return new BadRequestError('GitLab redirected the request. Use the final GitLab URL.');
	}
	// A GitLab 401 or 403 stays a 400, so it does not look like an n8n session failure.
	if (status === 401 || status === 403) {
		// Protected branches allow only Maintainers to merge by default.
		return new BadRequestError(
			path.endsWith('/merge')
				? 'The access token may not merge this merge request. The token needs the `api` scope and the Maintainer role or higher.'
				: 'The access token may not perform this merge request action. The token needs the `api` scope and the Developer role or higher.',
		);
	}
	if (status === 404) {
		return new NotFoundError('GitLab could not find the project or merge request.');
	}
	// The merge call answers 405 when GitLab cannot merge now. The body gives no reason.
	if (status === 405) {
		return new BadRequestError(
			"GitLab can't merge this merge request now. Check its merge checks on GitLab, such as a required pipeline.",
		);
	}
	if (status === 408) {
		return new ServiceUnavailableError(
			'The GitLab request timed out. Check that GitLab is available and try again.',
		);
	}
	if (status === 409) {
		return new ConflictError(
			gitlabDetail(body) ?? 'The merge request changed on GitLab. Reload the review and try again.',
		);
	}
	if (status === 429) {
		return new TooManyRequestsError(
			gitlabDetail(body) ?? 'GitLab is limiting requests. Try again later.',
		);
	}
	if (status >= 500) {
		return new ServiceUnavailableError(
			gitlabDetail(body) ?? 'GitLab is not available. Try again later.',
		);
	}
	return new BadRequestError(
		gitlabDetail(body) ?? `GitLab answered with an unexpected status: ${status}`,
	);
}

const textList = (value: string | string[]) =>
	(Array.isArray(value) ? value : [value]).filter(Boolean);

function gitlabDetail(body: unknown) {
	const parsed = errorBodySchema.safeParse(body);
	if (!parsed.success) return undefined;
	const { message } = parsed.data;
	const text =
		typeof message === 'string' || Array.isArray(message)
			? textList(message).join(' ')
			: Object.entries(message)
					.flatMap(([field, errors]) => {
						const text = textList(errors).join(', ');
						return text ? [`${field}: ${text}`] : [];
					})
					.join('; ');
	return text ? `GitLab: ${text}` : undefined;
}
