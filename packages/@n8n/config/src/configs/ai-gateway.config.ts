import { Config, Env } from '../decorators';

@Config
export class AiGatewayConfig {
	/**
	 * Instance-level enablement for n8n Connect (AI Gateway).
	 * Licensed instances are enabled by default; false opts out.
	 * Budget / free allowance still comes from the license (`quota:aiGatewayBudget`).
	 */
	@Env('N8N_AI_GATEWAY_ENABLED')
	enabled: boolean = true;
}
