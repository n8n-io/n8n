import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, INodeParameterResourceLocator, INodeParameters } from 'n8n-workflow';

import { LiveSourceInputError, LiveSourceUnavailableError } from '../live-source.errors';
import type {
	KnowledgeLiveSourceProvider,
	LiveDocument,
	LiveEntry,
	LiveListRequest,
	LiveListResult,
	LiveRunContext,
	LiveSearchMatch,
	LiveSourceCapabilities,
	LiveSourceItem,
} from '../live-source-provider';
import { NodeOperationAdapter, type NodeOperation } from '../node-operation-adapter';
import { cutSnippet } from '../strategies/text-search';

export const SLACK_PROVIDER_ID = 'slack';
const NODE_TYPE = 'n8n-nodes-base.slack';
const NODE_TYPE_VERSION = 2.7;

/** The container and item types of the Slack provider, as `containerType` in the agent config. */
export const SLACK_CONTAINER_TYPES = {
	channel: 'channel',
	/** A thread, or a single message: its ts in the channel of `parentId`. */
	thread: 'thread',
} as const;

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;
/** `list` reads this far back by default. */
const DEFAULT_HISTORY_DAYS = 30;
const MAX_SEARCH_LIMIT = 50;
const TITLE_CHARS = 80;
/** Workspace domains and channel names, by credential id. Bounded, dropped when full. */
const MAX_CACHED_CREDENTIALS = 100;
const UNTITLED = '(empty message)';

const ARCHIVE_URL_REGEX =
	/^https:\/\/[a-z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)(?:\/p(\d{10})(\d{6}))?/i;
const CLIENT_URL_REGEX = /^https:\/\/app\.slack\.com\/client\/[A-Z0-9]+\/([A-Z0-9]+)/i;

interface SlackMessage {
	ts: string;
	text?: string;
	user?: string;
	bot_id?: string;
	subtype?: string;
	thread_ts?: string;
	reply_count?: number;
	latest_reply?: string;
}

interface SlackSearchHit {
	channel_id: string;
	message_ts: string;
	content?: string;
	permalink?: string;
	author_name?: string;
	channel_name?: string;
}

interface SlackChannel {
	id: string;
	name: string;
}

interface CredentialCache {
	channelNames: Map<string, string>;
	permalinkBase?: string;
}

function resourceLocator(id: string): INodeParameterResourceLocator {
	return { __rl: true, mode: 'id', value: id };
}

function tsToIso(ts: string): string | undefined {
	const seconds = Number(ts);
	return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : undefined;
}

function firstLine(text: string | undefined): string {
	const line = (text ?? '')
		.split('\n')
		.map((part) => part.trim())
		.find((part) => part.length > 0);
	if (!line) return UNTITLED;
	return line.length > TITLE_CHARS ? `${line.slice(0, TITLE_CHARS)}…` : line;
}

function isSlackMessage(value: IDataObject): value is IDataObject & SlackMessage {
	return typeof value.ts === 'string';
}

function isSlackSearchHit(value: IDataObject): value is IDataObject & SlackSearchHit {
	return typeof value.channel_id === 'string' && typeof value.message_ts === 'string';
}

/** Join and leave notices and the like are not knowledge. */
function isContentMessage(message: SlackMessage): boolean {
	return (
		message.subtype === undefined ||
		message.subtype === 'thread_broadcast' ||
		message.subtype === 'file_share'
	);
}

function messageLine(message: SlackMessage): string {
	const when = tsToIso(message.ts) ?? message.ts;
	const author = message.user ?? message.bot_id ?? 'unknown';
	return `[${when}] ${author}: ${(message.text ?? '').trim()}`;
}

/**
 * Slack as a live source over the Slack node v2.7. Channels are containers of
 * threads; a thread is read as one document. Message search runs through the
 * Real-time Search API with a user token.
 */
@Service()
export class SlackLiveSourceProvider implements KnowledgeLiveSourceProvider {
	readonly id = SLACK_PROVIDER_ID;

	readonly credentialTypes = ['slackOAuth2Api', 'slackApi'] as const;

	readonly capabilities: LiveSourceCapabilities = {
		nestedContainers: false,
		nativeContainerSearch: true,
		// The Slack terms forbid a stored copy of messages.
		persistableContent: false,
	};

