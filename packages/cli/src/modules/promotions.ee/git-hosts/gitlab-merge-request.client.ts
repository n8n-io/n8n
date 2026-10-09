import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { errorChain } from '@n8n/utils/errors/error-chain';
import type { IDataObject, IHttpRequestMethods, IN8nHttpFullResponse } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError, ConflictError, ServiceUnavailableError } from '@n8n/errors';

const REQUEST_TIMEOUT_MS = 15_000;
/** GitLab rejects a longer merge request title. */
export const MERGE_REQUEST_TITLE_MAX_LENGTH = 255;
/** The largest page GitLab serves. */
const MAX_PAGE_SIZE = 100;

/**
 * API access to one Git host. Same shape as the provider's host access in
 * LIGO-1063; once that lands, this becomes an import from `git-host.types`.
 */
export type GitHostAccess = Readonly<{
	baseUrl: string;
	username: string;
	accessToken: string;
}>;

/** The merge request fields n8n reads. GitLab returns many more. */
const mergeRequestSchema = z.object({
	iid: z.number().int(),
	project_id: z.number().int(),
	web_url: z.string(),
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

export type GitLabMergeRequest = z.infer<typeof mergeRequestSchema>;

/** Identifies one merge request on one GitLab project. */
export type MergeRequestRef = Readonly<{ projectId: number; iid: number }>;

const REVIEW_ID_PATTERN = /^gitlab:(?<projectId>\d+)!(?<iid>\d+)$/;

/**
 * Encodes a merge request as the opaque `remoteReviewId` stored on a Promotion
 * Review: `gitlab:<projectId>!<iid>`. The numeric project id is stable across
 * repository renames. The prefix tells the GitLab client apart from later hosts.
 */
export const toGitLabReviewId = ({ projectId, iid }: MergeRequestRef) =>
	`gitlab:${projectId}!${iid}`;

/** Inverse of {@link toGitLabReviewId}. Throws when the id belongs to another host. */
export const parseGitLabReviewId = (remoteReviewId: string): MergeRequestRef => {
	const groups = REVIEW_ID_PATTERN.exec(remoteReviewId)?.groups;
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
	arrayFormat?: 'brackets';
	body?: IDataObject;
};

type ApiResponse = Omit<IN8nHttpFullResponse, 'body'> & { body: unknown };

/**
 * Opens and reads merge requests through the GitLab REST API (v4) with the
 * provider's group access token. Every write happens as the token's bot user.
 */
@Service()
export class GitLabMergeRequestClient {
	private readonly http: HttpRequestClient;

	constructor(
		outboundHttp: OutboundHttp,
		private readonly logger: Logger,
	) {
		// An admin sets the base URL, and a self-hosted GitLab often runs on an internal network.
		this.http = outboundHttp.requests({ useDefaultSsrfPolicy: 'unsafe' });
		this.logger = this.logger.scoped('promotions');
	}

	/**
	 * Opens the merge request for one promotion branch. The project is addressed by
	 * its path, because the connection only stores the remote URL.
	 */
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
				title,
				description,
				remove_source_branch: true,
			},
		});
		return this.parseMergeRequest(body);
	}

	async getMergeRequest(
		access: GitHostAccess,
		{ projectId, iid }: MergeRequestRef,
	): Promise<GitLabMergeRequest> {
		const { body } = await this.request(access, {
			method: 'GET',
			path: `projects/${projectId}/merge_requests/${iid}`,
		});
		return this.parseMergeRequest(body);
	}

	/**
	 * Reads several merge requests of one project, one call per page of iids.
	 * Missing iids are left out.
	 */
	async listMergeRequests(
		access: GitHostAccess,
		projectId: number,
		iids: number[],
	): Promise<GitLabMergeRequest[]> {
		const mergeRequests: GitLabMergeRequest[] = [];
		for (const page of pages(iids)) {
			// GitLab reads `iids[]=1&iids[]=2`. The default serializer writes
			// `iids[][0]=1`, which GitLab answers with an empty list.
			const { body } = await this.request(access, {
				method: 'GET',
				path: `projects/${projectId}/merge_requests`,
				qs: { iids: page, per_page: page.length, state: 'all' },
				arrayFormat: 'brackets',
			});
			const parsed = z.array(mergeRequestSchema).safeParse(body);
			if (!parsed.success) throw unexpectedResponseError();
			mergeRequests.push(...parsed.data);
		}
		return mergeRequests;
	}

	private parseMergeRequest(body: unknown): GitLabMergeRequest {
		const parsed = mergeRequestSchema.safeParse(body);
		if (!parsed.success) {
			this.logger.warn('GitLab merge request response did not match the expected shape', {
				issues: parsed.error.issues.map(({ path }) => path.join('.')),
			});
			throw unexpectedResponseError();
		}
		return parsed.data;
	}

	private async request(
		access: GitHostAccess,
		{ method, path, qs, arrayFormat, body }: ApiRequest,
	): Promise<ApiResponse> {
		const response = await this.http
			.request<unknown>({
				method,
				url: apiUrl(access.baseUrl, path),
				qs,
				arrayFormat,
				body,
				headers: { 'PRIVATE-TOKEN': access.accessToken },
				json: true,
				timeout: REQUEST_TIMEOUT_MS,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				// A redirect must not forward the token to another host.
				disableFollowRedirect: true,
			})
			.catch((error: unknown) => {
				const code = errorChain(error).find(({ code }) => typeof code === 'string')?.code;
				// Request errors can carry tokens. Do not log their headers or messages.
				this.logger.warn(
					`GitLab merge request call failed before a response (${String(code ?? 'UNKNOWN')})`,
					{ method, path },
				);
				throw new ServiceUnavailableError(
					'Could not reach GitLab. Check that GitLab is available and try again.',
				);
			});

		const { statusCode } = response;
		if (statusCode >= 200 && statusCode < 300) return response;

		this.logger.warn('GitLab merge request call failed', { method, path, status: statusCode });
		throw statusError(statusCode, response.body);
	}
}

