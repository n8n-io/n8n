import type { BaseMessageLike } from '@langchain/core/messages';

export interface N8nAIProvider {
	prompt(message: BaseMessageLike[]): Promise<string>;
}
