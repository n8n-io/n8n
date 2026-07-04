import type { BaseChatMemory } from '@langchain/classic/memory';
import type { InputValues, MemoryVariables } from '@langchain/core/memory';

import { cleanupOrphanedMessages } from '../agent-execution/memoryManagement';

/**
 * Wraps a chat memory instance so `loadMemoryVariables()` always returns a
 * history that is free of orphaned tool-call sequences.
 *
 * Windowed memories (e.g. `BufferWindowMemory` with a `k` / "Context Window
 * Length" setting) truncate history by raw message count. That truncation
 * has no notion of a "conversation turn", so it can easily cut a stored
 * history in the middle of a tool-call exchange, leaving either:
 *   - a `ToolMessage` whose originating `AIMessage(tool_calls)` fell outside
 *     the window, or
 *   - an `AIMessage` with `tool_calls` whose `ToolMessage` result fell
 *     outside the window.
 *
 * Providers such as the OpenAI Responses API validate this pairing and
 * reject the request (e.g. "No tool call found for function call output
 * with call_id ...") when it is broken. This wrapper removes any such
 * orphans from the start of the loaded history before it is handed back to
 * the caller (agent executor, chain, etc.), regardless of which code path
 * reads the memory.
 *
 * This is applied at the memory-node level (Redis, Postgres, MongoDB, Xata,
 * Buffer Window) so it protects every consumer uniformly, rather than
 * relying on each agent implementation to clean up after itself.
 */

export type ChatMemoryWithKey = BaseChatMemory & { memoryKey: string };

export function withOrphanCleanup<T extends ChatMemoryWithKey>(memory: T): T {
	const originalLoadMemoryVariables = memory.loadMemoryVariables.bind(memory);

	memory.loadMemoryVariables = async (values: InputValues): Promise<MemoryVariables> => {
		const result = await originalLoadMemoryVariables(values);
		const key = memory.memoryKey;
		const history = result[key];

		if (Array.isArray(history)) {
			result[key] = cleanupOrphanedMessages([...history]);
		}

		return result;
	};

	return memory;
}
