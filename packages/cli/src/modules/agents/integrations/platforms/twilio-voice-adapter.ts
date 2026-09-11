import { LockNamespace, type Logger, type LockService } from '@n8n/backend-common';
import type { HttpRequestClient } from '@n8n/backend-network';
import { isRecord } from '@n8n/utils/is-record';
import type {
	Adapter,
	AdapterPostableMessage,
	ChatInstance,
	FormattedContent,
	Message,
	RawMessage,
	StreamChunk,
	ThreadInfo,
	WebhookOptions,
} from 'chat';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { setTimeout as sleep } from 'timers/promises';

import type { CacheService } from '@/services/cache/cache.service';

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';
const XML_CONTENT_TYPE = { 'content-type': 'text/xml; charset=utf-8' };

/**
 * How long one TwiML request waits for speech before it answers with a holding
 * document. Twilio abandons a webhook that takes longer than 15 seconds.
 */
const HOP_WAIT_MS = 5_000;

/**
 * The first hop answers sooner. Until it returns the caller hears nothing at
 * all, so a quick "one moment" beats several seconds of silence. Later hops
 * can wait longer because the caller knows the agent is working.
 */
const FIRST_HOP_WAIT_MS = 3_200;

/**
 * Consecutive silent hops tolerated before the agent is declared too slow.
 * The count resets whenever a sentence is spoken, so this limits a quiet gap
 * (about a minute) and not the length of the answer.
 */
const MAX_SILENT_HOPS = 12;

/** Safety net so a call that drops mid-answer cannot leak its queue. */
const TURN_TTL_MS = 5 * 60_000;

/** How often a waiting hop re-reads the shared queue. */
const DRAIN_POLL_MS = 250;

const TURN_KEY_PREFIX = 'agents:twilio-voice-turn';

interface TwilioVoiceWebhook {
	AccountSid: string;
	CallSid: string;
	From: string;
	To: string;
	SpeechResult?: string;
}

interface TwilioIncomingPhoneNumber {
	sid: string;
	phone_number: string;
	voice_url: string | null;
}

interface ProducingTurn {
	accumulator: SentenceAccumulator;
	startedAt: number;
	firstSpeechAt?: number;
}

interface VoiceTurnState {
	pending: string[];
	finished: boolean;
	endsCall: boolean;
}

interface TwilioVoiceAdapterOptions {
	accountSid: string;
	authToken: string;
	phoneNumber: string;
	allowedCallers: string[];
	webhookUrl: string;
	verifySignature: boolean;
	turns: VoiceTurnStore;
	logger: Logger;
	chatSdk: Pick<
		typeof import('chat'),
		'Message' | 'markdownToPlainText' | 'parseMarkdown' | 'stringifyMarkdown'
	>;
}

function escapeXml(value: string): string {
	return value.replace(/[<>&"']/g, (character) => {
		const entities: Record<string, string> = {
			'<': '&lt;',
			'>': '&gt;',
			'&': '&amp;',
			'"': '&quot;',
			"'": '&apos;',
		};
		return entities[character] ?? character;
	});
}

