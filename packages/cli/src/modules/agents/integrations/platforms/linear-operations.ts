import { z } from 'zod';

import type { ChatInstance } from '../chat-integration.service';
import { INTEGRATION_ERROR_CODES } from '../integration-error-codes';
import {
	booleanProperty,
	integrationError,
	isDefined,
	isRecord,
	isoDateProperty,
	numberProperty,
	removeUndefinedValues,
	stringProperty,
	unsupportedAction,
	unsupportedQuery,
} from '../integration-helpers';
import type {
	IntegrationAction,
	IntegrationActionResult,
	IntegrationContextQuery,
	IntegrationMessageSubject,
	IntegrationToolConnectionDescriptor,
} from '../integration-tools';

const PLATFORM = 'linear';

const getUserSchema = z.object({ userId: z.string().min(1) });

const searchUsersSchema = z
	.object({
		query: z.string().min(1).optional(),
		email: z.string().min(1).optional(),
		limit: z.number().int().min(1).max(50).default(10),
		cursor: z.string().min(1).optional(),
		includeBots: z.boolean().default(false),
		includeDeleted: z.boolean().default(false),
	})
	.refine((input) => input.query !== undefined || input.email !== undefined, {
		message: 'Provide query or email.',
	});

const getIssueSchema = z.object({
	issueId: z.string().min(1),
	includeComments: z.boolean().default(false),
	commentsLimit: z.number().int().min(1).max(20).default(10),
});

const searchIssuesSchema = z.object({
	query: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(10),
	cursor: z.string().min(1).optional(),
	teamId: z.string().min(1).optional(),
	includeArchived: z.boolean().default(false),
});

const createIssueSchema = z.object({
	teamId: z.string().min(1),
	title: z.string().min(1),
	description: z.string().min(1).optional(),
	assigneeId: z.string().min(1).optional(),
	projectId: z.string().min(1).optional(),
	labelIds: z.array(z.string().min(1)).optional(),
	priority: z.number().int().optional(),
	stateId: z.string().min(1).optional(),
	parentId: z.string().min(1).optional(),
});

const createCommentSchema = z.object({
	issueId: z.string().min(1),
	body: z.string().min(1),
	parentCommentId: z.string().min(1).optional(),
});

interface LinearAdapter {
	client: Record<string, unknown>;
}

interface LinearClientUser {
	user(userId: string): Promise<unknown>;
}

interface LinearClientUsers {
	users(options: Record<string, unknown>): Promise<unknown>;
}

interface LinearClientIssue {
	issue(issueId: string): Promise<unknown>;
}

interface LinearClientIssueSearch {
	searchIssues(query: string, options: Record<string, unknown>): Promise<unknown>;
}

interface LinearClientCreateIssue {
	createIssue(input: Record<string, unknown>): Promise<unknown>;
}

interface LinearClientCreateComment {
	createComment(input: Record<string, unknown>): Promise<unknown>;
}

type SearchUsersInput = z.infer<typeof searchUsersSchema>;
type GetIssueInput = z.infer<typeof getIssueSchema>;
type SearchIssuesInput = z.infer<typeof searchIssuesSchema>;
type CreateIssueInput = z.infer<typeof createIssueSchema>;
type CreateCommentInput = z.infer<typeof createCommentSchema>;

export async function executeLinearContextQuery(params: {
	chat: ChatInstance;
	query: IntegrationContextQuery;
	input: Record<string, unknown>;
}): Promise<unknown> {
	const adapter = getLinearAdapter(params.chat);
	if (!adapter) return unsupportedQuery(PLATFORM, params.query);

	if (params.query === 'get_user') {
		return await getLinearUser(adapter, getUserSchema.parse(params.input));
	}
	if (params.query === 'search_users') {
		return await searchLinearUsers(adapter, searchUsersSchema.parse(params.input));
	}
	if (params.query === 'get_issue') {
		return await getLinearIssue(adapter, getIssueSchema.parse(params.input));
	}
	if (params.query === 'search_issues') {
		return await searchLinearIssues(adapter, searchIssuesSchema.parse(params.input));
	}

	return unsupportedQuery(PLATFORM, params.query);
}

