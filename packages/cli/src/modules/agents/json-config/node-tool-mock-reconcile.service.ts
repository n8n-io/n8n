import type { AgentJsonToolConfig } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { NodeTypes } from '@/node-types';

import { reconcileNodeToolMocks } from './reconcile-node-tool-mocks';

/**
 * Composes node descriptions with the previous persisted config to
 * auto-unmock node tools whose required credentials just became fully
 * configured (AGENT-716). Keeps `NodeTypes` out of the config service,
 * mirroring `NodeToolAiGatewayService`.
 */
@Service()
export class NodeToolMockReconcileService {
	constructor(private readonly nodeTypes: NodeTypes) {}

	reconcile(
		tools: AgentJsonToolConfig[] | undefined,
		previousTools: AgentJsonToolConfig[] | undefined,
	): void {
		reconcileNodeToolMocks(tools, previousTools, this.nodeTypes);
	}
}
