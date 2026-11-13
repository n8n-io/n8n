import type { AgentDbMessage } from '@n8n/agents';
import { BadRequestError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

function isRestorableMessage(
	value: Record<string, unknown> & { createdAt: Date },
): value is AgentDbMessage & Record<string, unknown> {
	if (typeof value.id !== 'string' || value.id.length === 0) return false;
	if (value.type === 'custom') return typeof value.data === 'object' && value.data !== null;
	return typeof value.role === 'string' && Array.isArray(value.content);
}

/** Coerce a wire-format seed message (ISO `createdAt`) into a persistable
 *  AgentDbMessage, or undefined if it fails the structural contract. */
export function toRestorableMessage(value: Record<string, unknown>): AgentDbMessage | undefined {
	const rawCreatedAt = value.createdAt;
	const createdAt =
		rawCreatedAt instanceof Date
			? rawCreatedAt
			: typeof rawCreatedAt === 'string'
				? new Date(rawCreatedAt)
				: undefined;
	if (!createdAt || Number.isNaN(createdAt.getTime())) return undefined;
	const candidate = { ...value, createdAt };
	return isRestorableMessage(candidate) ? candidate : undefined;
}

/**
 * Convert the messages of a conversation seed into agent messages. Both
 * Assistant runtimes use it, so a seed restores the same way on each.
 * Each message gets a new id: the id is a global key, and one seed can be
 * restored into many threads on the same instance.
 * Throws `BadRequestError` for the first message that is not valid.
 */
export function toRestorableMessages(messages: Array<Record<string, unknown>>): AgentDbMessage[] {
	return messages.map((raw, index) => {
		const message = toRestorableMessage(raw);
		if (!message) {
			throw new BadRequestError(
				`Seed message at index ${index} is not a valid agent message (id, createdAt, and role+content or type:custom+data are required)`,
			);
		}
		return { ...message, id: randomUUID() };
	});
}
