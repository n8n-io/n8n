import type { AgentDbMessage } from '@n8n/agents';

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
