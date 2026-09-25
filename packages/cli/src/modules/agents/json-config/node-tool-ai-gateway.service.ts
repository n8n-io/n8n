import type { AgentJsonToolConfig } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { NodeTypes } from '@/node-types';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { reconcileNodeToolGatewayCredentials } from './reconcile-node-tool-gateway-credentials';

/**
 * Composes node descriptions with the gateway config to auto-assign n8n Connect
 * managed credentials to node tools. Keeps `NodeTypes` out of the config service
 * and agent-config shape out of the generic `AiGatewayService`.
 */
@Service()
export class NodeToolAiGatewayService {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly aiGatewayService: AiGatewayService,
	) {}

	async assignManagedCredentials(
		tools: AgentJsonToolConfig[] | undefined,
		ownedCredentialTypes: ReadonlySet<string>,
	): Promise<void> {
		if (tools === undefined) return;
		const availability = await this.aiGatewayService.isAvailable();
		reconcileNodeToolGatewayCredentials(
			tools,
			this.nodeTypes,
			availability.available ? availability.config : undefined,
			ownedCredentialTypes,
		);
	}
}