function twiml(content: string): Response {
	return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`, {
		status: 200,
		headers: XML_CONTENT_TYPE,
	});
}

function sayTwiml(text: string): string {
	return `<Say>${escapeXml(text)}</Say>`;
}

function gatherTwiml(webhookUrl: string, prompt?: string, emptyAttempt = 0): string {
	const action = new URL(webhookUrl);
	action.searchParams.set('turn', randomUUID());
	if (emptyAttempt > 0) action.searchParams.set('empty', String(emptyAttempt));
	return `${prompt ? sayTwiml(prompt) : ''}<Gather input="speech" action="${escapeXml(action.toString())}" method="POST" speechTimeout="auto" actionOnEmptyResult="true"/>`;
}

function streamRedirectTwiml(webhookUrl: string, silentHops: number): string {
	const next = new URL(webhookUrl);
	next.searchParams.set('stream', '1');
	if (silentHops > 0) next.searchParams.set('silent', String(silentHops));
	return `<Redirect method="POST">${escapeXml(next.toString())}</Redirect>`;
}

function hasSpeech(text: string): boolean {
	return /[\p{L}\p{N}]/u.test(text);
}

/**
 * Words the opening chunk needs before it is worth speaking on its own.
 * Only the first chunk of an answer is cut early — see
 * {@link SentenceAccumulator.takeOpeningChunk}.
 */
const OPENING_CHUNK_MIN_WORDS = 5;

function wordCount(text: string): number {
	const trimmed = text.trim();
	return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Index just past the first clause boundary that already has enough words. */
function clauseCut(text: string, minWords: number): number | null {
	const boundary = /[,;:]\s/g;
	let match: RegExpExecArray | null;
	while ((match = boundary.exec(text)) !== null) {
		const end = match.index + 1;
		if (wordCount(text.slice(0, end)) >= minWords) return end;
	}
	return null;
}

/**
 * Index after `minWords` complete words. Each run of whitespace proves the word
 * before it finished, so a cut here never lands in the middle of one.
 */
function wordCut(text: string, minWords: number): number | null {
	const whitespace = /\s+/g;
	let words = 0;
	let match: RegExpExecArray | null;
	while ((match = whitespace.exec(text)) !== null) {
		if (++words >= minWords) return match.index;
	}
	return null;
}

/**
 * Split accumulated text into sentences that are safe to speak, plus the
 * trailing fragment that is not finished yet. A terminator only ends a
 * sentence when whitespace follows it, so a stream that stops mid-number
 * ("3.") never speaks half of "3.5".
 */
export function splitSentences(text: string): { complete: string[]; rest: string } {
	const complete: string[] = [];
	let start = 0;
	let index = 0;

	const take = (end: number) => {
		const sentence = text.slice(start, end).trim();
		if (sentence) complete.push(sentence);
		start = end;
	};

	while (index < text.length) {
		const character = text[index];
		if (character === '\n') {
			take(index);
			start = index + 1;
			index++;
			continue;
		}
		if (character === '.' || character === '!' || character === '?') {
			let end = index;
			while (end + 1 < text.length && '.!?'.includes(text[end + 1])) end++;
			const next = text[end + 1];
			if (next !== undefined && /\s/.test(next)) take(end + 1);
			index = end + 1;
			continue;
		}
		index++;
	}

	// Only the leading whitespace goes: a trailing space is what proves the
	// last word ended, and dropping it would weld it to the next delta.
	return { complete, rest: text.slice(start).replace(/^\s+/, '') };
}

/**
 * Producer side of one answer: turns the growing text the Chat SDK streams into
 * whole sentences. This lives on the main running the agent, which is the only
 * main that produces text for a turn.
 */
export class SentenceAccumulator {
	private buffer = '';

	private opened = false;

	/** Add streamed text and return whatever is now ready to speak. */
	push(delta: string): string[] {
		this.buffer += delta;
		const { complete, rest } = splitSentences(this.buffer);
		this.buffer = rest;

		const sentences = complete.filter(hasSpeech);
		if (sentences.length > 0) {
			this.opened = true;
			return sentences;
		}
		if (this.opened) return [];

		const opening = this.takeOpeningChunk();
		if (opening === null) return [];
		this.opened = true;
		return [opening];
	}

	/**
	 * Cut the first few words loose before the sentence they belong to has
	 * finished. Nothing is playing yet, so the caller hears silence until this
	 * lands. Later chunks wait for a sentence: by then the caller is listening
	 * to the previous one, which hides the generation time, and a whole
	 * sentence gives the speech engine the context to read it naturally.
	 */
	private takeOpeningChunk(): string | null {
		const cut =
			clauseCut(this.buffer, OPENING_CHUNK_MIN_WORDS) ??
			wordCut(this.buffer, OPENING_CHUNK_MIN_WORDS);
		if (cut === null) return null;

		const opening = this.buffer.slice(0, cut).trim();
		if (!hasSpeech(opening)) return null;
		this.buffer = this.buffer.slice(cut);
		return opening;
	}

	/**
	 * Add a message that arrives whole rather than streamed, such as an approval
	 * card. Nothing more is coming, so the trailing fragment is spoken too.
	 */
	whole(text: string): string[] {
		// Flush first: the leftover belongs to the streamed answer, and running
		// the two together would speak one sentence made of both.
		return [...this.end(), ...this.push(text), ...this.end()];
	}

	/** The fragment no terminator closed. Safe to call twice. */
	end(): string[] {
		const rest = this.buffer.trim();
		this.buffer = '';
		return hasSpeech(rest) ? [rest] : [];
	}
}

/**
 * The sentences of one answer, waiting to be spoken.
 *
 * The Chat SDK pushes text at us as it streams, but TwiML can only pull: every
 * document we return ends with a redirect asking for the next one. Twilio
 * spreads those hops across mains, so the queue lives in the shared cache under
 * the same lock discipline as {@link CallbackStore}.
 */
export class VoiceTurnStore {
	constructor(
		private readonly cache: CacheService,
		private readonly lockService: LockService,
		private readonly scope: string,
		private readonly ttlMs = TURN_TTL_MS,
	) {}

	/** Open a queue for a call. False when one is already open, so a Twilio
	 * retry joins the run in flight instead of asking the agent twice. */
	async create(callSid: string): Promise<boolean> {
		return await this.withTurnLock(callSid, async () => {
			if (await this.cache.get<VoiceTurnState>(this.key(callSid))) return false;
			await this.write(callSid, { pending: [], finished: false, endsCall: false });
			return true;
		});
	}

	async append(callSid: string, sentences: string[], endCall: boolean): Promise<void> {
		await this.mutate(callSid, (state) => ({
			...state,
			pending: [...state.pending, ...sentences],
			endsCall: state.endsCall || endCall,
		}));
	}

	/** Queue the last fragment and mark the answer complete. */
	async finish(callSid: string, tail: string[]): Promise<void> {
		await this.mutate(callSid, (state) => ({
			...state,
			pending: [...state.pending, ...tail],
			finished: true,
		}));
	}

	async delete(callSid: string): Promise<void> {
		await this.cache.delete(this.key(callSid));
	}

	/**
	 * Take whatever the agent has said, waiting up to `timeoutMs` for the first
	 * of it. Undefined means the call has no open turn.
	 */
	async drainWhenReady(callSid: string, timeoutMs: number): Promise<VoiceTurnState | undefined> {
		const deadline = Date.now() + timeoutMs;
		for (;;) {
			const state = await this.mutate(callSid, (current) => ({ ...current, pending: [] }));
			if (!state || state.finished || state.pending.length > 0) return state;
			if (Date.now() >= deadline) return state;
			await sleep(DRAIN_POLL_MS);
		}
	}

	/** Apply `update` under the call's lock and return the state as it was read. */
	private async mutate(
		callSid: string,
		update: (state: VoiceTurnState) => VoiceTurnState,
	): Promise<VoiceTurnState | undefined> {
		return await this.withTurnLock(callSid, async () => {
			const state = await this.cache.get<VoiceTurnState>(this.key(callSid));
			if (!state) return undefined;
			await this.write(callSid, update(state));
			return state;
		});
	}

	private async withTurnLock<T>(callSid: string, fn: () => Promise<T>): Promise<T> {
		return await this.lockService.withLease(
			LockNamespace.KNOWN_LOCKS,
			`${this.scope}:twilio-voice-turn:${callSid}`,
			fn,
		);
	}

	private async write(callSid: string, state: VoiceTurnState): Promise<void> {
		await this.cache.set(this.key(callSid), state, this.ttlMs);
	}

	private key(callSid: string): string {
		return `${TURN_KEY_PREFIX}:${this.scope}:${callSid}`;
	}
}

function formEntries(form: FormData): Array<[string, string]> {
	return [...form.entries()]
		.filter((entry): entry is [string, string] => typeof entry[1] === 'string')
		.sort(([leftKey, leftValue], [rightKey, rightValue]) =>
			leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey),
		);
}

function verifyTwilioSignature(
	requestUrl: string,
	form: FormData,
	signature: string,
	token: string,
) {
	const payload = formEntries(form).reduce(
		(value, [key, item]) => `${value}${key}${item}`,
		requestUrl,
	);
	const expected = Buffer.from(createHmac('sha1', token).update(payload).digest('base64'));
	const received = Buffer.from(signature);
	return expected.length === received.length && timingSafeEqual(expected, received);
}

function parseWebhook(form: FormData): TwilioVoiceWebhook | undefined {
	const AccountSid = form.get('AccountSid');
	const CallSid = form.get('CallSid');
	const From = form.get('From');
	const To = form.get('To');
	if (
		typeof AccountSid !== 'string' ||
		typeof CallSid !== 'string' ||
		typeof From !== 'string' ||
		typeof To !== 'string'
	) {
		return undefined;
	}
	const speechResult = form.get('SpeechResult');
	return {
		AccountSid,
		CallSid,
		From,
		To,
		...(typeof speechResult === 'string' ? { SpeechResult: speechResult } : {}),
	};
}

function postableText(message: AdapterPostableMessage): { text: string; endCall: boolean } {
	if (typeof message === 'string') return { text: message, endCall: false };
	if (isRecord(message) && typeof message.markdown === 'string') {
		return { text: message.markdown, endCall: false };
	}
	if (isRecord(message) && 'card' in message) {
		return {
			text: 'This request needs approval in n8n. Open n8n to continue it.',
			endCall: true,
		};
	}
	return { text: String(message), endCall: false };
}

export class TwilioVoiceClient {
	constructor(
		private readonly accountSid: string,
		private readonly authToken: string,
		private readonly httpClient: HttpRequestClient,
	) {}

	async getPhoneNumber(phoneNumber: string): Promise<TwilioIncomingPhoneNumber | undefined> {
		const response = await this.httpClient.request({
			method: 'GET',
			url: `${TWILIO_API_BASE}/Accounts/${this.accountSid}/IncomingPhoneNumbers.json`,
			qs: { PhoneNumber: phoneNumber },
			headers: { authorization: this.authorizationHeader() },
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});
		if (response.statusCode < 200 || response.statusCode >= 300 || !isRecord(response.body)) {
			throw new Error('Twilio could not load the selected phone number. Check the credential.');
		}
		const items = response.body.incoming_phone_numbers;
		if (!Array.isArray(items)) return undefined;
		for (const item of items) {
			if (
				isRecord(item) &&
				typeof item.sid === 'string' &&
				item.phone_number === phoneNumber &&
				(typeof item.voice_url === 'string' || item.voice_url === null)
			) {
				return { sid: item.sid, phone_number: phoneNumber, voice_url: item.voice_url };
			}
		}
		return undefined;
	}

	async setVoiceUrl(phoneNumberSid: string, voiceUrl: string): Promise<void> {
		const response = await this.httpClient.request({
			method: 'POST',
			url: `${TWILIO_API_BASE}/Accounts/${this.accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
			headers: {
				authorization: this.authorizationHeader(),
				'content-type': 'application/x-www-form-urlencoded',
			},
			body: { VoiceUrl: voiceUrl, VoiceMethod: 'POST' },
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});
		if (response.statusCode < 200 || response.statusCode >= 300) {
			throw new Error('Twilio could not update the selected phone number. Try again.');
		}
	}

	private authorizationHeader(): string {
		return `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`;
	}
}