export async function executeLinearAction(params: {
	chat: ChatInstance;
	descriptor: IntegrationToolConnectionDescriptor;
	action: IntegrationAction;
	input: Record<string, unknown>;
}): Promise<IntegrationActionResult | undefined> {
	if (params.action === 'create_issue') {
		return await createLinearIssue(
			params.chat,
			params.descriptor,
			createIssueSchema.parse(params.input),
		);
	}
	if (params.action === 'create_comment') {
		return await createLinearComment(
			params.chat,
			params.descriptor,
			createCommentSchema.parse(params.input),
		);
	}
	return undefined;
}

async function getLinearUser(adapter: LinearAdapter, input: { userId: string }): Promise<unknown> {
	if (!hasMethod<LinearClientUser>(adapter.client, 'user')) {
		return unsupportedQuery(PLATFORM, 'get_user');
	}
	const user = await adapter.client.user(input.userId);
	return { ok: true, user: normalizeLinearUser(user) ?? null };
}

async function searchLinearUsers(
	adapter: LinearAdapter,
	input: SearchUsersInput,
): Promise<unknown> {
	if (!hasMethod<LinearClientUsers>(adapter.client, 'users')) {
		return unsupportedQuery(PLATFORM, 'search_users');
	}

	const response = await adapter.client.users({
		filter: buildLinearUserSearchFilter(input),
		first: input.limit,
		...(input.cursor ? { after: input.cursor } : {}),
		includeArchived: input.includeDeleted,
		includeDisabled: input.includeDeleted,
	});

	const users = linearNodes(response).map(normalizeLinearUser).filter(isDefined);
	const nextCursor = extractLinearNextCursor(response);
	return {
		ok: true,
		users,
		resultCount: users.length,
		...(nextCursor ? { nextCursor } : {}),
	};
}

async function getLinearIssue(adapter: LinearAdapter, input: GetIssueInput): Promise<unknown> {
	if (!hasMethod<LinearClientIssue>(adapter.client, 'issue')) {
		return unsupportedQuery(PLATFORM, 'get_issue');
	}

	const issue = await adapter.client.issue(input.issueId);
	if (!issue) return { ok: true, issue: null };

	return {
		ok: true,
		issue: await normalizeLinearIssue(issue, {
			includeComments: input.includeComments,
			commentsLimit: input.commentsLimit,
		}),
	};
}

async function searchLinearIssues(
	adapter: LinearAdapter,
	input: SearchIssuesInput,
): Promise<unknown> {
	if (!hasMethod<LinearClientIssueSearch>(adapter.client, 'searchIssues')) {
		return unsupportedQuery(PLATFORM, 'search_issues');
	}

	const response = await adapter.client.searchIssues(input.query, {
		first: input.limit,
		...(input.cursor ? { after: input.cursor } : {}),
		...(input.teamId ? { teamId: input.teamId } : {}),
		includeArchived: input.includeArchived,
	});

	// Lean summary instead of normalizeLinearIssue — search hydration of 50 issues
	// would issue 250+ Linear API calls otherwise (5–6 relations per issue).
	const issues = linearNodes(response).map(summarizeLinearIssue);
	const totalCount = numberProperty(response, 'totalCount');
	const nextCursor = extractLinearNextCursor(response);

	return {
		ok: true,
		issues,
		resultCount: issues.length,
		...(totalCount !== undefined ? { totalCount } : {}),
		...(nextCursor ? { nextCursor } : {}),
	};
}

/**
 * Linear Connection responses expose `pageInfo: { hasNextPage, endCursor }`.
 * Return the cursor only when another page exists so callers can omit-check
 * `nextCursor` to know when to stop paging.
 */
function extractLinearNextCursor(response: unknown): string | undefined {
	if (!isRecord(response)) return undefined;
	const pageInfo = response.pageInfo;
	if (!isRecord(pageInfo)) return undefined;
	if (pageInfo.hasNextPage !== true) return undefined;
	return stringProperty(pageInfo, 'endCursor');
}

