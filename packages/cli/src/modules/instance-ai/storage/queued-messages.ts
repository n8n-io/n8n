import type { InstanceAiQueuedMessage } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

export const QUEUED_MESSAGES_METADATA_KEY = 'instanceAiQueuedMessages';

export interface QueuedMessage {
	id: string;
	text: string;
	createdAt: string;
	sentAt?: string;
}

export function readQueuedMessages(metadata: Record<string, unknown> | undefined): QueuedMessage[] {
	const messages = metadata?.[QUEUED_MESSAGES_METADATA_KEY];
	if (!Array.isArray(messages)) return [];
	return messages.filter(
		(item): item is QueuedMessage =>
			isRecord(item) &&
			typeof item.id === 'string' &&
			typeof item.text === 'string' &&
			typeof item.createdAt === 'string' &&
			(item.sentAt === undefined || typeof item.sentAt === 'string'),
	);
}

export function withQueuedMessages(
	metadata: Record<string, unknown> | undefined,
	messages: QueuedMessage[],
): Record<string, unknown> {
	const updated = { ...metadata };
	if (messages.length > 0) {
		updated[QUEUED_MESSAGES_METADATA_KEY] = messages;
	} else {
		delete updated[QUEUED_MESSAGES_METADATA_KEY];
	}
	return updated;
}

/**
 * The queue as one turn: every item in order, joined with a newline, under the
 * head's id and time. `sentAt` is the earliest one, so a queue whose head was
 * already announced stays announced.
 */
export function mergeQueuedMessages(messages: QueuedMessage[]): QueuedMessage | undefined {
	const [head] = messages;
	if (!head) return undefined;
	const sentAt = messages
		.map((item) => item.sentAt)
		.filter((value): value is string => value !== undefined)
		.sort()[0];
	return {
		id: head.id,
		text: messages.map((item) => item.text).join('\n'),
		createdAt: head.createdAt,
		...(sentAt !== undefined ? { sentAt } : {}),
	};
}

export function toQueuedMessageList(messages: QueuedMessage[]): InstanceAiQueuedMessage[] {
	return messages.map(({ id, text, createdAt, sentAt }) => ({
		id,
		text,
		createdAt,
		...(sentAt !== undefined ? { sentAt } : {}),
	}));
}
