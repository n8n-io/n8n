import { Logger } from '@n8n/backend-common';
import {
	OutboundHttp,
	type HttpRequestClient,
	type TypedHttpFullResponse,
} from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { errorChain } from '@n8n/utils/errors/error-chain';
import type { IDataObject, IHttpRequestMethods } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError, ConflictError, ServiceUnavailableError } from '@n8n/errors';

import type { GitHostAccess } from './git-host.types';

const REQUEST_TIMEOUT_MS = 15_000;

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

const REVIEW_ID_PREFIX = 'gitlab:';
const REVIEW_ID_PATTERN = /^gitlab:(\d+)!(\d+)$/;

/**
 * Encodes a merge request as the opaque `remoteReviewId` stored on a Promotion
 * Review: `gitlab:<projectId>!<iid>`. The numeric project id is stable across
 * repository renames. The prefix tells the GitLab client apart from later hosts.
 */
export function toGitLabReviewId(ref: MergeRequestRef): string {
	return `${REVIEW_ID_PREFIX}${ref.projectId}!${ref.iid}`;
}

/** Inverse of {@link toGitLabReviewId}. Throws when the id belongs to another host. */
export function parseGitLabReviewId(remoteReviewId: string): MergeRequestRef {
	const match = REVIEW_ID_PATTERN.exec(remoteReviewId);
	if (!match) {
		throw new BadRequestError('This promotion review does not reference a GitLab merge request.');
	}
	return { projectId: Number(match[1]), iid: Number(match[2]) };
}

/**
 * Writes and reads merge requests through the GitLab REST API (v4) with the
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
		input: {
			projectPath: string;
			sourceBranch: string;
			targetBranch: string;
			title: string;
			description: string;
		},
	): Promise<GitLabMergeRequest> {
		const { body } = await this.request(access, {
			method: 'POST',
			path: `projects/${encodeURIComponent(input.projectPath)}/merge_requests`,
			body: {
				source_branch: input.sourceBranch,
				target_branch: input.targetBranch,
				title: input.title,
				description: input.description,
				remove_source_branch: true,
			},
		});
		return this.parseMergeRequest(body);
	}

	async getMergeRequest(access: GitHostAccess, ref: MergeRequestRef): Promise<GitLabMergeRequest> {
		const { body } = await this.request(access, {
			method: 'GET',
			path: `projects/${ref.projectId}/merge_requests/${ref.iid}`,
		});
		return this.parseMergeRequest(body);
	}

	/** Reads several merge requests of one project in one call. Missing iids are left out. */
	async listMergeRequests(
		access: GitHostAccess,
		projectId: number,
		iids: number[],
	): Promise<GitLabMergeRequest[]> {
		if (iids.length === 0) return [];
		// GitLab reads `iids[]=1&iids[]=2`. The default serializer writes
		// `iids[][0]=1`, which GitLab answers with an empty list.
		const { body } = await this.request(access, {
			method: 'GET',
			path: `projects/${projectId}/merge_requests`,
			qs: { iids, per_page: Math.min(iids.length, 100), state: 'all' },
			arrayFormat: 'brackets',
		});
		const parsed = z.array(mergeRequestSchema).safeParse(body);
		if (!parsed.success) throw unexpectedResponseError();
		return parsed.data;
	}

	async createNote(access: GitHostAccess, ref: MergeRequestRef, note: string): Promise<void> {
		await this.request(access, {
			method: 'POST',
			path: `projects/${ref.projectId}/merge_requests/${ref.iid}/notes`,
			body: { body: note },
		});
	}

	/**
	 * Approves as the bot user. GitLab answers 401 when the bot may not approve,
	 * for example because it authored the merge request. The caller decides whether
	 * that blocks the merge.
	 */
	async approve(access: GitHostAccess, ref: MergeRequestRef): Promise<void> {
		await this.request(access, {
			method: 'POST',
			path: `projects/${ref.projectId}/merge_requests/${ref.iid}/approve`,
		});
	}

	/** Merges and removes the promotion branch. Only the pushed commit may be merged. */
	async merge(
		access: GitHostAccess,
		ref: MergeRequestRef,
		expectedHeadSha: string,
	): Promise<GitLabMergeRequest> {
		const { body } = await this.request(access, {
			method: 'PUT',
			path: `projects/${ref.projectId}/merge_requests/${ref.iid}/merge`,
			body: { should_remove_source_branch: true, sha: expectedHeadSha },
		});
		return this.parseMergeRequest(body);
	}

	private parseMergeRequest(body: unknown): GitLabMergeRequest {
		const parsed = mergeRequestSchema.safeParse(body);
		if (!parsed.success) {
			this.logger.warn('GitLab merge request response did not match the expected shape', {
				issues: parsed.error.issues.map((issue) => issue.path.join('.')),
			});
			throw unexpectedResponseError();
		}
		return parsed.data;
	}

	private async request(
		access: GitHostAccess,
		{
			method,
			path,
			qs,
			arrayFormat,
			body,
		}: {
			method: IHttpRequestMethods;
			path: string;
			qs?: IDataObject;
			arrayFormat?: 'brackets';
			body?: IDataObject;
		},
	): Promise<TypedHttpFullResponse<unknown>> {
		let response;
		try {
			response = await this.http.request<unknown>({
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
			});
		} catch (error) {
			const code =
				errorChain(error).find(({ code }) => typeof code === 'string')?.code ?? 'UNKNOWN';
			// Request errors can carry tokens. Do not log their headers or messages.
			this.logger.warn(`GitLab merge request call failed before a response (${String(code)})`, {
				method,
				path,
			});
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
		throw statusError(response.statusCode, response.body);
	}
}

/** Keeps a subpath in the base URL, such as `https://example.com/gitlab`. */
function apiUrl(baseUrl: string, path: string) {
	return new URL(`api/v4/${path}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

function unexpectedResponseError() {
	return new BadRequestError('GitLab returned an unexpected merge request response.');
}

function statusError(status: number, responseBody: unknown) {
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
	// GitLab answers 405 when the merge request cannot be merged, 406 on conflicts,
	// and 409 when the head commit moved or the merge request already exists.
	if (status === 405 || status === 406) {
		return new ConflictError(
			detail ?? 'GitLab cannot merge this merge request. Resolve the blocking issue on GitLab.',
		);
	}
	if (status === 409) {
		return new ConflictError(
			detail ?? 'The merge request changed on GitLab. Reload the review and try again.',
		);
	}
	if (status === 429 || status >= 500) {
		return new ServiceUnavailableError('GitLab is not available. Try again later.');
	}
	return new BadRequestError(detail ?? `GitLab answered with an unexpected status: ${status}`);
}

/** GitLab error bodies carry `message` as a string or a list of strings. */
function gitlabMessage(body: unknown): string | undefined {
	const parsed = z.object({ message: z.union([z.string(), z.array(z.string())]) }).safeParse(body);
	if (!parsed.success) return undefined;
	const message = Array.isArray(parsed.data.message)
		? parsed.data.message.join(' ')
		: parsed.data.message;
	return message ? `GitLab: ${message}` : undefined;
}