async function createLinearIssue(
	chat: ChatInstance,
	descriptor: IntegrationToolConnectionDescriptor,
	input: CreateIssueInput,
): Promise<IntegrationActionResult> {
	const adapter = getLinearAdapter(chat);
	if (!adapter || !hasMethod<LinearClientCreateIssue>(adapter.client, 'createIssue')) {
		return unsupportedAction(PLATFORM, 'create_issue');
	}

	const payload = await adapter.client.createIssue(removeUndefinedValues({ ...input }));
	const rawIssue = await awaitableProperty(payload, 'issue');
	const normalizedIssue = await normalizeLinearIssue(rawIssue ?? payload);
	const issueId =
		stringProperty(normalizedIssue, 'issueId') ??
		stringProperty(payload, 'issueId') ??
		stringProperty(normalizedIssue, 'identifier');

	if (!issueId) {
		return integrationError(
			INTEGRATION_ERROR_CODES.ACTION_FAILED,
			'Linear did not return an issue ID for the created issue.',
		);
	}

	return {
		ok: true,
		issue: normalizedIssue,
		messageContext: {
			integrationConnectionId: descriptor.integrationConnectionId,
			platform: descriptor.integration.type,
			target: { type: 'thread', threadId: `linear:${issueId}` },
			subject: buildLinearIssueSubject(normalizedIssue, issueId),
			updatedAt: new Date().toISOString(),
		},
	};
}

async function createLinearComment(
	chat: ChatInstance,
	descriptor: IntegrationToolConnectionDescriptor,
	input: CreateCommentInput,
): Promise<IntegrationActionResult> {
	const adapter = getLinearAdapter(chat);
	if (!adapter || !hasMethod<LinearClientCreateComment>(adapter.client, 'createComment')) {
		return unsupportedAction(PLATFORM, 'create_comment');
	}

	const payload = await adapter.client.createComment(
		removeUndefinedValues({
			issueId: input.issueId,
			body: input.body,
			parentId: input.parentCommentId,
		}),
	);
	const rawComment = await awaitableProperty(payload, 'comment');
	const normalizedComment = await normalizeLinearComment(rawComment ?? payload);
	const commentId =
		stringProperty(normalizedComment, 'commentId') ?? stringProperty(payload, 'commentId');

	return {
		ok: true,
		comment: normalizedComment,
		messageContext: {
			integrationConnectionId: descriptor.integrationConnectionId,
			platform: descriptor.integration.type,
			target: {
				type: 'thread',
				threadId: input.parentCommentId
					? `linear:${input.issueId}:c:${input.parentCommentId}`
					: `linear:${input.issueId}`,
			},
			...(commentId ? { messageId: commentId } : {}),
			subject: { type: 'issue', id: input.issueId },
			updatedAt: new Date().toISOString(),
		},
	};
}

function getLinearAdapter(chat: ChatInstance): LinearAdapter | undefined {
	const adapter = chat.getAdapter('linear');
	if (!isRecord(adapter) || !isRecord(adapter.client)) return undefined;
	return { client: adapter.client };
}

function hasMethod<T>(
	client: Record<string, unknown>,
	key: keyof T,
): client is Record<string, unknown> & T {
	return typeof client[key as string] === 'function';
}

function buildLinearUserSearchFilter(input: SearchUsersInput): Record<string, unknown> {
	const term = buildLinearUserSearchTermFilter(input);
	if (input.includeBots) return term;
	return { and: [term, { app: { eq: false } }] };
}

function buildLinearUserSearchTermFilter(input: SearchUsersInput): Record<string, unknown> {
	if (input.email) {
		return { email: { eqIgnoreCase: input.email.trim() } };
	}
	const query = input.query?.trim() ?? '';
	return {
		or: [
			{ name: { containsIgnoreCase: query } },
			{ displayName: { containsIgnoreCase: query } },
			{ email: { containsIgnoreCase: query } },
		],
	};
}

