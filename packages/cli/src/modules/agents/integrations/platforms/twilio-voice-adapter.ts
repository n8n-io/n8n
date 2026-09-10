import type { HttpRequestClient } from '@n8n/backend-network';
import { isRecord } from '@n8n/utils/is-record';
import type {
	Adapter,
	AdapterPostableMessage,
	ChatInstance,
	FormattedContent,
	Message,
	RawMessage,
	ThreadInfo,
	WebhookOptions,
} from 'chat';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01';
const XML_CONTENT_TYPE = { 'content-type': 'text/xml; charset=utf-8' };

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

interface TwilioVoiceAdapterOptions {
	accountSid: string;
	authToken: string;
	phoneNumber: string;
	allowedCallers: string[];
	webhookUrl: string;
	verifySignature: boolean;
	httpClient: HttpRequestClient;
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

function gatherTwiml(webhookUrl: string, prompt: string, emptyAttempt = 0): string {
	const action = new URL(webhookUrl);
	action.searchParams.set('turn', randomUUID());
	if (emptyAttempt > 0) action.searchParams.set('empty', String(emptyAttempt));
	return `<Say>${escapeXml(prompt)}</Say><Gather input="speech" action="${escapeXml(action.toString())}" method="POST" speechTimeout="auto" actionOnEmptyResult="true"/>`;
}

function waitingTwiml(webhookUrl: string, attempt = 1): Response {
	if (attempt > 3) {
		return twiml('<Say>This is taking too long. Try again later.</Say><Hangup/>');
	}
	const waitUrl = new URL(webhookUrl);
	waitUrl.searchParams.set('waiting', String(attempt + 1));
	return twiml(
		`<Say>Please wait while I work on that.</Say><Pause length="45"/><Redirect method="POST">${escapeXml(waitUrl.toString())}</Redirect>`,
	);
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

function twilioResponseError(body: unknown): string | undefined {
	return isRecord(body) && typeof body.message === 'string' ? body.message : undefined;
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

	async updateCall(callSid: string, content: string): Promise<void> {
		const response = await this.httpClient.request({
			method: 'POST',
			url: `${TWILIO_API_BASE}/Accounts/${this.accountSid}/Calls/${callSid}.json`,
			headers: {
				authorization: this.authorizationHeader(),
				'content-type': 'application/x-www-form-urlencoded',
			},
			body: { Twiml: `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>` },
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		});
		if (response.statusCode < 200 || response.statusCode >= 300) {
			const detail = twilioResponseError(response.body);
			throw new Error(
				`Twilio could not update the active call (HTTP ${response.statusCode})${detail ? `: ${detail}` : '.'}`,
			);
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

	private readonly client: TwilioVoiceClient;

	constructor(private readonly options: TwilioVoiceAdapterOptions) {
		this.client = new TwilioVoiceClient(options.accountSid, options.authToken, options.httpClient);
	}

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
		const waitingAttempt = Number(url.searchParams.get('waiting'));
		if (Number.isInteger(waitingAttempt) && waitingAttempt > 0) {
			return waitingTwiml(this.options.webhookUrl, waitingAttempt);
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
		const isNewTurn = await this.chat
			.getState()
			.setIfNotExists(`twilioVoice:turn:${turnId}`, true, 5 * 60 * 1000);
		if (!isNewTurn) return waitingTwiml(this.options.webhookUrl);

		const threadId = this.encodeThreadId({ callSid: payload.CallSid });
		const message = this.parseMessage(payload, turnId);
		if (options?.waitUntil) {
			// Let Express send the TwiML response before processing can update the active call.
			const processing = new Promise<void>((resolve, reject) => {
				setImmediate(() => {
					void this.chat?.processMessage(this, threadId, message).then(resolve, reject);
				});
			});
			options.waitUntil(processing);
		} else {
			await this.chat.processMessage(this, threadId, message);
		}
		return waitingTwiml(this.options.webhookUrl);
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
		const { callSid } = this.decodeThreadId(threadId);
		const { text, endCall } = postableText(message);
		const spokenText = this.options.chatSdk.markdownToPlainText(text).trim();
		const content = endCall
			? `<Say>${escapeXml(spokenText)}</Say><Hangup/>`
			: `${gatherTwiml(this.options.webhookUrl, spokenText)}<Say>Goodbye.</Say><Hangup/>`;
		await this.client.updateCall(callSid, content);
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

	async editMessage(
		threadId: string,
		_messageId: string,
		message: AdapterPostableMessage,
	): Promise<RawMessage<TwilioVoiceWebhook>> {
		return await this.postMessage(threadId, message);
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
