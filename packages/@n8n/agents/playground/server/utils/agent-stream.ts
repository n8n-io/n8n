import type { StreamResult } from '@n8n/agents';
import type { SSEStream } from './sse';

export async function handleAgentStream(
	sse: SSEStream,
	agentStream: StreamResult,
	options?: { model?: string },
) {
	const reader = agentStream.getReader();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;

		const chunk = value;

		if (chunk.type === 'text-delta' && 'delta' in chunk && chunk.delta) {
			sse.send({ text: chunk.delta });
		} else if (chunk.type === 'reasoning-delta' && 'delta' in chunk && chunk.delta) {
			sse.send({ thinking: chunk.delta });
		} else if (chunk.type === 'message' && 'content' in chunk.message) {
			const c = chunk.message.content;
			for (const contentPart of c) {
				if (contentPart.type === 'tool-call') {
					sse.send({ toolCall: { tool: contentPart.toolName, input: contentPart.input } });
				} else if (contentPart.type === 'tool-result') {
					sse.send({ toolResult: { tool: contentPart.toolName, output: contentPart.result } });
				} else if (contentPart.type === 'text') {
					sse.send({ text: contentPart.text });
				} else if (contentPart.type === 'file') {
					const raw = contentPart.data;
					const data =
						typeof raw === 'string'
							? raw
							: Buffer.from(raw instanceof ArrayBuffer ? new Uint8Array(raw) : raw).toString(
									'base64',
								);
					sse.send({
						file: {
							data,
							mediaType: contentPart.mediaType ?? 'application/octet-stream',
						},
					});
				} else {
					sse.send({
						text: `Received unknown content type: ${JSON.stringify(contentPart, null, 2)}`,
					});
				}
			}
		} else if (chunk.type === 'tool-call-suspended') {
			sse.send({
				suspended: {
					runId: chunk.runId,
					toolCallId: chunk.toolCallId,
					toolName: chunk.toolName,
					input: chunk.input,
					suspendPayload: chunk.suspendPayload,
				},
			});
		} else if (chunk.type === 'finish') {
			if (chunk.usage) {
				sse.send({
					usage: {
						...chunk.usage,
						model: chunk.model ?? options?.model,
						...(chunk.subAgentUsage && { subAgentUsage: chunk.subAgentUsage }),
						...(chunk.totalCost != null && { totalCost: chunk.totalCost }),
					},
				});
			}
		} else if (chunk.type === 'error') {
			const err = chunk.error;
			sse.send({
				text: err instanceof Error ? err.message : String(err ?? 'Unknown error'),
			});
		}
	}
}
