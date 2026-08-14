import type { StreamChunk } from '@n8n/agents';

export async function* streamAgentChunks(
	stream: ReadableStream<StreamChunk>,
): AsyncGenerator<StreamChunk> {
	const reader = stream.getReader();
	let streamDone = false;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				streamDone = true;
				break;
			}
			yield value;
		}
	} finally {
		try {
			if (!streamDone) await reader.cancel();
		} finally {
			reader.releaseLock();
		}
	}
}
