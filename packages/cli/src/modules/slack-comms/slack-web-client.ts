import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

const SLACK_API_BASE_URL = 'https://slack.com/api';

const TASK_UPDATE_TEXT_BUDGET = 256;
const PLAN_UPDATE_TITLE_BUDGET = 256;
const MARKDOWN_TEXT_BUDGET = 12000;
const BLOCKS_BUDGET = 50;
const UPDATE_STREAM_MIN_INTERVAL_MS = 1500;

const NATIVE_STREAM_FALLBACK_CODES = new Set([
	'missing_scope',
	'invalid_arguments',
	'channel_type_not_supported',
]);

export type SlackTaskStatus = 'pending' | 'in_progress' | 'complete' | 'error';

export type SlackStreamMode = 'native' | 'fallback';

export interface SlackSourceLink {
	type: 'url';
	url: string;
	text: string;
}

export type SlackChunk =
	| { type: 'markdown_text'; text: string }
	| {
			type: 'task_update';
			id: string;
			title: string;
			status: SlackTaskStatus;
			details?: string;
			output?: string;
			sources?: SlackSourceLink[];
	  }
	| { type: 'plan_update'; title: string }
	| { type: 'blocks'; blocks: unknown[] };

export interface StreamTarget {
	channel: string;
	threadTs: string;
	recipientUserId?: string;
	recipientTeamId?: string;
}

export interface StreamTransportFinal {
	markdown?: string;
	blocks?: unknown[];
}

export interface StreamTransport {
	open(target: StreamTarget): Promise<void>;
	append(chunks: SlackChunk[]): Promise<void>;
	close(final?: StreamTransportFinal): Promise<void>;
}

export interface SlackPostMessageArgs {
	channel: string;
	text: string;
	blocks?: unknown[];
	threadTs?: string;
}

export interface SlackPostEphemeralArgs {
	channel: string;
	user: string;
	text: string;
	blocks?: unknown[];
	threadTs?: string;
}

export interface SlackUpdateMessageArgs {
	channel: string;
	ts: string;
	text?: string;
	blocks?: unknown[];
}

export interface SlackFetchThreadHistoryArgs {
	channel: string;
	threadTs: string;
	limit?: number;
}

export interface SlackThreadMessage {
	ts: string;
	text: string;
	userId?: string;
	botId?: string;
}

export interface SlackUserInfo {
	email: string | null;
	tz: string | null;
}

export interface SlackSetStatusArgs {
	channelId: string;
	threadTs: string;
	status: string;
	loadingMessages?: string[];
}

