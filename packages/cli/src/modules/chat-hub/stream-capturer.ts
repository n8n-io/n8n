import type { ChatMessageId } from '@n8n/api-types';
import type { Response } from 'express';
import type { ServerResponse } from 'http';
import type { StructuredChunk } from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

import type { ChatHubMessage } from './chat-hub-message.entity';

type Write = ServerResponse['write'];

export type ChunkTransformer = (chunk: string) => void;

export function interceptResponseWrites<T extends Response>(
	res: T,
	transform: ChunkTransformer,
): T {
	const originalWrite = res.write.bind(res) as Write;
	const defaultEncoding = 'utf8';

	const toText = (data: string | Buffer, enc?: BufferEncoding) =>
		Buffer.isBuffer(data) ? data.toString(enc ?? defaultEncoding) : String(data);

	function write(chunk: string | Buffer, callbackFn?: (e?: Error | null) => void): boolean;
	function write(
		chunk: string | Buffer,
		encoding: BufferEncoding,
		callbackFn?: (e?: Error | null) => void,
	): boolean;
	function write(
		chunk: string | Buffer,
		encodingOrCallback?: BufferEncoding | ((e?: Error | null) => void),
		callbackFn?: (e?: Error | null) => void,
	): boolean {
		const inputText = toText(
			chunk,
			typeof encodingOrCallback === 'string' ? encodingOrCallback : undefined,
		);

		const outputText = transform(inputText);

		if (!encodingOrCallback) {
			return originalWrite(outputText);
		} else if (typeof encodingOrCallback === 'function') {
			return originalWrite(outputText, encodingOrCallback);
		} else {
			return originalWrite(outputText, encodingOrCallback, callbackFn);
		}
	}

	res.write = write;

	return res;
}

type MessageKey = string;
const keyOf = (m: StructuredChunk['metadata']): MessageKey =>
	`${m.nodeId}|${m.runIndex}|${m.itemIndex}`;

export type AggregatedMessage = Pick<
	ChatHubMessage,
	'id' | 'previousMessageId' | 'retryOfMessageId' | 'content' | 'createdAt' | 'updatedAt' | 'status'
>;

type Handlers = {
	onBegin?: (message: AggregatedMessage) => void;
	onItem?: (message: AggregatedMessage, delta: string) => void;
	onEnd?: (message: AggregatedMessage) => void;
	onError?: (message: AggregatedMessage, errText?: string) => void;
};

export function createStructuredChunkAggregator(
	initialPreviousMessageId: ChatMessageId,
	retryOfMessageId: ChatMessageId | null,
	handlers: Handlers = {},
) {
	const { onBegin, onItem, onEnd, onError } = handlers;

	const active = new Map<MessageKey, AggregatedMessage>();
	const activeByKey = new Map<MessageKey, AggregatedMessage>();

	let previousMessageId: ChatMessageId | null = initialPreviousMessageId;

	const startNew = (): AggregatedMessage => {
		const message: AggregatedMessage = {
			id: uuidv4(),
			previousMessageId,
			retryOfMessageId:
				retryOfMessageId && previousMessageId === initialPreviousMessageId
					? retryOfMessageId
					: null,
			content: '',
			createdAt: new Date(),
			updatedAt: new Date(),
			status: 'running',
		};
		previousMessageId = message.id;
		onBegin?.(message);
		return message;
	};

	const ensureMessage = (key: MessageKey): AggregatedMessage => {
		let message = activeByKey.get(key);
		if (!message) {
			message = startNew();
			activeByKey.set(key, message);
		}
		return message;
	};

	const ingest = (chunk: StructuredChunk): AggregatedMessage => {
		const { type, content, metadata } = chunk;
		const key = keyOf(metadata);

		if (type === 'begin') {
			if (activeByKey.has(key)) {
				throw new Error(`Duplicate begin for key ${key}`);
			}
			const message = startNew();
			activeByKey.set(key, message);
			return message;
		}

		if (type === 'item') {
			const message = ensureMessage(key);
			if (typeof content === 'string' && content.length) {
				message.content += content;
				onItem?.(message, content);
			}
			return message;
		}

		if (type === 'end') {
			const message = ensureMessage(key);
			message.status = 'success';
			message.updatedAt = new Date();
			activeByKey.delete(key);
			onEnd?.(message);
			return message;
		}

		const message = ensureMessage(key);
		message.status = 'error';
		message.updatedAt = new Date();
		if (typeof content === 'string') {
			message.content = (message.content ? message.content + '\n\n' : '') + content;
		}

		activeByKey.delete(key);
		onError?.(message, content);
		return message;
	};

	const finalizeAll = () => {
		for (const message of active.values()) {
			message.status = 'cancelled';
			message.updatedAt = new Date();
		}
		active.clear();
	};

	return { ingest, finalizeAll };
}
