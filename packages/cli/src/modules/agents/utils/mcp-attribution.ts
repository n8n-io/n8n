import type { StreamChunk } from '@n8n/agents';

/**
 * Watches a run's chunks and, when a segment completes, produces the text
 * chunks carrying the registry attribution of every MCP server whose tools
 * returned a result (see `McpRegistryConnection.attribution`). Appended in
 * code, after the model, so the label does not depend on the model honouring
 * an instruction. Keyed by the configured server name, which the SDK stamps on
 * each `tool-result` chunk.
 */
export function createAttributionTracker(attributions: Map<string, string>) {
	const pending = new Set<string>();
	let text = '';
	return {
		/**
		 * Record `chunk` and return the chunks to emit right before it - empty
		 * except before a non-error `finish` of a segment that used an attributed tool.
		 */
		observe(chunk: StreamChunk): StreamChunk[] {
			if (attributions.size === 0) return [];
			if (chunk.type === 'text-delta') text += chunk.delta;
			if (chunk.type === 'tool-result' && !chunk.isError && !chunk.canceled) {
				const attribution =
					chunk.mcpServerName !== undefined ? attributions.get(chunk.mcpServerName) : undefined;
				if (attribution !== undefined) pending.add(attribution);
			}
			if (chunk.type !== 'finish' || chunk.finishReason === 'error') return [];
			// Skip an attribution the model already echoed into its reply
			const lines = [...pending].filter((attribution) => !text.includes(attribution));
			if (lines.length === 0) return [];
			const id = crypto.randomUUID();
			return [
				{ type: 'text-start', id },
				// Consumers concatenate text-deltas as-is, so separate the label from the reply
				{ type: 'text-delta', id, delta: `${text ? '\n\n' : ''}${lines.join('\n')}` },
				{ type: 'text-end', id },
			];
		},
	};
}