interface SlackApiResult {
	ok: boolean;
	error?: string;
	[key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function truncateWithinBudget(value: string | undefined, budget: number): string | undefined {
	if (value === undefined) return undefined;
	if (value.length <= budget) return value;
	return budget > 0 ? value.slice(0, budget) : undefined;
}

function truncateMarkdown(text: string): string {
	return text.length > MARKDOWN_TEXT_BUDGET ? text.slice(0, MARKDOWN_TEXT_BUDGET) : text;
}

/**
 * Applies the per-chunk wire budgets before a chunk is sent: 256 combined
 * chars for a task update (title kept first, then details, then output),
 * 256 for a plan title, 12000 for markdown text, 50 blocks for a blocks
 * chunk. A chunk over budget returns `invalid_chunks` and kills the whole
 * append, so every chunk goes through this before it reaches the wire.
 */
export function truncateChunk(chunk: SlackChunk): SlackChunk {
	if (chunk.type === 'markdown_text') {
		const text = truncateMarkdown(chunk.text);
		return text === chunk.text ? chunk : { ...chunk, text };
	}

	if (chunk.type === 'plan_update') {
		return chunk.title.length > PLAN_UPDATE_TITLE_BUDGET
			? { ...chunk, title: chunk.title.slice(0, PLAN_UPDATE_TITLE_BUDGET) }
			: chunk;
	}

	if (chunk.type === 'blocks') {
		return chunk.blocks.length > BLOCKS_BUDGET
			? { ...chunk, blocks: chunk.blocks.slice(0, BLOCKS_BUDGET) }
			: chunk;
	}

	const title =
		chunk.title.length > TASK_UPDATE_TEXT_BUDGET
			? chunk.title.slice(0, TASK_UPDATE_TEXT_BUDGET)
			: chunk.title;
	let remaining = TASK_UPDATE_TEXT_BUDGET - title.length;

	const details = truncateWithinBudget(chunk.details, remaining);
	remaining -= details?.length ?? 0;

	const output = truncateWithinBudget(chunk.output, remaining);

	if (title === chunk.title && details === chunk.details && output === chunk.output) {
		return chunk;
	}
	return { ...chunk, title, details, output };
}

function fallbackTriggeringSlackErrorCode(error: unknown): string | undefined {
	if (!(error instanceof OperationalError)) return undefined;
	const code = error.tags.slackErrorCode;
	return typeof code === 'string' && NATIVE_STREAM_FALLBACK_CODES.has(code) ? code : undefined;
}

function statusEmoji(status: SlackTaskStatus): string {
	switch (status) {
		case 'complete':
			return '✅';
		case 'in_progress':
			return '🔄';
		case 'pending':
			return '⏳';
		case 'error':
			return '❌';
	}
}

interface SlackStreamApi {
	startStream(target: StreamTarget, chunks: SlackChunk[]): Promise<string>;
	appendStream(channel: string, ts: string, chunks: SlackChunk[]): Promise<void>;
	stopStream(channel: string, ts: string, final?: StreamTransportFinal): Promise<void>;
}

/**
 * Drives Slack's `chat.startStream` / `appendStream` / `stopStream` trio.
 * `open` requires a `thread_ts`, and — when targeting a channel rather than a
 * DM — both `recipientUserId` and `recipientTeamId`, or Slack returns
 * `missing_recipient_team_id`. Open exactly once per run: it is Tier 2 rate
 * limited, unlike `append`.
 */
export class NativeStreamTransport implements StreamTransport {
	private opened = false;
	private channel = '';
	private ts = '';

	constructor(private readonly api: SlackStreamApi) {}

	async open(target: StreamTarget): Promise<void> {
		if (this.opened) {
			throw new OperationalError('Slack stream transport is already open');
		}
		if (!target.threadTs) {
			throw new OperationalError('Slack chat.startStream requires a thread_ts', {
				tags: { slackErrorCode: 'missing_thread_ts' },
			});
		}
		if (Boolean(target.recipientUserId) !== Boolean(target.recipientTeamId)) {
			throw new OperationalError(
				'Slack chat.startStream requires both recipient_user_id and recipient_team_id when targeting a channel',
				{ tags: { slackErrorCode: 'missing_recipient_team_id' } },
			);
		}

		this.opened = true;
		this.channel = target.channel;
		this.ts = await this.api.startStream(target, []);
	}

	async append(chunks: SlackChunk[]): Promise<void> {
		await this.api.appendStream(this.channel, this.ts, chunks);
	}

	async close(final?: StreamTransportFinal): Promise<void> {
		await this.api.stopStream(this.channel, this.ts, final);
	}
}

interface SlackMessageApi {
	postMessage(args: SlackPostMessageArgs): Promise<{ ts: string }>;
	updateMessage(args: SlackUpdateMessageArgs): Promise<void>;
}

/**
 * Fallback transport for workspaces/scopes that can't use native streaming:
 * posts one placeholder message, then rewrites it with `chat.update` as a
 * mrkdwn checklist. Rewrites are throttled to at least 1.5s apart; a rewrite
 * arriving inside that window is deferred to fire once the window elapses,
 * and `close` always flushes the latest state immediately.
 */
export class UpdateStreamTransport implements StreamTransport {
	private opened = false;
	private channel = '';
	private ts = '';
	private planTitle: string | undefined;
	private markdown = '';
	private readonly tasks = new Map<string, { title: string; status: SlackTaskStatus }>();
	private lastFlushAt = -Infinity;
	private pendingFlush: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly api: SlackMessageApi) {}

	async open(target: StreamTarget): Promise<void> {
		if (this.opened) {
			throw new OperationalError('Slack stream transport is already open');
		}
		this.opened = true;
		this.channel = target.channel;
		const { ts } = await this.api.postMessage({
			channel: target.channel,
			text: 'Working…',
			threadTs: target.threadTs,
		});
		this.ts = ts;
	}

	async append(chunks: SlackChunk[]): Promise<void> {
		for (const chunk of chunks) {
			this.apply(truncateChunk(chunk));
		}
		await this.flush();
	}

	async close(final?: StreamTransportFinal): Promise<void> {
		this.clearPendingFlush();
		if (final?.markdown !== undefined) this.markdown = truncateMarkdown(final.markdown);
		await this.flush(true, final?.blocks);
	}

	private apply(chunk: SlackChunk): void {
		if (chunk.type === 'markdown_text') {
			this.markdown += chunk.text;
		} else if (chunk.type === 'plan_update') {
			this.planTitle = chunk.title;
		} else if (chunk.type === 'task_update') {
			this.tasks.set(chunk.id, { title: chunk.title, status: chunk.status });
		}
	}

	private async flush(force = false, blocks?: unknown[]): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastFlushAt;
		if (!force && elapsed < UPDATE_STREAM_MIN_INTERVAL_MS) {
			this.schedulePendingFlush(UPDATE_STREAM_MIN_INTERVAL_MS - elapsed);
			return;
		}
		this.clearPendingFlush();
		this.lastFlushAt = now;
		await this.api.updateMessage({
			channel: this.channel,
			ts: this.ts,
			text: this.render(),
			blocks,
		});
	}