/**
 * Hydrate a single issue with all relations — used by `get_issue`. Issues
 * `issue.state`, `issue.assignee`, `issue.creator`, `issue.team`, `issue.project`
 * and `issue.labels()` calls (lazy Linear SDK relations), so this is expensive
 * (~6 network calls per issue). For search-result lists use
 * {@link summarizeLinearIssue} instead.
 */
export async function normalizeLinearIssue(
	value: unknown,
	options: { includeComments?: boolean; commentsLimit?: number } = {},
): Promise<Record<string, unknown>> {
	const issue = isRecord(value) ? value : {};
	const [state, assignee, creator, team, project, labelsConnection] = await Promise.all([
		awaitableProperty(issue, 'state'),
		awaitableProperty(issue, 'assignee'),
		awaitableProperty(issue, 'creator'),
		awaitableProperty(issue, 'team'),
		awaitableProperty(issue, 'project'),
		callLinearConnection(issue, 'labels', { first: 50 }),
	]);

	const priority = normalizeLinearPriority(issue);
	const comments = options.includeComments
		? await normalizeLinearComments(issue, options.commentsLimit ?? 10)
		: undefined;

	return removeUndefinedValues({
		issueId: stringProperty(issue, 'id'),
		identifier: stringProperty(issue, 'identifier'),
		title: stringProperty(issue, 'title'),
		description: stringProperty(issue, 'description'),
		url: stringProperty(issue, 'url'),
		priority,
		state: normalizeLinearState(state),
		assignee: normalizeLinearUser(assignee),
		creator: normalizeLinearUser(creator),
		team: normalizeLinearTeam(team),
		project: normalizeLinearProject(project),
		labels: linearNodes(labelsConnection).map(normalizeLinearLabel).filter(isDefined),
		createdAt: isoDateProperty(issue, 'createdAt'),
		updatedAt: isoDateProperty(issue, 'updatedAt'),
		...(comments ? { comments } : {}),
	});
}

/** Lean summary using only fields already on the issue node (no extra SDK calls). */
function summarizeLinearIssue(value: unknown): Record<string, unknown> {
	const issue = isRecord(value) ? value : {};
	return removeUndefinedValues({
		issueId: stringProperty(issue, 'id'),
		identifier: stringProperty(issue, 'identifier'),
		title: stringProperty(issue, 'title'),
		url: stringProperty(issue, 'url'),
		priority: normalizeLinearPriority(issue),
		createdAt: isoDateProperty(issue, 'createdAt'),
		updatedAt: isoDateProperty(issue, 'updatedAt'),
	});
}

async function normalizeLinearComments(
	issue: Record<string, unknown>,
	commentsLimit: number,
): Promise<Array<Record<string, unknown>> | undefined> {
	const commentsConnection = await callLinearConnection(issue, 'comments', {
		first: commentsLimit,
	});
	if (!commentsConnection) return undefined;
	return await Promise.all(
		linearNodes(commentsConnection).map(async (comment) => await normalizeLinearComment(comment)),
	);
}

export async function normalizeLinearComment(value: unknown): Promise<Record<string, unknown>> {
	const comment = isRecord(value) ? value : {};
	const author = await awaitableProperty(comment, 'user');
	return removeUndefinedValues({
		commentId: stringProperty(comment, 'id'),
		body: stringProperty(comment, 'body'),
		url: stringProperty(comment, 'url'),
		createdAt: isoDateProperty(comment, 'createdAt'),
		updatedAt: isoDateProperty(comment, 'updatedAt'),
		author: normalizeLinearUser(author),
	});
}

function normalizeLinearUser(value: unknown): Record<string, unknown> | undefined {
	if (!isRecord(value)) return undefined;
	const userId = stringProperty(value, 'id');
	if (!userId) return undefined;

	return removeUndefinedValues({
		userId,
		name: stringProperty(value, 'name') ?? userId,
		displayName: stringProperty(value, 'displayName'),
		email: stringProperty(value, 'email'),
		avatarUrl: stringProperty(value, 'avatarUrl'),
		active: booleanProperty(value, 'active'),
		isBot: booleanProperty(value, 'app') ?? false,
		isAssignable: booleanProperty(value, 'isAssignable'),
		isMentionable: booleanProperty(value, 'isMentionable'),
		url: stringProperty(value, 'url'),
	});
}

