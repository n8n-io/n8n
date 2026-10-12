import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { Attachment } from 'chat';

import { InboundAttachmentAccessError } from '../../agent-chat-integration';

const GRAPH_ORIGIN = 'https://graph.microsoft.com';
const GRAPH_V1 = `${GRAPH_ORIGIN}/v1.0`;

export interface GraphHttp {
	get(
		url: string,
		config?: { responseType?: 'arraybuffer'; maxContentLength?: number },
	): Promise<{ data: unknown }>;
}

/**
 * The adapter keeps its token-carrying Graph client on the protected `app`.
 * The adapter version is pinned, so the shape is stable for that version.
 */
export function graphHttpOf(adapter: unknown): GraphHttp | undefined {
	if (!isRecord(adapter) || !isRecord(adapter.app) || !isRecord(adapter.app.graph)) return;
	const http: unknown = adapter.app.graph.http;
	return isGraphHttp(http) ? http : undefined;
}

function isGraphHttp(value: unknown): value is GraphHttp {
	return isRecord(value) && typeof value.get === 'function';
}

/** Axios returns a Buffer on Node, an ArrayBuffer elsewhere. */
function toBuffer(data: unknown): Buffer {
	if (Buffer.isBuffer(data)) return data;
	if (data instanceof ArrayBuffer) return Buffer.from(data);
	throw new Error('Microsoft Graph returned no file content');
}

/** The Graph token goes only to Graph, and only for content hosted on a message. */
function isHostedContentUrl(src: string): boolean {
	try {
		const url = new URL(src);
		return url.origin === GRAPH_ORIGIN && url.pathname.includes('/hostedContents/');
	} catch {
		return false;
	}
}

function stringAt(record: unknown, key: string): string | undefined {
	const value = isRecord(record) ? record[key] : undefined;
	return typeof value === 'string' ? value : undefined;
}

interface GraphMessagePaths {
	message: string;
	filesFolder?: string;
}

/**
 * The Graph paths of the message in a channel or group chat activity. A direct
 * message carries its files on the activity, so it has none.
 */
export function graphMessagePaths(activity: unknown): GraphMessagePaths | undefined {
	if (!isRecord(activity) || !isRecord(activity.conversation)) return;
	const messageId = stringAt(activity, 'id');
	const conversationId = stringAt(activity.conversation, 'id');
	if (!messageId || !conversationId) return;
	const enc = encodeURIComponent;

	const type = activity.conversation.conversationType;
	if (type === 'groupChat') {
		return { message: `/chats/${enc(conversationId)}/messages/${enc(messageId)}` };
	}
	if (type !== 'channel' || !isRecord(activity.channelData)) return;

	const teamId = stringAt(activity.channelData.team, 'aadGroupId');
	const channelId = stringAt(activity.channelData.channel, 'id');
	if (!teamId || !channelId) return;
	const rootId = /;messageid=([^;]+)/.exec(conversationId)?.[1] ?? messageId;
	const channel = `/teams/${enc(teamId)}/channels/${enc(channelId)}`;
	const root = `${channel}/messages/${enc(rootId)}`;
	return {
		message: rootId === messageId ? root : `${root}/replies/${enc(messageId)}`,
		filesFolder: `${channel}/filesFolder`,
	};
}

function statusOf(error: unknown): unknown {
	return isRecord(error) && isRecord(error.response) ? error.response.status : undefined;
}

/**
 * Graph addresses a sharing URL as `u!` plus its unpadded base64url form. The
 * docs list Files.ReadWrite.All for `/shares`, but Files.Read.All works.
 */
function shareIdOf(url: string): string {
	return `u!${Buffer.from(url, 'utf8').toString('base64url')}`;
}

const FILE_ACCESS_DENIED =
	'a Microsoft administrator has not allowed file access for this app yet. Ask them to grant admin consent for its Files.Read.All application permission in Microsoft Entra. After approval, it can take up to an hour to apply';

const MESSAGE_ACCESS_DENIED =
	"Microsoft Teams has not let this app read messages here yet. Update the app in Teams with the latest package from the agent's Teams settings";