	private schedulePendingFlush(delay: number): void {
		if (this.pendingFlush) return;
		this.pendingFlush = setTimeout(() => {
			this.pendingFlush = undefined;
			void this.flush(true);
		}, delay);
	}

	private clearPendingFlush(): void {
		if (this.pendingFlush) {
			clearTimeout(this.pendingFlush);
			this.pendingFlush = undefined;
		}
	}

	private render(): string {
		const lines: string[] = [];
		if (this.planTitle) lines.push(`*${this.planTitle}*`);
		for (const task of this.tasks.values()) {
			lines.push(`${statusEmoji(task.status)} ${task.title}`);
		}
		if (this.markdown) lines.push(this.markdown);
		return lines.join('\n');
	}
}

/**
 * Thin wrapper over the Slack Web API (via `OutboundHttp`, for SSRF/proxy
 * parity with the rest of n8n's outbound calls). Every call takes the bot
 * token as a parameter rather than reading it from injected config, so this
 * client stays usable before an install/config seam exists and works for any
 * number of installs.
 */
@Service()
export class SlackWebClient {
	constructor(private readonly outboundHttp: OutboundHttp) {}

	async getBotUserId(token: string): Promise<string> {
		const result = await this.callChecked(token, 'auth.test', {});
		const userId = readString(result.user_id);
		if (!userId) {
			throw new OperationalError('Slack auth.test did not return a bot user id');
		}
		return userId;
	}

	async getUserInfo(token: string, userId: string): Promise<SlackUserInfo> {
		const result = await this.callCheckedGet(token, 'users.info', { user: userId });
		if (!isRecord(result.user)) return { email: null, tz: null };

		const profile = isRecord(result.user.profile) ? result.user.profile : undefined;
		const email = profile ? readString(profile.email) : undefined;
		const tz = readString(result.user.tz);

		return {
			email: email && email.length > 0 ? email : null,
			tz: tz && tz.length > 0 ? tz : null,
		};
	}

	async getUserEmail(token: string, userId: string): Promise<string | null> {
		const { email } = await this.getUserInfo(token, userId);
		return email;
	}

	async lookupUserByEmail(token: string, email: string): Promise<string | null> {
		const result = await this.callGet(token, 'users.lookupByEmail', { email });
		if (!result.ok) {
			if (result.error === 'users_not_found') return null;
			throw new OperationalError(
				`Slack API call to "users.lookupByEmail" failed: ${result.error ?? 'unknown_error'}`,
				{ tags: { slackErrorCode: result.error ?? 'unknown_error' } },
			);
		}
		if (!isRecord(result.user)) return null;
		return readString(result.user.id) ?? null;
	}

	async openDm(token: string, slackUserId: string): Promise<string> {
		const result = await this.callChecked(token, 'conversations.open', { users: slackUserId });
		if (!isRecord(result.channel)) {
			throw new OperationalError('Slack conversations.open did not return a channel');
		}
		const id = readString(result.channel.id);
		if (!id) {
			throw new OperationalError('Slack conversations.open did not return a channel id');
		}
		return id;
	}

	async postMessage(token: string, args: SlackPostMessageArgs): Promise<{ ts: string }> {
		const result = await this.callChecked(token, 'chat.postMessage', {
			channel: args.channel,
			text: args.text,
			blocks: args.blocks,
			thread_ts: args.threadTs,
		});
		const ts = readString(result.ts);
		if (!ts) {
			throw new OperationalError('Slack chat.postMessage did not return a message timestamp');
		}
		return { ts };
	}

	async postEphemeral(token: string, args: SlackPostEphemeralArgs): Promise<void> {
		await this.callChecked(token, 'chat.postEphemeral', {
			channel: args.channel,
			user: args.user,
			text: args.text,
			blocks: args.blocks,
			thread_ts: args.threadTs,
		});
	}

	async updateMessage(token: string, args: SlackUpdateMessageArgs): Promise<void> {
		await this.callChecked(token, 'chat.update', {
			channel: args.channel,
			ts: args.ts,
			text: args.text,
			blocks: args.blocks,
		});
	}

	async fetchThreadHistory(
		token: string,
		args: SlackFetchThreadHistoryArgs,
	): Promise<SlackThreadMessage[]> {
		const result = await this.callChecked(token, 'conversations.replies', {
			channel: args.channel,
			ts: args.threadTs,
			limit: args.limit,
		});
		if (!Array.isArray(result.messages)) return [];

		const messages: SlackThreadMessage[] = [];
		for (const entry of result.messages) {
			if (!isRecord(entry)) continue;
			const ts = readString(entry.ts);
			const text = readString(entry.text);
			if (ts === undefined || text === undefined) continue;
			messages.push({ ts, text, userId: readString(entry.user), botId: readString(entry.bot_id) });
		}
		return messages;
	}

