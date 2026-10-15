import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { Attachment } from 'chat';
import { OperationalError } from 'n8n-workflow';

import { InboundAttachmentAccessError } from '../../agent-chat-integration';
import { stringProperty } from '../../integration-helpers';

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
	throw new OperationalError('Microsoft Graph returned no file content');
}

/** The Graph token goes only to Graph, and only for content hosted on this message. */
function isHostedOn(messagePath: string, src: string): boolean {
	try {
		const url = new URL(src);
		const path = decodeURIComponent(url.pathname);
		const hosted = decodeURIComponent(`/v1.0${messagePath}/hostedContents/`);
		return url.origin === GRAPH_ORIGIN && path.startsWith(hosted) && !path.includes('/..');
	} catch {
		return false;
	}
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
	const messageId = stringProperty(activity, 'id');
	const conversationId = stringProperty(activity.conversation, 'id');
	if (!messageId || !conversationId) return;
	const enc = encodeURIComponent;

	const type = activity.conversation.conversationType;
	if (type === 'groupChat') {
		return { message: `/chats/${enc(conversationId)}/messages/${enc(messageId)}` };
	}
	if (type !== 'channel' || !isRecord(activity.channelData)) return;

	const teamId = stringProperty(activity.channelData.team, 'aadGroupId');
	const channelId = stringProperty(activity.channelData.channel, 'id');
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

interface DriveFolder {
	driveId: string;
	path: string;
}

/** Graph may percent-encode a path, but never a name, so both sides are compared decoded. */
function decodedPath(path: string): string {
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

/** Where Graph puts a drive item: its drive, and the path of its parent folder. */
function locationOf(item: unknown): DriveFolder | undefined {
	if (!isRecord(item)) return;
	const driveId = stringProperty(item.parentReference, 'driveId');
	const path = stringProperty(item.parentReference, 'path');
	return driveId && path ? { driveId, path: decodedPath(path) } : undefined;
}

function isInside(item: DriveFolder | undefined, folder: DriveFolder | undefined): boolean {
	if (!item || !folder || item.driveId !== folder.driveId) return false;
	return item.path === folder.path || item.path.startsWith(`${folder.path}/`);
}

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
 * channel's files folder, or one the sender owns and chose to share. The rest
 * of the team's library can have stricter permissions than the channel.
 */
async function downloadSharedFile(
	http: GraphHttp,
	contentUrl: string,
	channelFolder: () => Promise<DriveFolder | undefined>,
	senderId: string | undefined,
): Promise<Buffer> {
	const [item, folder] = await Promise.all([
		getOrExplain(
			http,
			`${GRAPH_V1}/shares/${shareIdOf(contentUrl)}/driveItem?$select=id,parentReference`,
			FILE_ACCESS_DENIED,
		),
		channelFolder(),
	]);
	const itemId = stringProperty(item, 'id');
	const driveId = isRecord(item) ? stringProperty(item.parentReference, 'driveId') : undefined;
	if (!itemId || !driveId)
		throw new OperationalError('Microsoft Graph did not say where the file is');

	const ownedBySender = async () => {
		if (!senderId) return false;
		const drive = await getOrExplain(
			http,
			`${GRAPH_V1}/drives/${encodeURIComponent(driveId)}?$select=owner`,
			FILE_ACCESS_DENIED,
		);
		return (
			isRecord(drive) &&
			isRecord(drive.owner) &&
			stringProperty(drive.owner.user, 'id') === senderId
		);
	};
	if (!isInside(locationOf(item), folder) && !(await ownedBySender())) {
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
	const senderId = isRecord(message.from) ? stringProperty(message.from.user, 'id') : undefined;
	let folder: Promise<DriveFolder | undefined> | undefined;
	const channelFolder = async () =>
		await (folder ??= paths.filesFolder
			? getOrExplain(
					http,
					`${GRAPH_V1}${paths.filesFolder}?$select=name,parentReference`,
					FILE_ACCESS_DENIED,
				).then((found) => {
					const parent = locationOf(found);
					const name = stringProperty(found, 'name');
					return parent && name ? { ...parent, path: `${parent.path}/${name}` } : undefined;
				})
			: Promise.resolve(undefined));

	const files: Attachment[] = [];
	for (const attachment of Array.isArray(message.attachments) ? message.attachments : []) {
		const contentUrl = stringProperty(attachment, 'contentUrl');
		if (stringProperty(attachment, 'contentType') !== 'reference' || !contentUrl) continue;
		files.push({
			type: 'file',
			name: stringProperty(attachment, 'name'),
			url: contentUrl,
			fetchData: async () => await downloadSharedFile(http, contentUrl, channelFolder, senderId),
		});
	}

	// Hosted content needs only the message read permission, not Files.Read.All.
	const body = stringProperty(message.body, 'content') ?? '';
	for (const [, src] of body.matchAll(/<img[^>]+src="([^"]+)"/g)) {
		if (!isHostedOn(paths.message, src)) continue;
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
