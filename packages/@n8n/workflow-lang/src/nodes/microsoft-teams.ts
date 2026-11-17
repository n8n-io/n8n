/**
 * Compiled library node: a hand port of `n8n-nodes-base.microsoftTeams`
 * version 2 (Microsoft Graph), with the Teams OAuth2 credential or the
 * Microsoft OAuth2 credential. The node compiler cannot take this version: its
 * transport comes from a closure factory (`createMicrosoftGraphTransport`).
 *
 * Operations: `channel` (create, deleteChannel, get, getAll, update),
 * `channelMessage` (create, get, getAll, getAllReplies, reply,
 * softDeleteMessage, undoSoftDeleteMessage), `chat` (get, getAll),
 * `chatMember` (getAll, remove), `chatMessage` (create, get, getAll) and
 * `task` (create, deleteTask, get, getAll, update).
 *
 * The Graph host is a credential field with a default. The credentials file
 * holds the result as the derived value `n8nDerived.graphApiUrl`
 * (`src/credentials/derived.ts`). The node cannot read it, so it follows a
 * next-page link only when the link points to a Microsoft Graph host, and it
 * sends the request for the link to the host of the credential. The token
 * thus never goes to another host. v1 follows a link on the origin of the
 * credential and refuses each other link with the same error. Two cases
 * differ from v1: a credential with a host that is not Microsoft Graph fails
 * on the second page, and a credential whose host is not a URL fails in the
 * request (v1 refuses it before the request).
 *
 * The link to the workflow (on by default) needs the URL and the id of the
 * n8n instance: the converter passes them in `workflowLink`
 * (`ConvertOptions.instance`), and else sends the call to the fallback host.
 *
 * Not supported; the converter sends these calls to the fallback host: the
 * service principal credential, a team in mode `url`, mentions, and the
 * operations `chat.create`, `chatMember.add`, `chatMessage.softDeleteMessage`,
 * `chatMessage.undoSoftDeleteMessage` (v1 keeps the signed-in user for all
 * items of a run), `activityNotification.send` and `onlineMeeting`.
 *
 * A failed request gives the message of v1 for the HTTP status (the
 * NodeApiError of n8n-workflow), or the message that the operation of v1
 * writes itself.
 *
 * Cost: the ids go through one native pattern match, not a loop for each
 * character. The node reads `resource` and `operation` at run time; the node
 * compiler folds them for one instance, so a compiled operation of version
 * 1.1 (which does not check the ids) still costs less.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface WorkflowLink {
	baseUrl?: string;
	workflowId?: string;
	instanceId?: string;
}

interface TeamsParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	teamId?: unknown;
	channelId?: unknown;
	chatId?: unknown;
	membershipId?: unknown;
	messageId?: unknown;
	planId?: unknown;
	bucketId?: unknown;
	taskId?: unknown;
	groupId?: unknown;
	groupSource?: unknown;
	contentType?: string;
	message?: string;
	name?: string;
	title?: unknown;
	tasksFor?: string;
	returnAll?: boolean;
	limit?: number;
	options?: Record<string, unknown>;
	updateFields?: Record<string, unknown>;
	workflowLink?: WorkflowLink;
}

interface GraphAnswer {
	status: number;
	body: unknown;
}

const BASE = '{{$credentials.n8nDerived.graphApiUrl}}';

/** The hosts of Microsoft Graph: the global service and the national clouds. */
const GRAPH_HOSTS = [
	'graph.microsoft.com',
	'graph.microsoft.us',
	'dod-graph.microsoft.us',
	'microsoftgraph.chinacloudapi.cn',
];

const REFUSED = 'Refusing to send credentials to an unexpected host';

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** String(value) of JavaScript for JSON values. */
function asText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return `${value}`;
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (Array.isArray(value)) {
		return value.map((v) => (v === null || v === undefined ? '' : asText(v))).join(',');
	}
	return '[object Object]';
}

/** GUID_V4_REGEX of the v1 node: a version 4 GUID in lower case at the start of the text. */
const GUID_START = '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

function guidPrefix(text: string): string | null {
	return RegExp.exec(GUID_START, '', text, 0) === null ? null : text.slice(0, 36);
}

