import type {
	Adapter,
	AdapterPostableMessage,
	Attachment,
	ChatInstance,
	EmojiValue,
	FetchOptions,
	FetchResult,
	FormattedContent,
	Message,
	MessageData,
	MessageSubject,
	RawMessage,
	ThreadInfo,
	WebhookOptions,
} from 'chat';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type {
	AgentEmailReplyAttachment,
	AgentEmailServiceClient,
} from './agent-email-service-client';

type EmailThreadId = {
	inboxId: string;
	threadId: string;
};

export type AgentMailInboundAttachment = {
	attachment_id: string;
	filename?: string;
	size?: number;
	content_type?: string;
	content_disposition?: 'inline' | 'attachment';
	content_id?: string;
};

export type AgentMailMessageReceived = {
	event_id: string;
	event_type: 'message.received';
	message: {
		inbox_id: string;
		thread_id: string;
		message_id: string;
		from?: string | string[];
		from_?: string | string[];
		subject?: string;
		text?: string;
		timestamp?: string;
		created_at?: string;
		attachments?: AgentMailInboundAttachment[];
	};
};

type MessageConstructor = new (
	data: MessageData<AgentMailMessageReceived>,
) => Message<AgentMailMessageReceived>;

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
/** AgentMail inline `content` replies are capped at 6 MB for the whole request. */
const AGENTMAIL_REPLY_MAX_BYTES = Math.floor(5.5 * 1024 * 1024);

export class EmailAdapter implements Adapter<EmailThreadId, AgentMailMessageReceived> {
	readonly name = 'email';

	readonly userName = 'email-agent';

	readonly persistThreadHistory = true;

	private chat: ChatInstance | null = null;

	private readonly latestMessageByThread = new Map<string, string>();

	constructor(
		private readonly config: {
			channelId: string;
			callbackSecret: string;
			serviceClient: AgentEmailServiceClient;
			Message: MessageConstructor;
		},
	) {}

	async initialize(chat: ChatInstance): Promise<void> {
		this.chat = chat;
	}

	encodeThreadId(data: EmailThreadId): string {
		return `email:${Buffer.from(data.inboxId).toString('base64url')}:${Buffer.from(data.threadId).toString('base64url')}`;
	}

	decodeThreadId(threadId: string): EmailThreadId {
		const [platform, inboxId, agentMailThreadId] = threadId.split(':');
		if (platform !== this.name || !inboxId || !agentMailThreadId) {
			throw new Error(`Invalid Email thread ID: ${threadId}`);
		}
		return {
			inboxId: Buffer.from(inboxId, 'base64url').toString(),
			threadId: Buffer.from(agentMailThreadId, 'base64url').toString(),
		};
	}

	channelIdFromThreadId(threadId: string): string {
		const { inboxId } = this.decodeThreadId(threadId);
		return `email:${Buffer.from(inboxId).toString('base64url')}`;
	}

	async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
		const rawBody = Buffer.from(await request.arrayBuffer());
		if (!this.verifyCallbackSignature(request.headers, rawBody)) {
			return new Response('Invalid signature', { status: 401 });
		}

		let event: AgentMailMessageReceived;
		try {
			event = JSON.parse(rawBody.toString('utf8')) as AgentMailMessageReceived;
		} catch {
			return new Response('Invalid JSON', { status: 400 });
		}
		if (
			event.event_type !== 'message.received' ||
			!event.message?.inbox_id ||
			!event.message.thread_id ||
			!event.message.message_id
		) {
			return new Response('Unsupported email payload', { status: 400 });
		}
		const attachments = this.ingestibleAttachments(event.message.attachments);
		if (typeof event.message.text !== 'string' && attachments.length === 0) {
			return new Response('Unsupported email payload', { status: 400 });
		}
		if (event.message.inbox_id !== this.config.channelId) {
			return new Response('Unknown inbox', { status: 404 });
		}

		const threadId = this.encodeThreadId({
			inboxId: event.message.inbox_id,
			threadId: event.message.thread_id,
		});
		this.latestMessageByThread.set(threadId, event.message.message_id);
		void this.chat?.processMessage(this, threadId, async () => this.parseMessage(event), options);