export class TwilioVoiceAdapter implements Adapter<{ callSid: string }, TwilioVoiceWebhook> {
	readonly name = 'twilioVoice';

	readonly userName = 'n8n-agent';

	readonly persistThreadHistory = true;

	private chat?: ChatInstance;

	/** Turns this main is producing text for, with timings for the debug log. */
	private readonly producing = new Map<string, ProducingTurn>();

	constructor(private readonly options: TwilioVoiceAdapterOptions) {}

	async initialize(chat: ChatInstance): Promise<void> {
		this.chat = chat;
	}

	async disconnect(): Promise<void> {}

	async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
		const form = await request.formData();
		const signature = request.headers.get('x-twilio-signature');
		if (
			this.options.verifySignature &&
			(!signature || !verifyTwilioSignature(request.url, form, signature, this.options.authToken))
		) {
			return new Response('Invalid Twilio signature', { status: 401 });
		}

		const payload = parseWebhook(form);
		if (
			!payload ||
			payload.AccountSid !== this.options.accountSid ||
			payload.To !== this.options.phoneNumber
		) {
			return new Response('Invalid Twilio request', { status: 400 });
		}
		if (!this.options.allowedCallers.includes(payload.From)) {
			return twiml('<Say>This phone number is not allowed to call this agent.</Say><Hangup/>');
		}

