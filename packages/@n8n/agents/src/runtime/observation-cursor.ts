import type { BuiltMemory } from '../types/sdk/memory';
import type { AgentDbMessage } from '../types/sdk/message';
import type { BuiltObservationStore, ObservationCursor, ScopeKind } from '../types/sdk/observation';

/**
 * Read the cursor for a scope and fetch the message delta the observer has
 * not yet processed. v1 only supports thread-scoped cursors; `scopeId` is
 * treated as the threadId.
 *
 * Returns the messages in seq-ascending order (so the last element is the
 * most recently appended) along with the cursor that was read — `null` when
 * no cursor exists yet, in which case the full thread history is returned.
 */
export async function getDeltaSinceCursor(
	store: BuiltMemory & BuiltObservationStore,
	scopeKind: ScopeKind,
	scopeId: string,
): Promise<{ messages: AgentDbMessage[]; cursor: ObservationCursor | null }> {
	const cursor = await store.getCursor(scopeKind, scopeId);
	const messages = await store.getMessages(
		scopeId,
		cursor ? { sinceSeq: cursor.lastObservedSeq } : undefined,
	);
	return { messages, cursor };
}

/**
 * Upsert the cursor for a scope to the seq/id of `lastMessage`. Should be
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
	if (lastMessage.seq === undefined) {
		throw new Error(
			'advanceCursor requires a message with `seq` set; messages from BuiltMemory.getMessages() expose it.',
		);
	}
	const cursor: ObservationCursor = {
		scopeKind,
		scopeId,
		lastObservedMessageId: lastMessage.id,
		lastObservedSeq: lastMessage.seq,
		updatedAt: now,
	};
	await store.setCursor(cursor);
	return cursor;
}
