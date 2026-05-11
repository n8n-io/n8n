import type { BuiltMemory } from '../types/sdk/memory';
import type { AgentDbMessage } from '../types/sdk/message';
import type { BuiltObservationStore, ObservationCursor, ScopeKind } from '../types/sdk/observation';

export async function getDeltaSinceCursor(
	store: BuiltMemory & BuiltObservationStore,
	scopeKind: ScopeKind,
	scopeId: string,
): Promise<{ messages: AgentDbMessage[]; cursor: ObservationCursor | null }> {
	const cursor = await store.getCursor(scopeKind, scopeId);
	const messages = await store.getMessagesForScope(
		scopeKind,
		scopeId,
		cursor
			? {
					since: {
						sinceCreatedAt: cursor.lastObservedAt,
						sinceMessageId: cursor.lastObservedMessageId,
					},
				}
			: undefined,
	);
	return { messages, cursor };
}

export async function advanceCursor(
	store: BuiltObservationStore,
	scopeKind: ScopeKind,
	scopeId: string,
	lastMessage: AgentDbMessage,
	now: Date = new Date(),
): Promise<ObservationCursor> {
	const cursor: ObservationCursor = {
		scopeKind,
		scopeId,
		lastObservedMessageId: lastMessage.id,
		lastObservedAt: lastMessage.createdAt,
		updatedAt: now,
	};
	await store.setCursor(cursor);
	return cursor;
}