/**
 * `extractValue` of n8n-core for a resource locator. `guid` is true when mode `id` of the
 * parameter reads a GUID from the value (`guidIdMode` of the v1 node).
 */
function locatorValue(value: unknown, guid: boolean, displayName: string): unknown {
	if (!isObject(value) || !('mode' in value) || !('value' in value)) return value;
	if (!guid || value.mode !== 'id') return value.value;
	if (typeof value.value !== 'string') {
		throw new Error("ERROR: This parameter's value is invalid. Please enter a valid mode.");
	}
	const found = guidPrefix(value.value);
	if (found === null) {
		throw new Error(
			`ERROR: ${displayName} parameter's value is invalid. This is likely because the URL entered is incorrect`,
		);
	}
	return found;
}

const ID_PLAIN = '^(?!\\.+$)[\\x20-\\x22\\x24\\x26-\\x2e\\x30-\\x3e\\x40-\\x5b\\x5d-\\x7e]+$';
const ID_REJECT = '[\\x00-\\x1f/\\\\?#%]|^\\.+$';

/** validateMicrosoftGraphId of the v1 node: the id as it goes into a Graph path. */
function graphId(id: unknown): string {
	const trimmed =
		typeof id === 'string' ? id.trim() : (id === null || id === undefined ? '' : asText(id)).trim();
	// The usual id: printable ASCII with no character that v1 decodes or refuses.
	if (RegExp.exec(ID_PLAIN, '', trimmed, 0) !== null) return trimmed;
	if (trimmed === '') throw new Error('A required ID is empty');
	let value = '';
	try {
		value = decodeURIComponent(trimmed);
	} catch {
		throw new Error('The ID is not valid');
	}
	// Control characters, `/`, `\\`, `?`, `#` and `%`, or only dots.
	if (RegExp.exec(ID_REJECT, '', value, 0) !== null) throw new Error('The ID is not valid');
	// A surrogate without its pair is not valid text. ASCII text has none.
	if (!Ascii.is(value)) {
		for (let k = 0; k < value.length; k++) {
			const code = value.charCodeAt(k);
			if (code >= 0xd800 && code <= 0xdbff) {
				const next = k + 1 < value.length ? value.charCodeAt(k + 1) : 0;
				if (next < 0xdc00 || next > 0xdfff) throw new Error('The ID is not valid');
				k++;
			} else if (code >= 0xdc00 && code <= 0xdfff) {
				throw new Error('The ID is not valid');
			}
		}
	}
	return value;
}

/** The message of a NodeApiError of n8n-workflow for an HTTP status (STATUS_CODE_MESSAGES). */
function statusMessage(status: number): string {
	if (status === 400) return 'Bad request - please check your parameters';
	if (status === 401) return 'Authorization failed - please check your credentials';
	if (status === 402) return 'Payment required - perhaps check your payment details?';
	if (status === 403) return 'Forbidden - perhaps check your credentials?';
	if (status === 404) return 'The resource you are requesting could not be found';
	if (status === 405) {
		return 'Method not allowed - please check you are using the right HTTP method';
	}
	if (status === 429) return 'The service is receiving too many requests from you';
	if (status === 500) return 'The service was not able to process your request';
	if (status === 502) return 'Bad gateway - the service failed to handle your request';
	if (status === 503) {
		return 'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)';
	}
	if (status === 504) return 'Gateway timed out - perhaps try again later?';
	return status < 500
		? 'Your request is invalid or could not be processed by the service'
		: 'The service failed to process your request';
}

/** The body of an answer, or the error that v1 raises for a failed request. */
function sent(answer: GraphAnswer): unknown {
	if (answer.status >= 400) throw new Error(statusMessage(answer.status));
	return answer.body;
}

/** A locator of a parameter that has no GUID mode. */
function plain(value: unknown): unknown {
	return locatorValue(value ?? '', false, '');
}

/** The team: mode `id` reads a GUID from the value. */
function teamOf(value: unknown): unknown {
	return locatorValue(value ?? '', true, 'Team');
}

function channelPath(version: string, teamId: unknown, channelId: unknown): string {
	return `/${version}/teams/${graphId(teamId)}/channels/${graphId(channelId)}`;
}

