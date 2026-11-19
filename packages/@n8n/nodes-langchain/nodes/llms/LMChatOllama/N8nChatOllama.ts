import { ChatOllama, type ChatOllamaInput } from '@langchain/ollama';

export class N8nChatOllama extends ChatOllama {
	private readonly failedAttemptHandler: ChatOllamaInput['onFailedAttempt'];

	constructor(fields: ChatOllamaInput) {
		super(fields);
		this.failedAttemptHandler = fields.onFailedAttempt;
	}

	async *_streamResponseChunks(...args: Parameters<ChatOllama['_streamResponseChunks']>) {
		try {
			yield* super._streamResponseChunks(...args);
		} catch (error) {
			// ChatOllama bypasses AsyncCaller. Apply n8n's error classification here.
			await this.failedAttemptHandler?.(error);

			throw error;
		}
	}
}
