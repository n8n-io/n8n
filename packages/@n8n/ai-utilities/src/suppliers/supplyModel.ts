import { LangchainAdapter } from '../adapters/langchain';
import type { ChatModel } from '../types/chat-model';

export function supplyModel(model: ChatModel) {
	const adapter = new LangchainAdapter(model);
	return {
		response: adapter,
	};
}
