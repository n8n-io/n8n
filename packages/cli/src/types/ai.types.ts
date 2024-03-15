import type { BaseMessageLike } from '@langchain/core/messages';
import type { BaseChatModelCallOptions } from '@langchain/core/language_models/chat_models';

export interface N8nAIProvider {
	prompt(message: BaseMessageLike[], options?: BaseChatModelCallOptions): Promise<string>;
}