		return new Response('OK');
	}

	parseMessage(raw: AgentMailMessageReceived): Message<AgentMailMessageReceived> {
		const sender = this.parseSender(raw.message.from_ ?? raw.message.from);
		const text = raw.message.text ?? '';
		const threadId = this.encodeThreadId({
			inboxId: raw.message.inbox_id,
			threadId: raw.message.thread_id,
		});

		return new this.config.Message({
			id: raw.message.message_id,
			threadId,
			text,
			formatted: {
				type: 'root',
				children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }],
			},
			raw,
			isMention: true,
			author: {
				userId: sender.email,
				userName: sender.email,
				fullName: sender.name,
				email: sender.email,
				isBot: false,
				isMe: false,
			},
			metadata: {
				dateSent: new Date(raw.message.timestamp ?? raw.message.created_at ?? Date.now()),
				edited: false,
			},
			attachments: this.mapAttachments(raw),
		});
	}

	async postMessage(
		threadId: string,
		message: AdapterPostableMessage,
	): Promise<RawMessage<AgentMailMessageReceived>> {
		const triggeringMessageId = this.latestMessageByThread.get(threadId);
		if (!triggeringMessageId) throw new Error('No inbound Email message is available to reply to');

		const text = this.renderPostable(message);
		const attachments = this.fitReplyAttachments(
			text,
			await this.extractOutboundAttachments(message),
		);
		if (attachments.length > 0) {
			await this.config.serviceClient.reply(
				this.config.channelId,
				triggeringMessageId,
				text,
				attachments,
			);
		} else {
			await this.config.serviceClient.reply(this.config.channelId, triggeringMessageId, text);
		}
		return {
			id: `email-reply-${randomUUID()}`,
			threadId,
			raw: {
				event_id: `local-${randomUUID()}`,
				event_type: 'message.received',
				message: {
					inbox_id: this.config.channelId,
					thread_id: this.decodeThreadId(threadId).threadId,
					message_id: triggeringMessageId,
					text,
				},
			},
		};
	}

	async fetchMessages(
		_threadId: string,
		_options?: FetchOptions,
	): Promise<FetchResult<AgentMailMessageReceived>> {
		return { messages: [] };
	}

	async fetchThread(threadId: string): Promise<ThreadInfo> {
		return {
			id: threadId,
			channelId: this.channelIdFromThreadId(threadId),
			isDM: true,
			metadata: this.decodeThreadId(threadId),
		};
	}

	async fetchSubject(raw: AgentMailMessageReceived): Promise<MessageSubject | null> {
		return {
			id: raw.message.thread_id,
			type: 'email',
			title: raw.message.subject,
			raw,
		};
	}

	renderFormatted(content: FormattedContent): string {
		const text: string[] = [];
		const visit = (node: unknown) => {
			if (!node || typeof node !== 'object') return;
			if ('value' in node && typeof node.value === 'string') text.push(node.value);
			if ('children' in node && Array.isArray(node.children)) node.children.forEach(visit);
		};
		visit(content);
		return text.join('');
	}

	async startTyping(): Promise<void> {}

	async editMessage(): Promise<RawMessage<AgentMailMessageReceived>> {
		throw new Error('Email replies cannot be edited');
	}

	async deleteMessage(): Promise<void> {}

	async addReaction(
		_threadId: string,
		_messageId: string,
		_emoji: EmojiValue | string,
	): Promise<void> {}

	async removeReaction(
		_threadId: string,
		_messageId: string,
		_emoji: EmojiValue | string,
	): Promise<void> {}

	private ingestibleAttachments(
		attachments: AgentMailInboundAttachment[] | undefined,
	): AgentMailInboundAttachment[] {
		if (!Array.isArray(attachments)) return [];
		return attachments.filter(isIngestibleAttachment);
	}

	private mapAttachments(raw: AgentMailMessageReceived): Attachment[] {
		return this.ingestibleAttachments(raw.message.attachments).map((attachment) => {
			const mimeType = attachment.content_type ?? 'application/octet-stream';
			return {
				type: mimeType.startsWith('image/') ? 'image' : 'file',
				name: attachment.filename ?? 'attachment',
				mimeType,
				size: attachment.size,
				url: this.config.serviceClient.getSignedAttachmentUrl(
					raw.message.inbox_id,
					raw.message.message_id,
					attachment.attachment_id,
					this.config.callbackSecret,
				),
				fetchData: async () =>
					await this.config.serviceClient.getAttachment(
						raw.message.inbox_id,
						raw.message.message_id,
						attachment.attachment_id,
					),
			};
		});
	}

	private async extractOutboundAttachments(
		message: AdapterPostableMessage,
	): Promise<AgentEmailReplyAttachment[]> {
		if (typeof message !== 'object' || message === null || !('attachments' in message)) {
			return [];
		}
		const rawAttachments = 'attachments' in message ? message.attachments : undefined;
		if (!Array.isArray(rawAttachments)) return [];
		const attachments: AgentEmailReplyAttachment[] = [];
		for (const attachment of rawAttachments) {
			const converted = await toEmailReplyAttachment(attachment);
			if (converted) attachments.push(converted);
		}
		return attachments;
	}

	private fitReplyAttachments(
		text: string,
		attachments: AgentEmailReplyAttachment[],
	): AgentEmailReplyAttachment[] {
		if (Buffer.byteLength(JSON.stringify({ text, attachments })) > AGENTMAIL_REPLY_MAX_BYTES) {
			throw new Error('Email reply with inline attachments exceeds the AgentMail size limit');
		}
		return attachments;
	}

	private renderPostable(message: AdapterPostableMessage): string {
		if (typeof message === 'string') return message;
		if ('raw' in message && typeof message.raw === 'string') return message.raw;
		if ('markdown' in message && typeof message.markdown === 'string') return message.markdown;
		if ('ast' in message) return this.renderFormatted(message.ast);
		if ('text' in message && typeof message.text === 'string') return message.text;
		throw new Error('Email supports plain-text messages only');
	}

	private parseSender(value: string | string[] | undefined): { email: string; name: string } {
		const sender = Array.isArray(value) ? value[0] : value;
		if (!sender) return { email: 'unknown@example.invalid', name: 'Unknown sender' };
		const match = sender.match(/^(.*?)\s*<([^>]+)>$/);
		const email = (match?.[2] ?? sender).trim().toLowerCase();
		const name = match?.[1]?.trim() || email;
		return { email, name };
	}

	private verifyCallbackSignature(headers: Headers, payload: Buffer): boolean {
		const id = headers.get('x-n8n-email-id');
		const timestamp = headers.get('x-n8n-email-timestamp');
		const signature = headers.get('x-n8n-email-signature');
		if (!id || !timestamp || !signature) return false;
		const timestampSeconds = Number(timestamp);
		if (
			!Number.isSafeInteger(timestampSeconds) ||
			Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS
		) {
			return false;
		}

		const encodedSecret = this.config.callbackSecret.startsWith('whsec_')
			? this.config.callbackSecret.slice('whsec_'.length)
			: this.config.callbackSecret;
		const expected = Buffer.from(
			createHmac('sha256', Buffer.from(encodedSecret, 'base64'))
				.update(`${id}.${timestamp}.`)
				.update(payload)
				.digest('base64'),
		);

		return signature.split(' ').some((part) => {
			const [version, encodedSignature] = part.split(',');
			if (version !== 'v1' || !encodedSignature) return false;
			const candidate = Buffer.from(encodedSignature);
			return candidate.length === expected.length && timingSafeEqual(candidate, expected);
		});
	}
}

