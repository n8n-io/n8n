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
}
