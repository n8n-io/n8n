import type { InstanceAiQueuedMessage } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

export const QUEUED_MESSAGES_METADATA_KEY = 'instanceAiQueuedMessages';

export interface QueuedMessage {
	id: string;
	text: string;
	createdAt: string;
	steerRequestedAt?: string;
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
			(item.steerRequestedAt === undefined || typeof item.steerRequestedAt === 'string'),
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

export function toQueuedMessageList(messages: QueuedMessage[]): InstanceAiQueuedMessage[] {
	return messages.map(({ id, text, createdAt, steerRequestedAt }) => ({
		id,
		text,
		createdAt,
		...(steerRequestedAt !== undefined ? { steerRequestedAt } : {}),
	}));
}
