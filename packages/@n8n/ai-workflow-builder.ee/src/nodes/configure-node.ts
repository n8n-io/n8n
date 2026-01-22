/**
 * ConfigureNode Worker
 *
 * Parallel configuration worker that configures a single node.
 * Dispatched via Send() from the parent graph when nodes are added.
 * Runs concurrently with Builder adding more nodes.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Logger } from 'n8n-workflow';

import { configureNode } from '@/services/node-configurator';

import type { ConfigureNodeStateType } from './configure-node-state';
import type { WorkflowOperation } from '../types/workflow';

export interface ConfigureNodeWorkerConfig {
	llm: BaseChatModel;
	logger?: Logger;
}

/**
 * Configure a single node using the shared configuration logic.
 * Returns workflow operations to update the node parameters.
 */
export async function configureNodeWorker(
	state: ConfigureNodeStateType,
	config: ConfigureNodeWorkerConfig,
): Promise<Partial<ConfigureNodeStateType>> {
	const { node, nodeType, userRequest, discoveryContext, workflow, workflowContext, instanceUrl } =
		state;
	const { llm, logger } = config;

	// Skip if essential inputs are missing
	if (!node || !nodeType) {
		logger?.warn('[ConfigureNode] Missing node or nodeType, skipping configuration');
		return { workflowOperations: [] };
	}

	logger?.debug('[ConfigureNode] Starting configuration', {
		nodeId: node.id,
		nodeName: node.name,
		nodeType: node.type,
	});

	try {
		// Use the shared configuration logic
		const result = await configureNode(
			{
				node,
				nodeType,
				userRequest,
				discoveryContext,
				workflow,
				workflowContext,
				instanceUrl,
			},
			{ llm, logger },
		);

		logger?.debug('[ConfigureNode] Configuration complete', {
			nodeId: node.id,
			nodeName: node.name,
			appliedChanges: result.appliedChanges.length,
		});

		// Create workflow operation to update the node
		const operation: WorkflowOperation = {
			type: 'updateNode',
			nodeId: node.id,
			updates: { parameters: result.parameters },
		};

		return {
			workflowOperations: [operation],
		};
	} catch (error) {
		logger?.error('[ConfigureNode] Configuration failed', {
			nodeId: node.id,
			nodeName: node.name,
			error: error instanceof Error ? error.message : String(error),
		});

		// Return empty operations on error - don't block other workers
		return { workflowOperations: [] };
	}
}