function normalizeLinearState(value: unknown): Record<string, unknown> | undefined {
	if (!isRecord(value)) return undefined;
	return removeUndefinedValues({
		id: stringProperty(value, 'id'),
		name: stringProperty(value, 'name'),
		type: stringProperty(value, 'type'),
	});
}

function normalizeLinearTeam(value: unknown): Record<string, unknown> | undefined {
	if (!isRecord(value)) return undefined;
	return removeUndefinedValues({
		teamId: stringProperty(value, 'id'),
		key: stringProperty(value, 'key'),
		name: stringProperty(value, 'name'),
	});
}

function normalizeLinearProject(value: unknown): Record<string, unknown> | undefined {
	if (!isRecord(value)) return undefined;
	return removeUndefinedValues({
		projectId: stringProperty(value, 'id'),
		name: stringProperty(value, 'name'),
		url: stringProperty(value, 'url'),
	});
}

function normalizeLinearLabel(value: unknown): Record<string, unknown> | undefined {
	if (!isRecord(value)) return undefined;
	const labelId = stringProperty(value, 'id');
	const name = stringProperty(value, 'name');
	if (!labelId || !name) return undefined;
	return { labelId, name };
}

function normalizeLinearPriority(
	issue: Record<string, unknown>,
): Record<string, unknown> | undefined {
	const value = numberProperty(issue, 'priority');
	const label = stringProperty(issue, 'priorityLabel');
	if (value === undefined && !label) return undefined;
	return removeUndefinedValues({ value, label });
}

function buildLinearIssueSubject(
	issue: Record<string, unknown>,
	fallbackIssueId: string,
): IntegrationMessageSubject {
	const identifier = stringProperty(issue, 'identifier');
	const title = stringProperty(issue, 'title');
	const description = stringProperty(issue, 'description');
	const url = stringProperty(issue, 'url');
	const status = stringProperty(isRecord(issue.state) ? issue.state : undefined, 'name');
	const labels = linearLabelNames(issue);
	const assignee = linearSubjectPerson(issue.assignee);

	return {
		type: 'issue',
		id: identifier ?? fallbackIssueId,
		...(title ? { title } : {}),
		...(description ? { description } : {}),
		...(url ? { url } : {}),
		...(status ? { status } : {}),
		...(labels.length > 0 ? { labels } : {}),
		...(assignee ? { assignee } : {}),
	};
}

function linearLabelNames(issue: Record<string, unknown>): string[] {
	const labels = issue.labels;
	if (!Array.isArray(labels)) return [];
	return labels
		.map((label) => stringProperty(label, 'name'))
		.filter((label): label is string => label !== undefined);
}

function linearSubjectPerson(value: unknown): IntegrationMessageSubject['assignee'] {
	if (!isRecord(value)) return undefined;
	const id = stringProperty(value, 'userId') ?? stringProperty(value, 'id');
	const name = stringProperty(value, 'name') ?? stringProperty(value, 'displayName');
	if (!id || !name) return undefined;
	return { id, name };
}

async function awaitableProperty(value: unknown, key: string): Promise<unknown | undefined> {
	if (!isRecord(value)) return undefined;
	return await Promise.resolve(value[key]);
}

type LinearConnectionFunction = (
	this: Record<string, unknown>,
	options: Record<string, unknown>,
) => unknown | PromiseLike<unknown>;

async function callLinearConnection(
	record: Record<string, unknown>,
	key: string,
	options: Record<string, unknown>,
): Promise<unknown | undefined> {
	const fn = record[key];
	if (typeof fn !== 'function') return undefined;
	return await (fn as LinearConnectionFunction).call(record, options);
}

function linearNodes(value: unknown): unknown[] {
	if (!isRecord(value) || !Array.isArray(value.nodes)) return [];
	return value.nodes;
}
