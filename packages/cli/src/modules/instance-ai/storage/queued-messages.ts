import { instanceAiQueuedMessageSchema, type InstanceAiQueuedMessage } from '@n8n/api-types';

export const QUEUED_MESSAGES_METADATA_KEY = 'instanceAiQueuedMessages';

/**
 * Read defensively, one item at a time: the column is a JSON blob shared with
 * other thread features, and a shape an older or newer client wrote must not
 * take the whole queue down.
 */
export function readQueuedMessages(
	metadata: Record<string, unknown> | undefined,
): InstanceAiQueuedMessage[] {
	const messages = metadata?.[QUEUED_MESSAGES_METADATA_KEY];
	if (!Array.isArray(messages)) return [];
	return messages.flatMap((item) => {
		const result = instanceAiQueuedMessageSchema.safeParse(item);
		return result.success ? [result.data] : [];
	});
}

/** Metadata with the queue written, or the key dropped when the queue is empty. */
export function withQueuedMessages(
	metadata: Record<string, unknown> | undefined,
	messages: InstanceAiQueuedMessage[],
): Record<string, unknown> {
	const { [QUEUED_MESSAGES_METADATA_KEY]: _dropped, ...rest } = metadata ?? {};
	return messages.length > 0 ? { ...rest, [QUEUED_MESSAGES_METADATA_KEY]: messages } : rest;
}

/**
 * The queue as one turn: every item in order, joined with a newline, under the
 * head's id and time. `sentAt` is the earliest one, so a queue whose head was
 * already announced stays announced.
 */
export function mergeQueuedMessages(
	messages: InstanceAiQueuedMessage[],
): InstanceAiQueuedMessage | undefined {
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
