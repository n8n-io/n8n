import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';

import { Orchestrator } from './orchestrator';
import { BuilderSubgraph } from './subgraphs/builder.subgraph';
import { ConfiguratorSubgraph } from './subgraphs/configurator.subgraph';
import { DiscoverySubgraph } from './subgraphs/discovery.subgraph';

export interface MultiAgentSubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llmSimpleTask: BaseChatModel;
	llmComplexTask: BaseChatModel;
	logger?: Logger;
	instanceUrl?: string;
}

/**
 * Create Multi-Agent Workflow using Subgraph Pattern
 *
 * Each specialist agent runs in its own isolated subgraph.
 * Parent graph orchestrates between subgraphs with minimal shared state.
 */
export function createMultiAgentWorkflowWithSubgraphs(config: MultiAgentSubgraphConfig) {
	const { parsedNodeTypes, llmComplexTask, logger, instanceUrl } = config;

	const orchestrator = new Orchestrator({ llm: llmComplexTask });

	// Register subgraphs
	orchestrator.registerSubgraph(new DiscoverySubgraph());
	orchestrator.registerSubgraph(new BuilderSubgraph());
	orchestrator.registerSubgraph(new ConfiguratorSubgraph());

	// Build the workflow
	// We pass the config needed for subgraphs to create themselves
	return orchestrator.build({
		parsedNodeTypes,
		llm: llmComplexTask,
		logger,
		instanceUrl,
	});
}