const FOREIGN_FILE =
	"the file is not in this channel's files and the sender does not own it, so the agent does not read it";

async function getOrExplain(
	http: GraphHttp,
	url: string,
	accessDenied: string,
	config?: Parameters<GraphHttp['get']>[1],
): Promise<unknown> {
	try {
		return (await http.get(url, config)).data;
	} catch (error) {
		if (statusOf(error) === 403) throw new InboundAttachmentAccessError(accessDenied);
		throw error;
	}
}

const DOWNLOAD = {
	responseType: 'arraybuffer',
	maxContentLength: MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
} as const;

/**
 * The app token reads every file in the tenant, but a message can reference
 * any file. So only a file the conversation already holds is read: one in the
 * channel's files folder, or one the sender owns and chose to share.
 */
async function downloadSharedFile(
	http: GraphHttp,
	contentUrl: string,
	paths: GraphMessagePaths,
	senderId: string | undefined,
): Promise<Buffer> {
	const item = await getOrExplain(
		http,
		`${GRAPH_V1}/shares/${shareIdOf(contentUrl)}/driveItem?$select=id,parentReference`,
		FILE_ACCESS_DENIED,
	);
	const itemId = stringAt(item, 'id');
	const driveId = isRecord(item) ? stringAt(item.parentReference, 'driveId') : undefined;
	if (!itemId || !driveId) throw new Error('Microsoft Graph did not say where the file is');

	const inChannelFiles = async () => {
		if (!paths.filesFolder) return false;
		const folder = await getOrExplain(
			http,
			`${GRAPH_V1}${paths.filesFolder}?$select=parentReference`,
			FILE_ACCESS_DENIED,
		);
		return isRecord(folder) && stringAt(folder.parentReference, 'driveId') === driveId;
	};
	const ownedBySender = async () => {
		if (!senderId) return false;
		const drive = await getOrExplain(
			http,
			`${GRAPH_V1}/drives/${encodeURIComponent(driveId)}?$select=owner`,
			FILE_ACCESS_DENIED,
		);
		return (
			isRecord(drive) && isRecord(drive.owner) && stringAt(drive.owner.user, 'id') === senderId
		);
	};
	if (!(await inChannelFiles()) && !(await ownedBySender())) {
		throw new InboundAttachmentAccessError(FOREIGN_FILE);
	}

	const content = `${GRAPH_V1}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`;
	return toBuffer(await getOrExplain(http, content, FILE_ACCESS_DENIED, DOWNLOAD));
}

/**
 * Teams leaves files out of a channel or group chat activity, so they are read
 * from the message through Graph. A shared file is a `reference` to SharePoint
 * or OneDrive, and a pasted image is hosted content on the message itself.
 */
export async function fetchTeamsMessageFiles(
	http: GraphHttp,
	activity: unknown,
): Promise<Attachment[]> {
	const paths = graphMessagePaths(activity);
	if (!paths) return [];
	const message = await getOrExplain(http, `${GRAPH_V1}${paths.message}`, MESSAGE_ACCESS_DENIED);
	if (!isRecord(message)) return [];
	const senderId = isRecord(message.from) ? stringAt(message.from.user, 'id') : undefined;

	const files: Attachment[] = [];
	for (const attachment of Array.isArray(message.attachments) ? message.attachments : []) {
		const contentUrl = stringAt(attachment, 'contentUrl');
		if (stringAt(attachment, 'contentType') !== 'reference' || !contentUrl) continue;
		files.push({
			type: 'file',
			name: stringAt(attachment, 'name'),
			url: contentUrl,
			fetchData: async () => await downloadSharedFile(http, contentUrl, paths, senderId),
		});
	}

	// Hosted content needs only the message read permission, not Files.Read.All.
	const body = stringAt(message.body, 'content') ?? '';
	for (const [, src] of body.matchAll(/<img[^>]+src="([^"]+)"/g)) {
		if (!isHostedContentUrl(src)) continue;
		files.push({
			type: 'image',
			name: 'image',
			url: src,
			fetchData: async () =>
				toBuffer(await getOrExplain(http, src, MESSAGE_ACCESS_DENIED, DOWNLOAD)),
		});
	}
	return files;
}