/** readTextParameter of the v1 node. */
function trimmedText(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? asText(value).trim() : '';
}

/**
 * The path and the query of a next-page link. The request for it goes to the host of the
 * credential, so the link must point to Microsoft Graph.
 */
function nextPath(link: unknown): string {
	if (typeof link !== 'string') throw new Error(REFUSED);
	const found = RegExp.exec('^https://([^/?#]*)', 'i', link, 0);
	if (found === null) throw new Error(REFUSED);
	const end = found[1];
	const host = link.slice(found[2], end).toLowerCase();
	if (!GRAPH_HOSTS.includes(host)) throw new Error(REFUSED);
	const hash = link.indexOf('#', end);
	const rest = hash >= 0 ? link.slice(end, hash) : link.slice(end);
	return rest.startsWith('/') ? rest : `/${rest}`;
}

/** prepareMessage of the v1 node, for a message without mentions. */
function messageBody(message: string, type: string, link: WorkflowLink | undefined): Item {
	let contentType = type;
	let content = message;
	if (link) {
		const instance = link.instanceId ? `_${link.instanceId}` : '';
		const url = `${link.baseUrl ?? ''}workflow/${link.workflowId ?? ''}?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.microsoftTeams${instance}`;
		contentType = 'html';
		content = `${content}<br><br><em> Powered by <a href="${url}">this n8n workflow</a> </em>`;
	}
	return { body: { contentType, content } };
}

/** The Planner assignment of one user, as the v1 node writes it. */
function assignment(user: unknown): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	out[asText(user)] = { '@odata.type': 'microsoft.graph.plannerAssignment', orderHint: ' !' };
	return out;
}

/** returnJsonArray of n8n-core: an array gives its members, another value gives one item. */
function asItems(data: unknown): Item[] {
	if (Array.isArray(data)) return data.filter(isObject);
	return isObject(data) ? [data] : [];
}