		const url = new URL(request.url);
		if (url.searchParams.has('stream')) {
			return await this.speakNext(
				payload.CallSid,
				Number(url.searchParams.get('silent') ?? '0') || 0,
			);
		}

		const speech = payload.SpeechResult?.trim();
		if (!url.searchParams.has('turn')) {
			return twiml(gatherTwiml(this.options.webhookUrl, 'Hello. How can I help you?'));
		}
		if (!speech) {
			const emptyAttempt = Number(url.searchParams.get('empty') ?? '0') + 1;
			return emptyAttempt > 1
				? twiml("<Say>I still didn't hear anything. Goodbye.</Say><Hangup/>")
				: twiml(
						gatherTwiml(
							this.options.webhookUrl,
							"I didn't hear anything. Try again.",
							emptyAttempt,
						),
					);
		}

		const turnId = url.searchParams.get('turn');
		if (!turnId || !this.chat) return new Response('Invalid Twilio request', { status: 400 });

		await this.startTurn(payload.CallSid, this.parseMessage(payload, turnId), options);
		return await this.speakNext(payload.CallSid, 0, true);
	}

	private async startTurn(
		callSid: string,
		message: Message<TwilioVoiceWebhook>,
		options?: WebhookOptions,
	): Promise<void> {
		// An open queue means Twilio retried the same turn, so the run already in
		// flight answers it rather than asking the agent the question twice.
		if (!(await this.options.turns.create(callSid))) return;

		const turn: ProducingTurn = { accumulator: new SentenceAccumulator(), startedAt: Date.now() };
		this.producing.set(callSid, turn);
		this.options.logger.debug('[TwilioVoice] Turn started', { callSid });

		// Deliberately not awaited: the caller needs a TwiML document now, and
		// the answer arrives sentence by sentence through `postMessage`.
		void (async () => {
			try {
				await this.chat?.processMessage(this, this.encodeThreadId({ callSid }), message, options);
			} finally {
				this.producing.delete(callSid);
				await this.options.turns.finish(callSid, turn.accumulator.end());
				this.options.logger.debug('[TwilioVoice] Turn complete', {
					callSid,
					totalMs: Date.now() - turn.startedAt,
					firstSpeechMs: turn.firstSpeechAt ? turn.firstSpeechAt - turn.startedAt : null,
				});
			}
		})().catch((error: unknown) => {
			// The hop waiting on this queue falls through to its silent-hop limit.
			this.options.logger.error('[TwilioVoice] Turn failed to complete', { error, callSid });
		});
	}

	/**
	 * Answer one hop of the redirect chain with whatever the agent has said so
	 * far, then either ask Twilio to come back for more or hand the turn back
	 * to the caller.
	 */
	private async speakNext(
		callSid: string,
		silentHops: number,
		isFirstHop = false,
	): Promise<Response> {
		// The first hop holds the only silence the caller has not been warned
		// about, so give up on it quickly and say something.
		const waitMs = isFirstHop ? FIRST_HOP_WAIT_MS : HOP_WAIT_MS;
		const waitStartedAt = Date.now();
		const turn = await this.options.turns.drainWhenReady(callSid, waitMs);
		if (!turn) return twiml(gatherTwiml(this.options.webhookUrl));

		this.options.logger.debug('[TwilioVoice] Hop answered', {
			callSid,
			waitedMs: Date.now() - waitStartedAt,
			sentences: turn.pending.length,
			finished: turn.finished,
			silentHops,
		});

		const spoken = turn.pending.map(sayTwiml).join('');

		if (turn.finished) {
			await this.options.turns.delete(callSid);
			return twiml(spoken + (turn.endsCall ? '<Hangup/>' : gatherTwiml(this.options.webhookUrl)));
		}
		if (spoken) return twiml(spoken + streamRedirectTwiml(this.options.webhookUrl, 0));
		if (silentHops >= MAX_SILENT_HOPS) {
			await this.options.turns.delete(callSid);
			return twiml('<Say>Sorry, that is taking too long. Please try again.</Say><Hangup/>');
		}

		// Say something once, then wait quietly rather than talk over the agent.
		const holding = silentHops === 0 ? sayTwiml('One moment.') : '<Pause length="1"/>';
		return twiml(holding + streamRedirectTwiml(this.options.webhookUrl, silentHops + 1));
	}

	parseMessage(
		raw: TwilioVoiceWebhook,
		messageId: string = randomUUID(),
	): Message<TwilioVoiceWebhook> {
		const text = raw.SpeechResult?.trim() ?? '';
		return new this.options.chatSdk.Message({
			id: `${raw.CallSid}:${messageId}`,
			threadId: this.encodeThreadId({ callSid: raw.CallSid }),
			text,
			formatted: this.options.chatSdk.parseMarkdown(text),
			raw,
			author: {
				userId: raw.From,
				userName: raw.From,
				fullName: raw.From,
				isBot: false,
				isMe: false,
			},
			metadata: { dateSent: new Date(), edited: false },
			attachments: [],
			isMention: true,
		});
	}

	async postMessage(
		threadId: string,
		message: AdapterPostableMessage,
	): Promise<RawMessage<TwilioVoiceWebhook>> {
		return await this.queueSpeech(threadId, message);
	}

	async editMessage(
		threadId: string,
		_messageId: string,
		message: AdapterPostableMessage,
	): Promise<RawMessage<TwilioVoiceWebhook>> {
		return await this.queueSpeech(threadId, message);
	}

	/**
	 * Native streaming. The Chat SDK prefers this over post-and-edit, so text
	 * arrives as deltas the moment the agent writes them, with no polling
	 * interval in between. Returning a message tells the SDK not to also run
	 * its fallback, which would speak the whole answer a second time.
	 */
	async stream(
		threadId: string,
		textStream: AsyncIterable<string | StreamChunk>,
		_options?: unknown,
	): Promise<RawMessage<TwilioVoiceWebhook>> {
		const { callSid } = this.decodeThreadId(threadId);
		for await (const chunk of textStream) {
			const delta = typeof chunk === 'string' ? chunk : this.chunkText(chunk);
			if (delta) await this.queueSentences(callSid, (turn) => turn.accumulator.push(delta), false);
		}
		return this.sentMessage(callSid, threadId);
	}

	/** Text carried by a structured chunk, if it has any. */
	private chunkText(chunk: StreamChunk): string {
		return isRecord(chunk) && chunk.type === 'markdown_text' && typeof chunk.text === 'string'
			? chunk.text
			: '';
	}

	/**
	 * Hand a whole (non-streamed) message to the call's speech queue — an
	 * approval card, or an error. A message with no live turn (a tool resuming
	 * after the call ended) has nobody to speak to.
	 */
	private async queueSpeech(
		threadId: string,
		message: AdapterPostableMessage,
	): Promise<RawMessage<TwilioVoiceWebhook>> {
		const { callSid } = this.decodeThreadId(threadId);
		const { text, endCall } = postableText(message);
		const spoken = this.options.chatSdk.markdownToPlainText(text);
		await this.queueSentences(callSid, (turn) => turn.accumulator.whole(spoken), endCall);
		return this.sentMessage(callSid, threadId);
	}

	/** Queue sentences for a live turn, recording when the first one lands. */
	private async queueSentences(
		callSid: string,
		extract: (turn: ProducingTurn) => string[],
		endCall: boolean,
	): Promise<void> {
		const turn = this.producing.get(callSid);
		if (!turn) return;
		const sentences = extract(turn);
		if (sentences.length === 0 && !endCall) return;

		if (turn.firstSpeechAt === undefined && sentences.length > 0) {
			turn.firstSpeechAt = Date.now();
			this.options.logger.debug('[TwilioVoice] First sentence ready', {
				callSid,
				afterMs: turn.firstSpeechAt - turn.startedAt,
			});
		}
		await this.options.turns.append(callSid, sentences, endCall);
	}

	private sentMessage(callSid: string, threadId: string): RawMessage<TwilioVoiceWebhook> {
		return {
			id: `${callSid}:${randomUUID()}`,
			threadId,
			raw: {
				AccountSid: this.options.accountSid,
				CallSid: callSid,
				From: this.options.phoneNumber,
				To: '',
			},
		};
	}

	async fetchMessages(): Promise<{ messages: Message<TwilioVoiceWebhook>[] }> {
		return { messages: [] };
	}

	async fetchThread(threadId: string): Promise<ThreadInfo> {
		return { id: threadId, channelId: threadId, isDM: true, metadata: {} };
	}

	isDM(): boolean {
		return true;
	}

	channelIdFromThreadId(threadId: string): string {
		return threadId;
	}

	encodeThreadId({ callSid }: { callSid: string }): string {
		return `${this.name}:${callSid}`;
	}

	decodeThreadId(threadId: string): { callSid: string } {
		const prefix = `${this.name}:`;
		if (!threadId.startsWith(prefix)) throw new Error('Invalid Twilio call thread ID');
		return { callSid: threadId.slice(prefix.length) };
	}

	renderFormatted(content: FormattedContent): string {
		return this.options.chatSdk.markdownToPlainText(
			this.options.chatSdk.stringifyMarkdown(content),
		);
	}

	async startTyping(): Promise<void> {}

	async addReaction(): Promise<void> {}

	async removeReaction(): Promise<void> {}

	async deleteMessage(): Promise<void> {}
}
