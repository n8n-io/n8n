import type { IconName } from '@n8n/design-system';

/**
 * A chip that a host shows in the composer, for example a resource that the
 * user picked with an @-mention.
 */
export interface AgentChatComposerChip {
	/** Stable key. A new chip with the same id replaces the old one. */
	id: string;
	label: string;
	icon?: IconName;
}

/**
 * A staged chip and the client context it adds to the next message.
 */
export interface AgentChatComposerAttachment {
	chip: AgentChatComposerChip;
	clientContextPatch?: Record<string, unknown>;
}

/**
 * Merges the client context for one message. `base` (the client context from the
 * panel prop) comes first, then the patches of the staged chips, in the order
 * the host added them. Array values for the same key are joined, so that two
 * chips that each add `{ attachments: [x] }` send both attachments. For other
 * values, the last patch wins. Returns undefined when there is no base and no
 * patch adds a key.
 */
export function mergeClientContextPatches(
	attachments: readonly AgentChatComposerAttachment[],
	base?: Record<string, unknown>,
): Record<string, unknown> | undefined {
	// A Map, and then Object.fromEntries, keep every key an own field, `__proto__` too.
	const merged = new Map<string, unknown>(base ? Object.entries(base) : []);
	let hasContext = base !== undefined;
	for (const { clientContextPatch } of attachments) {
		for (const [key, value] of Object.entries(clientContextPatch ?? {})) {
			const current = merged.get(key);
			merged.set(
				key,
				Array.isArray(current) && Array.isArray(value) ? [...current, ...value] : value,
			);
			hasContext = true;
		}
	}
	return hasContext ? Object.fromEntries(merged) : undefined;
}
