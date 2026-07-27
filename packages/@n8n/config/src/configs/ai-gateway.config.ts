import { Config, Env } from '../decorators';

@Config
export class AiGatewayConfig {
	/**
	 * Instance-level enablement for n8n Connect (AI Gateway).
	 * When false, Connect UI/API stay off regardless of license budget.
	 * Budget / free allowance still comes from the license (`quota:aiGatewayBudget`).
	 */
	@Env('N8N_AI_GATEWAY_ENABLED')
	enabled: boolean = false;
}
