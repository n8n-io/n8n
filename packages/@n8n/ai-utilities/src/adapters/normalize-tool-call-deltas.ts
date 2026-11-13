import { randomUUID } from 'node:crypto';

import type { StreamChunk } from '../types/output';

type ToolCallDelta = Extract<StreamChunk, { type: 'tool-call-delta' }>;

export type NormalizedStreamChunk =
	| Exclude<StreamChunk, ToolCallDelta>
	| (ToolCallDelta & { id: string });

interface AnonymousToolCall {
	id: string;
	name?: string;
	deltas: ToolCallDelta[];
}

/**
 * Gives every `tool-call-delta` the id of its tool call, so adapters can match
 * parallel tool calls by id. `tool-call-delta` has no index, so a delta without
 * an id continues the tool call that got the last delta.
 *
 * A call that starts without an id is held back until the chat model sends
 * its id, because the tool result must name the id that the provider knows.
 * A new id with a different name is a new call. A call that never gets an id
 * is released under a generated id before the finish, before a complete tool
 * call block, and at the end of the stream.
 */
export async function* normalizeToolCallDeltas(
	stream: AsyncIterable<StreamChunk>,
): AsyncGenerator<NormalizedStreamChunk> {
	const knownIds = new Set<string>();
	let currentId: string | undefined;
	let anonymous: AnonymousToolCall | undefined;

	function* release(id: string): Generator<NormalizedStreamChunk> {
		if (!anonymous) return;
		for (const delta of anonymous.deltas) yield { ...delta, id };
		knownIds.add(id);
		if (currentId === anonymous.id) currentId = id;
		anonymous = undefined;
	}

	for await (const chunk of stream) {
		if (chunk.type !== 'tool-call-delta') {
			const closesCalls =
				chunk.type === 'finish' || (chunk.type === 'content' && chunk.content.type === 'tool-call');
			if (anonymous && closesCalls) yield* release(anonymous.id);
			yield chunk;
			continue;
		}

		const { id } = chunk;
		if (id === undefined) {
			if (anonymous && currentId === anonymous.id) {
				anonymous.name ??= chunk.name;
				anonymous.deltas.push(chunk);
			} else if (currentId !== undefined) {
				yield { ...chunk, id: currentId };
			} else {
				anonymous = { id: randomUUID(), name: chunk.name, deltas: [chunk] };
				currentId = anonymous.id;
			}
			continue;
		}

		if (!knownIds.has(id) && anonymous && currentId === anonymous.id) {
			const sameCall =
				chunk.name === undefined || anonymous.name === undefined || chunk.name === anonymous.name;
			if (sameCall) yield* release(id);
		}
		knownIds.add(id);
		currentId = id;
		yield { ...chunk, id };
	}

	if (anonymous) yield* release(anonymous.id);
}
