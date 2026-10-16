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
	ServiceUnavailableError,
	TooManyRequestsError,
	UnexpectedError,
} from '@n8n/errors';
import { errorChain } from '@n8n/utils/errors/error-chain';
import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';
import { z } from 'zod';

import type { GitHostAccess } from './git-host.types';

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

/** The merge request fields n8n reads. GitLab returns many more. */
const mergeRequestSchema = z.object({
	iid: z.number().int(),
	project_id: z.number().int(),
	web_url: z.string().refine((value) => {
		try {
			const { protocol } = new URL(value);
			return protocol === 'http:' || protocol === 'https:';
		} catch {
			return false;
		}
	}),
	title: z.string(),
	description: z.string().nullable(),
	state: z.enum(['opened', 'locked', 'merged', 'closed']),
	source_branch: z.string(),
	target_branch: z.string(),
	has_conflicts: z.boolean().optional().default(false),
	merged_at: z.string().nullable().optional(),
	closed_at: z.string().nullable().optional(),
	detailed_merge_status: z.string().nullable().optional(),
	author: z.object({ name: z.string() }).nullable().optional(),
	diff_refs: z
		.object({ base_sha: z.string().nullable(), head_sha: z.string().nullable() })
		.nullable()
		.optional(),
});

const stringOrList = z.union([z.string(), z.array(z.string())]);

/** A string, a list of strings, or field names mapped to validation errors. */
const errorBodySchema = z.object({
	message: z.union([stringOrList, z.record(stringOrList)]),
});

const reviewIdPattern = /^(?<projectId>\d+)!(?<iid>\d+)$/;

export type GitLabMergeRequest = z.infer<typeof mergeRequestSchema>;

/** Identifies one merge request on one GitLab project. */
export type MergeRequestRef = Readonly<{ projectId: number; iid: number }>;

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

type MergeRequestInput = {
	projectPath: string;
	sourceBranch: string;
	targetBranch: string;
	title: string;
	description: string;
};

type ApiRequest = {
	method: IHttpRequestMethods;
	path: string;
	qs?: IDataObject;
	body?: IDataObject;
};

type TransportFailure = {
	code: string;
	error: BadRequestError | ServiceUnavailableError;
};

/** Opens GitLab merge requests. GitLab records each write as the token's bot user. */
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
		return this.parse(mergeRequestSchema, body);
	}

	private parse<S extends z.ZodTypeAny>(schema: S, body: unknown): z.output<S> {
		const parsed = schema.safeParse(body);
		if (parsed.success) return parsed.data;
		this.logger.warn('GitLab merge request response did not match the expected shape', {
			issues: parsed.error.issues.map(({ path }) => path.join('.')),
		});
		throw new UnexpectedError('GitLab returned an unexpected merge request response.');
	}

	private async request(
		access: GitHostAccess,
		{ method, path, qs, body }: ApiRequest,
	): Promise<TypedHttpFullResponse<unknown>> {
		let response: TypedHttpFullResponse<unknown>;
		try {
			response = await this.http.request<unknown>({
				method,
				url: apiUrl(access.baseUrl, path),
				qs,
				body,
				headers: { 'PRIVATE-TOKEN': access.accessToken },
				json: true,
				timeout: requestTimeoutMs,
				maxResponseBodyBytes,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				// A redirect must not forward the token to another host.
				disableFollowRedirect: true,
			});
		} catch (error) {
			const failure = classifyTransportError(error);
			// Request errors can carry the token. Log the code, not the message.
			this.logger.warn(`GitLab merge request call failed before a response (${failure.code})`, {
				method,
				path,
			});
			throw failure.error;
		}

		if (response.statusCode >= 200 && response.statusCode < 300) return response;

		this.logger.warn('GitLab merge request call failed', {
			method,
			path,
			status: response.statusCode,
		});
		throw statusError(response.statusCode, response.body);
	}
}

/** Keeps a subpath in the base URL, such as `https://example.com/gitlab`. */
const apiUrl = (baseUrl: string, path: string) =>
	new URL(`api/v4/${path}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();

const classifyTransportError = (error: unknown): TransportFailure => {
	const chain = errorChain(error);
	if (
		chain.some(
			(cause) => cause instanceof SsrfBlockedIpError || cause instanceof SsrfBlockedHostnameError,
		)
	) {
		return {
			code: 'BLOCKED',
			error: new BadRequestError(
				'The instance network policy blocks this GitLab URL. Ask an administrator to allow the GitLab hostname or IP address.',
			),
		};
	}
	const codes = chain.flatMap(({ code }) => (typeof code === 'string' ? [code] : []));
	const code =
		codes.find((value) => tlsErrorCodes.has(value)) ??
		codes.find((value) => knownErrorCodes.has(value)) ??
		'UNKNOWN';
	return { code, error: transportError(code) };
};

const transportError = (code: string) => {
	if (tlsErrorCodes.has(code)) {
		return new BadRequestError(
			'Could not verify the GitLab certificate. Check the certificate and configure a trusted certificate authority on the n8n server.',
		);
	}
	if (code === 'ERR_RESPONSE_TOO_LARGE') {
		return new BadRequestError('GitLab returned a response that is too large.');
	}
	if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
		return new ServiceUnavailableError(
			'The GitLab request timed out. Check that GitLab is available and try again.',
		);
	}
	if (code === 'ENOTFOUND') {
		return new BadRequestError(
			'Could not resolve the GitLab hostname. Check the GitLab URL and the n8n server DNS settings.',
		);
	}
	return new ServiceUnavailableError(
		'Could not reach GitLab. Check that GitLab is available and try again.',
	);
};

const statusError = (status: number, body: unknown) => {
	if (status >= 300 && status < 400) {
		return new BadRequestError('GitLab redirected the request. Use the final GitLab URL.');
	}
	// A GitLab 401 or 403 stays a 400, so it does not look like an n8n session failure.
	switch (status) {
		case 401:
			return new BadRequestError(
				'GitLab rejected the access token for this action. The token needs the api scope and the Developer role or higher.',
			);
		case 403:
			return new BadRequestError(
				'The access token may not perform this merge request action. Check the token scopes and role.',
			);
		case 404:
			return new BadRequestError('GitLab could not find the project or merge request.');
		case 408:
			return new ServiceUnavailableError(
				'The GitLab request timed out. Check that GitLab is available and try again.',
			);
		case 409:
			return new ConflictError(
				gitlabDetail(body) ??
					'The merge request changed on GitLab. Reload the review and try again.',
			);
		case 429:
			return new TooManyRequestsError(
				gitlabDetail(body) ?? 'GitLab is limiting requests. Try again later.',
			);
		default:
			if (status >= 500) {
				return new ServiceUnavailableError(
					gitlabDetail(body) ?? 'GitLab is not available. Try again later.',
				);
			}
			return new BadRequestError(
				gitlabDetail(body) ?? `GitLab answered with an unexpected status: ${status}`,
			);
	}
};

const textList = (value: string | string[]) =>
	(Array.isArray(value) ? value : [value]).filter(Boolean);

/** Returns the GitLab `message` text, or undefined when the body has none. */
const gitlabDetail = (body: unknown) => {
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
};
