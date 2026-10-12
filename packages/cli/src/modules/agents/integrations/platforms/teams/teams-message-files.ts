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

/**
 * The Graph path of the message in a channel or group chat activity. A direct
 * message carries its files on the activity, so it has no path.
 */
export function graphMessagePath(activity: unknown): string | undefined {
	if (!isRecord(activity) || !isRecord(activity.conversation)) return;
	const messageId = stringAt(activity, 'id');
	const conversationId = stringAt(activity.conversation, 'id');
	if (!messageId || !conversationId) return;
	const enc = encodeURIComponent;

	const type = activity.conversation.conversationType;
	if (type === 'groupChat') return `/chats/${enc(conversationId)}/messages/${enc(messageId)}`;
	if (type !== 'channel' || !isRecord(activity.channelData)) return;

	const teamId = stringAt(activity.channelData.team, 'aadGroupId');
	const channelId = stringAt(activity.channelData.channel, 'id');
	if (!teamId || !channelId) return;
	const rootId = /;messageid=([^;]+)/.exec(conversationId)?.[1] ?? messageId;
	const root = `/teams/${enc(teamId)}/channels/${enc(channelId)}/messages/${enc(rootId)}`;
	return rootId === messageId ? root : `${root}/replies/${enc(messageId)}`;
}

function statusOf(error: unknown): unknown {
	return isRecord(error) && isRecord(error.response) ? error.response.status : undefined;
}

/** Graph addresses a sharing URL as `u!` plus its unpadded base64url form. */
function shareIdOf(url: string): string {
	return `u!${Buffer.from(url, 'utf8').toString('base64url')}`;
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
	const path = graphMessagePath(activity);
	if (!path) return [];
	const { data: message } = await http.get(`${GRAPH_V1}${path}`);
	if (!isRecord(message)) return [];

	const download = (url: string) => async () => {
		try {
			const { data } = await http.get(url, {
				responseType: 'arraybuffer',
				maxContentLength: MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
			});
			return toBuffer(data);
		} catch (error) {
			if (statusOf(error) !== 403) throw error;
			throw new InboundAttachmentAccessError(
				'a Microsoft administrator has not allowed file access for this app yet. Ask them to grant admin consent for its Files.Read.All permission in Microsoft Entra',
			);
		}
	};

	const files: Attachment[] = [];
	for (const attachment of Array.isArray(message.attachments) ? message.attachments : []) {
		const contentUrl = stringAt(attachment, 'contentUrl');
		if (stringAt(attachment, 'contentType') !== 'reference' || !contentUrl) continue;
		files.push({
			type: 'file',
			name: stringAt(attachment, 'name'),
			url: contentUrl,
			fetchData: download(`${GRAPH_V1}/shares/${shareIdOf(contentUrl)}/driveItem/content`),
		});
	}

	const body = stringAt(message.body, 'content') ?? '';
	for (const [, src] of body.matchAll(/<img[^>]+src="([^"]+)"/g)) {
		if (!isHostedContentUrl(src)) continue;
		files.push({ type: 'image', name: 'image', url: src, fetchData: download(src) });
	}
	return files;
}
