import { Config, Env } from '../decorators';

@Config
export class AiAssistantConfig {
	/**
	 * Base URL of the AI assistant service.
	 * When set, requests are sent to this URL instead of the default provider endpoint.
	 */
	@Env('N8N_AI_ASSISTANT_BASE_URL')
	baseUrl: string = '';

	/**
	 * Makes AI Gateway available without a valid license.
	 * For local development only; credential and token checks remain enforced.
	 */
	@Env('N8N_AI_GATEWAY_DEV_MODE')
	aiGatewayDevMode: boolean = false;
}
