import { Config, Env } from '@n8n/config';

@Config
export class AiGatewayConfig {
	@Env('N8N_AI_GATEWAY_ENABLED')
	enabled: boolean = false;

	@Env('N8N_AI_GATEWAY_OPENROUTER_API_KEY')
	openRouterApiKey: string = '';

	@Env('N8N_AI_GATEWAY_OPENROUTER_BASE_URL')
	openRouterBaseUrl: string = 'https://openrouter.ai/api/v1';

	@Env('N8N_AI_GATEWAY_DEFAULT_CATEGORY')
	defaultCategory: string = 'balanced';

	@Env('N8N_AI_GATEWAY_DEFAULT_CHAT_MODEL')
	defaultChatModel: string = 'openai/gpt-4.1-nano';

	@Env('N8N_AI_GATEWAY_DEFAULT_TEXT_MODEL')
	defaultTextModel: string = 'openai/gpt-4.1-mini';

	@Env('N8N_AI_GATEWAY_DEFAULT_IMAGE_MODEL')
	defaultImageModel: string = 'google/gemini-2.5-flash-image';

	@Env('N8N_AI_GATEWAY_DEFAULT_FILE_MODEL')
	defaultFileModel: string = 'anthropic/claude-sonnet-4';

	@Env('N8N_AI_GATEWAY_DEFAULT_AUDIO_MODEL')
	defaultAudioModel: string = 'openai/gpt-4o-mini-transcribe';

	@Env('N8N_AI_GATEWAY_CREDITS_REMAINING')
	creditsRemaining: number = 5.0;
}
