import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AiGatewayService } from '@/services/ai-gateway.service';

import { N8N_CONNECT_MCP_CAPABILITY } from './mcp-registry.types';

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
		return requiredCapabilities?.every((capability) => this.isSupported(capability)) ?? true;
	}

	private isSupported(capability: string): boolean {
		// Read on every check: the license can change while the instance runs.
		if (capability === N8N_CONNECT_MCP_CAPABILITY) return this.aiGatewayService.isEnabled();
		return this.supportedCapabilities.has(capability);
	}
}