	readonly defaultRetrieval = 'native';

	private readonly caches = new Map<string, CredentialCache>();

	constructor(private readonly adapter: NodeOperationAdapter) {}

	async resolveLink(ctx: LiveRunContext, url: string): Promise<LiveEntry | null> {
		const trimmed = url.trim();
		const archive = ARCHIVE_URL_REGEX.exec(trimmed);
		const channelId = archive?.[1] ?? CLIENT_URL_REGEX.exec(trimmed)?.[1];
		if (!channelId) return null;
		const channel = await this.getChannel(ctx, channelId);
		if (!archive?.[2]) {
			return {
				id: channel.id,
				kind: 'container',
				containerType: SLACK_CONTAINER_TYPES.channel,
				title: `#${channel.name}`,
				url: trimmed,
			};
		}
		const ts = `${archive[2]}.${archive[3]}`;
		const messages = await this.replies(ctx, channel.id, ts);
		const parent = messages[0];
		return {
			id: ts,
			kind: 'item',
			containerType: SLACK_CONTAINER_TYPES.thread,
			title: firstLine(parent?.text),
			url: trimmed,
			parentId: channel.id,
			updatedAt: tsToIso(parent?.latest_reply ?? ts),
		};
	}

	async list(
		ctx: LiveRunContext,
		container: LiveSourceItem,
		req: LiveListRequest,
	): Promise<LiveListResult> {
		if (container.containerType !== SLACK_CONTAINER_TYPES.channel) {
			throw new LiveSourceInputError(
				`A Slack item of type "${container.containerType}" cannot be listed. Read it instead.`,
			);
		}
		const limit = Math.min(req.limit ?? DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT);
		const oldest = new Date(Date.now() - DEFAULT_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
		const messages = await this.run(ctx, {
			resource: 'channel',
			operation: 'history',
			channelId: resourceLocator(container.id),
			returnAll: false,
			limit,
			filters: { oldest, inclusive: true },
		});
		const entries: LiveEntry[] = [];
		for (const message of messages) {
			if (!isSlackMessage(message) || !isContentMessage(message)) continue;
			entries.push(await this.toThreadEntry(ctx, container.id, message));
		}
		return { entries };
	}

	async search(
		ctx: LiveRunContext,
		scope: readonly LiveEntry[],
		query: string,
		limit: number,
	): Promise<LiveSearchMatch[]> {
		const channels = scope.filter(
			(entry) =>
				entry.kind === 'container' && entry.containerType === SLACK_CONTAINER_TYPES.channel,
		);
		const matches: LiveSearchMatch[] = [];
		const seen = new Set<string>();
		for (const channel of channels) {
			const name = (await this.getChannel(ctx, channel.id)).name;
			const hits = await this.run(ctx, {
				resource: 'message',
				operation: 'search',
				query,
				sort: 'relevance',
				limit: Math.min(limit, MAX_SEARCH_LIMIT),
				// The channel filter travels in the query; the channel id of each hit keeps the scope.
				options: { searchChannel: [name] },
			});
			for (const hit of hits) {
				if (!isSlackSearchHit(hit) || hit.channel_id !== channel.id) continue;
				const key = `${hit.channel_id}/${hit.message_ts}`;
				if (seen.has(key)) continue;
				seen.add(key);
				if (hit.permalink) this.learnPermalinkBase(ctx, hit.permalink);
				matches.push({
					entry: {
						id: hit.message_ts,
						kind: 'item',
						containerType: SLACK_CONTAINER_TYPES.thread,
						title: firstLine(hit.content),
						url: hit.permalink ?? (await this.permalink(ctx, hit.channel_id, hit.message_ts)),
						parentId: hit.channel_id,
						updatedAt: tsToIso(hit.message_ts),
					},
					snippet: cutSnippet(hit.content ?? ''),
				});
			}
		}
		return matches;
	}

	async read(ctx: LiveRunContext, entry: LiveEntry): Promise<LiveDocument> {
		if (entry.containerType === SLACK_CONTAINER_TYPES.channel) {
			throw new LiveSourceInputError(
				'This ref is a Slack channel. Use list_knowledge or search_knowledge with it, then read one of its threads.',
			);
		}
		if (!entry.parentId) {
			throw new LiveSourceInputError(
				'This Slack item has no channel. Pick it again from its channel.',
			);
		}
		let messages = await this.replies(ctx, entry.parentId, entry.id);
		const threadTs = messages[0]?.thread_ts;
		// A hit can be a reply. The whole thread is the document.
		if (threadTs && threadTs !== entry.id) {
			messages = await this.replies(ctx, entry.parentId, threadTs);
		}
		const parent = messages[0];
		if (!parent) {
			throw new LiveSourceUnavailableError(
				ctx.sourceId,
				'Slack returned no message for this thread',
			);
		}
		const text = messages
			.filter((message) => isContentMessage(message))
			.map(messageLine)
			.join('\n\n');
		return {
			id: entry.id,
			title: firstLine(parent.text),
			url: entry.url ?? (await this.permalink(ctx, entry.parentId, parent.ts)),
			text,
			updatedAt: tsToIso(parent.latest_reply ?? parent.ts),
		};
	}

	private async toThreadEntry(
		ctx: LiveRunContext,
		channelId: string,
		message: SlackMessage,
	): Promise<LiveEntry> {
		return {
			id: message.ts,
			kind: 'item',
			containerType: SLACK_CONTAINER_TYPES.thread,
			title: firstLine(message.text),
			url: await this.permalink(ctx, channelId, message.ts),
			parentId: channelId,
			updatedAt: tsToIso(message.latest_reply ?? message.ts),
		};
	}

	private async replies(
		ctx: LiveRunContext,
		channelId: string,
		ts: string,
	): Promise<SlackMessage[]> {
		const messages = await this.run(ctx, {
			resource: 'channel',
			operation: 'replies',
			channelId: resourceLocator(channelId),
			ts,
			returnAll: true,
			filters: {},
		});
		return messages.filter(isSlackMessage);
	}

	private async getChannel(ctx: LiveRunContext, channelId: string): Promise<SlackChannel> {
		const cache = this.cacheFor(ctx);
		const cached = cache.channelNames.get(channelId);
		if (cached) return { id: channelId, name: cached };
		const [channel] = await this.run(ctx, {
			resource: 'channel',
			operation: 'get',
			channelId: resourceLocator(channelId),
			options: {},
		});
		if (!isRecord(channel) || typeof channel.name !== 'string') {
			throw new LiveSourceUnavailableError(ctx.sourceId, 'Slack returned no channel');
		}
		cache.channelNames.set(channelId, channel.name);
		return { id: channelId, name: channel.name };
	}

	/**
	 * Permalinks follow one pattern per workspace. The first one costs a call;
	 * the rest are built from it.
	 */
	private async permalink(ctx: LiveRunContext, channelId: string, ts: string): Promise<string> {
		const cache = this.cacheFor(ctx);
		if (!cache.permalinkBase) {
			const [result] = await this.run(ctx, {
				resource: 'message',
				operation: 'getPermalink',
				channelId: resourceLocator(channelId),
				timestamp: ts,
			});
			if (!isRecord(result) || typeof result.permalink !== 'string') {
				throw new LiveSourceUnavailableError(ctx.sourceId, 'Slack returned no permalink');
			}
			this.learnPermalinkBase(ctx, result.permalink);
			return result.permalink;
		}
		return `${cache.permalinkBase}/archives/${channelId}/p${ts.replace('.', '')}`;
	}

	private learnPermalinkBase(ctx: LiveRunContext, permalink: string): void {
		const cache = this.cacheFor(ctx);
		if (cache.permalinkBase) return;
		const base = permalink.split('/archives/')[0];
		if (base && base !== permalink) cache.permalinkBase = base;
	}

	private cacheFor(ctx: LiveRunContext): CredentialCache {
		let cache = this.caches.get(ctx.credential.id);
		if (!cache) {
			if (this.caches.size >= MAX_CACHED_CREDENTIALS) this.caches.clear();
			cache = { channelNames: new Map() };
			this.caches.set(ctx.credential.id, cache);
		}
		return cache;
	}

	private async run(ctx: LiveRunContext, parameters: INodeParameters): Promise<IDataObject[]> {
		const operation: NodeOperation = {
			nodeType: NODE_TYPE,
			nodeTypeVersion: NODE_TYPE_VERSION,
			parameters,
		};
		return await this.adapter.execute(ctx, operation);
	}
}
