import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AiGatewayService } from '@/services/ai-gateway.service';

import { AI_GATEWAY_MCP_CAPABILITY } from './mcp-registry.types';

// Add capabilities here when they do not depend on instance configuration.
const BASE_CAPABILITIES: readonly string[] = ['supabase-oauth2-credentials'];

const N8N_CLOUD_CAPABILITY = 'n8n-cloud';

@Service()
export class McpRegistryCapabilities {
	private readonly supportedCapabilities = new Set(BASE_CAPABILITIES);

	constructor(
		globalConfig: GlobalConfig,
		private readonly aiGatewayService: AiGatewayService,
	) {
		if (globalConfig.deployment.type === 'cloud') {
			this.supportedCapabilities.add(N8N_CLOUD_CAPABILITY);
		}
	}

	supports(requiredCapabilities?: string[]): boolean {
		// Gateway credits follow the license, which can change while the instance runs.
		if (requiredCapabilities?.includes(AI_GATEWAY_MCP_CAPABILITY)) {
			const otherCapabilities = requiredCapabilities.filter((c) => c !== AI_GATEWAY_MCP_CAPABILITY);
			return this.aiGatewayService.isEnabled() && this.supports(otherCapabilities);
		}
		return (
			requiredCapabilities?.every((capability) => this.supportedCapabilities.has(capability)) ??
			true
		);
	}
}