function isIngestibleAttachment(attachment: AgentMailInboundAttachment): boolean {
	if (!attachment.attachment_id) return false;
	// Skip CID logos; keep real files even when AgentMail marks a PDF inline.
	return !(
		attachment.content_disposition === 'inline' &&
		(attachment.content_type ?? '').startsWith('image/')
	);
}

function isReplyAttachment(value: unknown): value is AgentEmailReplyAttachment {
	if (typeof value !== 'object' || value === null) return false;
	const attachment = value as AgentEmailReplyAttachment;
	return (
		typeof attachment.filename === 'string' &&
		attachment.filename.length > 0 &&
		typeof attachment.contentType === 'string' &&
		attachment.contentType.length > 0 &&
		((typeof attachment.content === 'string' && attachment.content.length > 0) ||
			(typeof attachment.url === 'string' && attachment.url.length > 0))
	);
}

async function toEmailReplyAttachment(
	attachment: Attachment,
): Promise<AgentEmailReplyAttachment | null> {
	if (isReplyAttachment(attachment)) return attachment;
	if (!attachment.name || !attachment.mimeType) return null;
	if (attachment.url) {
		return {
			filename: attachment.name,
			contentType: attachment.mimeType,
			url: attachment.url,
		};
	}

	const data = attachment.fetchData
		? await attachment.fetchData()
		: Buffer.isBuffer(attachment.data)
			? attachment.data
			: attachment.data
				? Buffer.from(await attachment.data.arrayBuffer())
				: null;
	if (!data) return null;
	return {
		filename: attachment.name,
		contentType: attachment.mimeType,
		content: data.toString('base64'),
	};
}