const pages = <T>(items: T[]) =>
	Array.from({ length: Math.ceil(items.length / MAX_PAGE_SIZE) }, (_, index) =>
		items.slice(index * MAX_PAGE_SIZE, (index + 1) * MAX_PAGE_SIZE),
	);

/** Keeps a subpath in the base URL, such as `https://example.com/gitlab`. */
const apiUrl = (baseUrl: string, path: string) =>
	new URL(`api/v4/${path}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();

const unexpectedResponseError = () =>
	new BadRequestError('GitLab returned an unexpected merge request response.');

const statusError = (status: number, responseBody: unknown) => {
	const detail = gitlabMessage(responseBody);
	if (status >= 300 && status < 400) {
		return new BadRequestError('GitLab redirected the request. Use the final GitLab URL.');
	}
	if (status === 401) {
		return new BadRequestError(
			'GitLab rejected the access token for this action. The token needs the api scope and the Developer role or higher.',
		);
	}
	if (status === 403) {
		return new BadRequestError(
			'The access token may not perform this merge request action. Check the token scopes and role.',
		);
	}
	if (status === 404) {
		return new BadRequestError('GitLab could not find the project or merge request.');
	}
	// GitLab answers 409 when a merge request for the branch already exists.
	if (status === 409) {
		return new ConflictError(
			detail ?? 'The merge request changed on GitLab. Reload the review and try again.',
		);
	}
	if (status === 429 || status >= 500) {
		return new ServiceUnavailableError('GitLab is not available. Try again later.');
	}
	return new BadRequestError(detail ?? `GitLab answered with an unexpected status: ${status}`);
};

const errorBodySchema = z.object({ message: z.union([z.string(), z.array(z.string())]) });

/** GitLab error bodies carry `message` as a string or a list of strings. */
const gitlabMessage = (body: unknown) => {
	const parsed = errorBodySchema.safeParse(body);
	if (!parsed.success) return undefined;
	const message = [parsed.data.message].flat().join(' ');
	return message ? `GitLab: ${message}` : undefined;
};
