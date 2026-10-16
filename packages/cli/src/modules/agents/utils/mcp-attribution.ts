import type { StreamChunk } from '@n8n/agents';

/**
 * Collects the registry attribution of each MCP server whose tool returned a
 * result (see `McpRegistryConnection.attribution`) and emits it as text chunks
 * before the reply's `finish`. The code appends the label, so the reply does
 * not depend on the model following an instruction. Keys are the configured
 * server names that the SDK stamps on `tool-result` chunks.
 *
 * A stream carries exactly one terminal `finish`, so `pending` is never reset.
 * A suspended segment (`finishReason: 'tool-calls'`) is not a reply: it gets
 * no label, and its results are not carried over to the resumed segment.
 */
export function createAttributionTracker(attributions: Map<string, string>) {
	const pending = new Set<string>();
	let text = '';
	return {
		/**
		 * Record `chunk` and return the chunks to emit right before it - empty
		 * except before the completing `finish` of a reply that used an attributed tool.
		 */
		observe(chunk: StreamChunk): StreamChunk[] {
			if (attributions.size === 0) return [];
			if (chunk.type === 'text-delta') text += chunk.delta;
			if (chunk.type === 'tool-result' && !chunk.isError && !chunk.canceled) {
				const attribution =
					chunk.mcpServerName !== undefined ? attributions.get(chunk.mcpServerName) : undefined;
				if (attribution !== undefined) pending.add(attribution);
			}
			if (chunk.type !== 'finish') return [];
			if (chunk.finishReason === 'error' || chunk.finishReason === 'tool-calls') return [];
			// A reply with no text would show as the label alone, which reads as a glitch
			if (text.trim() === '') return [];
			// Skip an attribution the model already echoed into its reply
			const lines = [...pending].filter((attribution) => !text.includes(attribution));
			if (lines.length === 0) return [];
			const id = crypto.randomUUID();
			return [
				{ type: 'text-start', id },
				// Consumers concatenate text-deltas as-is, so separate the label from the reply
				{ type: 'text-delta', id, delta: `\n\n${lines.join('\n')}` },
				{ type: 'text-end', id },
			];
		},
	};
}
