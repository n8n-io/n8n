import { Config, Env } from '../decorators';

@Config
export class ChatConfig {
	/** Specifies the OpenAI API key used for chat. */
	@Env('N8N_CHAT_OPENAI_API_KEY')
	openAiApiKey: string = '';
}