export default defineNode<TeamsParameters>({
	type: 'n8n-nodes-base.microsoftTeams',
	version: 2,
	supports: {
		resource: 'channel',
		operation: {
			channel: 'create',
			channelMessage: 'create',
			chat: 'create',
			chatMember: 'getAll',
			chatMessage: 'create',
			task: 'create',
		},
		operations: {
			'channel.create': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'name',
				'options',
				'options.description',
				'options.type',
			],
			'channel.deleteChannel': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
			],
			'channel.get': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
			],
			'channel.getAll': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'returnAll',
				'limit',
			],
			'channel.update': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
				'name',
				'options',
				'options.description',
			],
			'channelMessage.create': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
				'contentType',
				'message',
				'options',
				'options.includeLinkToWorkflow',
				'options.makeReply',
				'workflowLink',
				'workflowLink.baseUrl',
				'workflowLink.workflowId',
				'workflowLink.instanceId',
			],
			'channelMessage.get': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
				'messageId',
			],
			'channelMessage.getAll': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
				'returnAll',
				'limit',
			],
			'channelMessage.getAllReplies': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
				'messageId',
				'returnAll',
				'limit',
			],
			'channelMessage.reply': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
				'messageId',
				'contentType',
				'message',
				'options',
				'options.includeLinkToWorkflow',
				'workflowLink',
				'workflowLink.baseUrl',
				'workflowLink.workflowId',
				'workflowLink.instanceId',
			],
			'channelMessage.softDeleteMessage': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
				'messageId',
				'options',
				'options.parentMessageId',
			],
			'channelMessage.undoSoftDeleteMessage': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'teamId',
				'channelId',
				'messageId',
				'options',
				'options.parentMessageId',
			],
			'chat.get': ['authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"', 'chatId'],
			'chat.getAll': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'returnAll',
				'limit',
			],
			'chatMember.getAll': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'chatId',
				'returnAll',
				'limit',
			],
			'chatMember.remove': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'chatId',
				'membershipId',
			],
			'chatMessage.create': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'chatId',
				'contentType',
				'message',
				'options',
				'options.includeLinkToWorkflow',
				'workflowLink',
				'workflowLink.baseUrl',
				'workflowLink.workflowId',
				'workflowLink.instanceId',
			],
			'chatMessage.get': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'chatId',
				'messageId',
			],
			'chatMessage.getAll': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'chatId',
				'returnAll',
				'limit',
			],
			'task.create': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'groupSource',
				'groupId',
				'planId',
				'bucketId',
				'title',
				'options',
				'options.assignedTo',
				'options.dueDateTime',
				'options.percentComplete',
			],
			'task.deleteTask': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'taskId',
			],
			'task.get': ['authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"', 'taskId'],
			'task.getAll': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'tasksFor',
				'groupSource',
				'groupId',
				'planId',
				'returnAll',
				'limit',
			],
			'task.update': [
				'authentication="microsoftTeamsOAuth2Api"|"microsoftOAuth2Api"',
				'groupSource',
				'taskId',
				'updateFields',
				'updateFields.assignedTo',
				'updateFields.bucketId',
				'updateFields.dueDateTime',
				'updateFields.groupId',
				'updateFields.percentComplete',
				'updateFields.planId',
				'updateFields.title',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'channel';
		const operation = parameters.operation ?? (resource === 'chatMember' ? 'getAll' : 'create');
		const authentication = parameters.authentication ?? 'microsoftTeamsOAuth2Api';
		if (authentication !== 'microsoftTeamsOAuth2Api' && authentication !== 'microsoftOAuth2Api') {
			throw new Error('Microsoft Teams: only the OAuth2 credentials are in the compiled library');
		}
		// microsoftApiRequest of the v1 node.
		const graph = async (
			method: string,
			path: string,
			body: unknown,
			qs: Record<string, unknown>,
			ifMatch?: unknown,
		): Promise<GraphAnswer> => {
			return await ctx.http<unknown>({
				method,
				url: `${BASE}${path}`,
				headers:
					ifMatch === undefined || ifMatch === null
						? { 'Content-Type': 'application/json' }
						: { 'Content-Type': 'application/json', 'If-Match': asText(ifMatch) },
				qs,
				body,
				credential,
			});
		};
		// microsoftApiRequestAllItems of the v1 node, for the property `value`.
		const all = async (
			path: string,
			qs: Record<string, unknown>,
			limit: number | undefined,
		): Promise<Item[]> => {
			const out: Item[] = [];
			let next: unknown;
			for (;;) {
				const data = next
					? sent(await graph('GET', nextPath(next), {}, {}))
					: sent(await graph('GET', path, {}, qs));
				next = isObject(data) ? data['@odata.nextLink'] : undefined;
				const page = isObject(data) ? data.value : undefined;
				if (Array.isArray(page)) for (const entry of page) if (isObject(entry)) out.push(entry);
				if (limit && out.length >= limit) return out.slice(0, limit);
				if (!next) return out;
			}
		};
		const options = parameters.options ?? {};

		const one = async (): Promise<unknown> => {
			// The resources in the order of their use in real workflows.
			if (resource === 'chatMessage') {
				if (operation === 'create') {
					const path = `/v1.0/chats/${graphId(plain(parameters.chatId))}/messages`;
					const body = messageBody(
						parameters.message ?? '',
						parameters.contentType ?? 'text',
						parameters.workflowLink,
					);
					return sent(await graph('POST', path, body, {}));
				}
				if (operation === 'get') {
					const chatId = plain(parameters.chatId);
					const path = `/v1.0/chats/${graphId(chatId)}/messages/${graphId(parameters.messageId)}`;
					const answer = await graph('GET', path, {}, {});
					if (answer.status >= 400) {
						throw new Error("The message you are trying to get doesn't exist");
					}
					return answer.body;
				}
				if (operation === 'getAll') {
					const path = `/v1.0/chats/${graphId(plain(parameters.chatId))}/messages`;
					if (parameters.returnAll) return await all(path, {}, undefined);
					const limit = parameters.limit ?? 100;
					return await all(path, { $top: limit }, limit);
				}
				throw new Error(`Microsoft Teams: ${resource}.${operation} is not in the compiled library`);
			}
			if (resource === 'channel') {
				if (operation === 'create') {
					const teamId = teamOf(parameters.teamId);
					const body: Record<string, unknown> = { displayName: parameters.name ?? '' };
					if (options.description) body.description = options.description;
					if (options.type) body.membershipType = options.type;
					return sent(await graph('POST', `/v1.0/teams/${graphId(teamId)}/channels`, body, {}));
				}
				if (operation === 'deleteChannel' || operation === 'get') {
					const teamId = teamOf(parameters.teamId);
					const path = channelPath('v1.0', teamId, plain(parameters.channelId));
					const remove = operation === 'deleteChannel';
					const answer = await graph(remove ? 'DELETE' : 'GET', path, {}, {});
					if (answer.status >= 400) {
						throw new Error(
							`The channel you are trying to ${remove ? 'delete' : 'get'} doesn't exist`,
						);
					}
					return remove ? { success: true } : answer.body;
				}
				if (operation === 'getAll') {
					const path = `/v1.0/teams/${graphId(teamOf(parameters.teamId))}/channels`;
					return await all(path, {}, parameters.returnAll ? undefined : (parameters.limit ?? 100));
				}
				if (operation === 'update') {
					const teamId = teamOf(parameters.teamId);
					const channelId = plain(parameters.channelId);
					const body: Record<string, unknown> = {};
					if (parameters.name) body.displayName = parameters.name;
					if (options.description) body.description = options.description;
					sent(await graph('PATCH', channelPath('v1.0', teamId, channelId), body, {}));
					return { success: true };
				}
				throw new Error(`Microsoft Teams: ${resource}.${operation} is not in the compiled library`);
			}
			if (resource === 'channelMessage') {
				if (operation === 'create' || operation === 'reply') {
					const teamId = teamOf(parameters.teamId);
					const channelId = plain(parameters.channelId);
					const reply = operation === 'reply' ? parameters.messageId : options.makeReply;
					const replies = operation === 'reply' || Boolean(reply);
					const base = `${channelPath('beta', teamId, channelId)}/messages`;
					const path = replies ? `${base}/${graphId(reply)}/replies` : base;
					const body = messageBody(
						parameters.message ?? '',
						parameters.contentType ?? 'text',
						parameters.workflowLink,
					);
					return sent(await graph('POST', path, body, {}));
				}
				if (operation === 'get') {
					const teamId = teamOf(parameters.teamId);
					const base = channelPath('beta', teamId, plain(parameters.channelId));
					const path = `${base}/messages/${graphId(parameters.messageId)}`;
					return sent(await graph('GET', path, {}, {}));
				}
				if (operation === 'getAll' || operation === 'getAllReplies') {
					const teamId = teamOf(parameters.teamId);
					const base = `${channelPath('beta', teamId, plain(parameters.channelId))}/messages`;
					const path =
						operation === 'getAll' ? base : `${base}/${graphId(parameters.messageId)}/replies`;
					if (parameters.returnAll) return await all(path, {}, undefined);
					const limit = parameters.limit ?? 100;
					return await all(path, { $top: limit }, limit);
				}
				if (operation === 'softDeleteMessage' || operation === 'undoSoftDeleteMessage') {
					const teamId = trimmedText(teamOf(parameters.teamId));
					const channelId = trimmedText(plain(parameters.channelId));
					const messageId = trimmedText(parameters.messageId);
					const parent = trimmedText(options.parentMessageId);
					const base = `${channelPath('v1.0', teamId, channelId)}/messages`;
					const target = parent
						? `${graphId(parent)}/replies/${graphId(messageId)}`
						: graphId(messageId);
					const action = operation === 'softDeleteMessage' ? 'softDelete' : 'undoSoftDelete';
					sent(await graph('POST', `${base}/${target}/${action}`, {}, {}));
					return { success: true };
				}
				throw new Error(`Microsoft Teams: ${resource}.${operation} is not in the compiled library`);
			}
			if (resource === 'chat') {
				if (operation === 'get') {
					const path = `/v1.0/chats/${graphId(plain(parameters.chatId))}`;
					const answer = await graph('GET', path, {}, {});
					if (answer.status === 404)
						throw new Error("The chat you are trying to get doesn't exist");
					return sent(answer);
				}
				if (operation === 'getAll') {
					const limit = parameters.returnAll
						? undefined
						: Math.max(Math.floor(parameters.limit ?? 100) || 1, 1);
					return await all('/v1.0/chats', { $top: Math.min(limit ?? 50, 50) }, limit);
				}
				throw new Error(`Microsoft Teams: ${resource}.${operation} is not in the compiled library`);
			}
			if (resource === 'chatMember') {
				if (operation === 'getAll') {
					const path = `/v1.0/chats/${graphId(plain(parameters.chatId))}/members`;
					return await all(path, {}, parameters.returnAll ? undefined : (parameters.limit ?? 100));
				}
				if (operation === 'remove') {
					const chatId = plain(parameters.chatId);
					const membershipId = plain(parameters.membershipId);
					const path = `/v1.0/chats/${graphId(chatId)}/members/${graphId(membershipId)}`;
					sent(await graph('DELETE', path, {}, {}));
					return { success: true };
				}
				throw new Error(`Microsoft Teams: ${resource}.${operation} is not in the compiled library`);
			}
			if (resource === 'task') {
				if (operation === 'create') {
					const body: Record<string, unknown> = {
						planId: plain(parameters.planId),
						bucketId: plain(parameters.bucketId),
						title: parameters.title ?? '',
					};
					let assignedTo: unknown;
					for (const name of Object.keys(options)) {
						if (name !== 'assignedTo') {
							body[name] = options[name];
							continue;
						}
						// v1 keeps an assignee that is empty in the body, as it is.
						const user = options.assignedTo
							? locatorValue(options.assignedTo, true, 'Member')
							: options.assignedTo;
						if (user) assignedTo = user;
						else body.assignedTo = user;
					}
					if (assignedTo) body.assignments = assignment(assignedTo);
					return sent(await graph('POST', '/v1.0/planner/tasks', body, {}));
				}
				if (operation === 'get') {
					const path = `/v1.0/planner/tasks/${graphId(parameters.taskId)}`;
					return sent(await graph('GET', path, {}, {}));
				}
				if (operation === 'getAll') {
					const limit = parameters.returnAll ? undefined : (parameters.limit ?? 100);
					if ((parameters.tasksFor ?? 'member') === 'member') {
						const me = sent(await graph('GET', '/v1.0/me', {}, {}));
						const memberId = isObject(me) ? asText(me.id) : 'undefined';
						return await all(`/v1.0/users/${memberId}/planner/tasks`, {}, limit);
					}
					const path = `/v1.0/planner/plans/${graphId(plain(parameters.planId))}/tasks`;
					return await all(path, {}, limit);
				}
				if (operation !== 'deleteTask' && operation !== 'update') {
					throw new Error(
						`Microsoft Teams: ${resource}.${operation} is not in the compiled library`,
					);
				}
				// task.deleteTask and task.update: v1 reads the task for its etag first.
				const fields = parameters.updateFields ?? {};
				const body: Record<string, unknown> = {};
				let assignments: Record<string, unknown> | undefined;
				if (operation === 'update') {
					for (const name of Object.keys(fields)) {
						if (name === 'groupId') continue;
						if (name === 'assignedTo') {
							assignments = assignment(locatorValue(fields.assignedTo ?? '', true, 'Member'));
						} else if (name === 'bucketId' || name === 'planId') {
							body[name] = plain(fields[name]);
						} else {
							body[name] = fields[name];
						}
					}
					if (assignments) body.assignments = assignments;
				}
				const path = `/v1.0/planner/tasks/${graphId(parameters.taskId)}`;
				const task = sent(await graph('GET', path, {}, {}));
				const etag = isObject(task) ? task['@odata.etag'] : undefined;
				sent(await graph(operation === 'update' ? 'PATCH' : 'DELETE', path, body, {}, etag));
				return { success: true };
			}
			throw new Error(`Microsoft Teams: ${resource}.${operation} is not in the compiled library`);
		};

		// The converter calls the node once for each item.
		if (items === undefined || items.length === 1) return asItems(await one());
		const out: Item[] = [];
		for (const _item of items) {
			for (const entry of asItems(await one())) out.push(entry);
		}
		return out;
	},
});