	async setStatus(token: string, args: SlackSetStatusArgs): Promise<void> {
		await this.callChecked(token, 'assistant.threads.setStatus', {
			channel_id: args.channelId,
			thread_ts: args.threadTs,
			status: args.status,
			loading_messages: args.loadingMessages,
		});
	}

	/**
	 * Opens a stream transport for `target`, honouring `mode`. In `'native'`
	 * mode, a `startStream` failure with `missing_scope`, `invalid_arguments`
	 * or `channel_type_not_supported` falls back to the update transport
	 * instead of failing the run.
	 */
	async openStream(
		token: string,
		target: StreamTarget,
		mode: SlackStreamMode,
	): Promise<StreamTransport> {
		if (mode === 'fallback') {
			const transport = this.createUpdateTransport(token);
			await transport.open(target);
			return transport;
		}

		const native = this.createNativeTransport(token);
		try {
			await native.open(target);
			return native;
		} catch (error) {
			if (!fallbackTriggeringSlackErrorCode(error)) throw error;
			const fallback = this.createUpdateTransport(token);
			await fallback.open(target);
			return fallback;
		}
	}

	private createNativeTransport(token: string): NativeStreamTransport {
		return new NativeStreamTransport({
			startStream: async (target, chunks) => {
				const payload: Record<string, unknown> = {
					channel: target.channel,
					thread_ts: target.threadTs,
					task_display_mode: 'plan',
					chunks: chunks.map(truncateChunk),
				};
				if (target.recipientUserId) payload.recipient_user_id = target.recipientUserId;
				if (target.recipientTeamId) payload.recipient_team_id = target.recipientTeamId;

				const result = await this.callChecked(token, 'chat.startStream', payload);
				const ts = readString(result.ts);
				if (!ts) {
					throw new OperationalError('Slack chat.startStream did not return a stream timestamp');
				}
				return ts;
			},
			appendStream: async (channel, ts, chunks) => {
				await this.callChecked(token, 'chat.appendStream', {
					channel,
					ts,
					chunks: chunks.map(truncateChunk),
				});
			},
			stopStream: async (channel, ts, final) => {
				await this.callChecked(token, 'chat.stopStream', {
					channel,
					ts,
					markdown_text:
						final?.markdown !== undefined ? truncateMarkdown(final.markdown) : undefined,
					blocks: final?.blocks,
				});
			},
		});
	}

	private createUpdateTransport(token: string): UpdateStreamTransport {
		return new UpdateStreamTransport({
			postMessage: async (args) => await this.postMessage(token, args),
			updateMessage: async (args) => await this.updateMessage(token, args),
		});
	}

	private async call(
		token: string,
		method: string,
		payload: Record<string, unknown>,
	): Promise<SlackApiResult> {
		return await this.outboundHttp.requests().request<SlackApiResult>({
			url: `${SLACK_API_BASE_URL}/${method}`,
			method: 'POST',
			json: true,
			headers: { Authorization: `Bearer ${token}` },
			body: payload,
		});
	}

	private async callChecked(
		token: string,
		method: string,
		payload: Record<string, unknown>,
	): Promise<SlackApiResult> {
		const result = await this.call(token, method, payload);
		if (!result.ok) {
			throw new OperationalError(
				`Slack API call to "${method}" failed: ${result.error ?? 'unknown_error'}`,
				{
					tags: { slackErrorCode: result.error ?? 'unknown_error' },
				},
			);
		}
		return result;
	}

	/**
	 * Slack's legacy read methods (`users.info`, `users.lookupByEmail`, …) do
	 * not accept a JSON body — the params must ride the query string instead,
	 * or Slack silently ignores them and the call resolves as if the target
	 * didn't exist. The token still travels in the Authorization header, never
	 * in the URL.
	 */
	private async callGet(
		token: string,
		method: string,
		query: Record<string, string>,
	): Promise<SlackApiResult> {
		const search = new URLSearchParams(query).toString();
		return await this.outboundHttp.requests().request<SlackApiResult>({
			url: `${SLACK_API_BASE_URL}/${method}${search ? `?${search}` : ''}`,
			method: 'GET',
			json: true,
			headers: { Authorization: `Bearer ${token}` },
		});
	}

	private async callCheckedGet(
		token: string,
		method: string,
		query: Record<string, string>,
	): Promise<SlackApiResult> {
		const result = await this.callGet(token, method, query);
		if (!result.ok) {
			throw new OperationalError(
				`Slack API call to "${method}" failed: ${result.error ?? 'unknown_error'}`,
				{
					tags: { slackErrorCode: result.error ?? 'unknown_error' },
				},
			);
		}
		return result;
	}
}
