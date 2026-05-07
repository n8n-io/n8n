import type { BuiltMemory } from '../types/sdk/memory';
import type { AgentDbMessage } from '../types/sdk/message';
import type { BuiltObservationStore, ObservationCursor, ScopeKind } from '../types/sdk/observation';

/**
 * Read the cursor for a scope and fetch the message delta the observer has
 * not yet processed. v1 observes thread scopes; the cursor advances via the
 * `(createdAt, id)` keyset stored on the cursor.
 *
 * Returns the messages in ascending order (so the last element is the most
 * recently appended) along with the cursor that was read — `null` when no
 * cursor exists yet, in which case the full scope history is returned.
 */
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

/**
 * Upsert the cursor for a scope from the last observed message. Should be
 * called only after the observer has successfully written its rows for the
 * delta — a crash between writes and cursor advance is replay-safe (the
 * next run reprocesses the same delta).
 */
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
