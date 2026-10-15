import type { Generation } from '@langchain/core/outputs';
import { isRecord } from '@n8n/utils/is-record';

function readModelName(source: unknown): string | undefined {
	if (!isRecord(source)) return undefined;

	// `model_name` only. Streaming Responses runs concatenate `model` across events,
	// so it arrives as `gpt-4.1-minigpt-4.1-mini`.
	const name = source.model_name;

	return typeof name === 'string' && name.trim() !== '' ? name : undefined;
}

/** LangChain writes the name to `generationInfo` when streaming and to the message otherwise. */
export function extractRespondingModel(generation: Generation): string | undefined {
	const message = 'message' in generation ? generation.message : undefined;

	return (
		readModelName(generation.generationInfo) ??
		readModelName(isRecord(message) ? message.response_metadata : undefined)
	);
}
