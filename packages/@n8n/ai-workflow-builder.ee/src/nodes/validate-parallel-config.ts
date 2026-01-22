/**
 * Validate Parallel Configuration
 *
 * Deferred node that waits for ALL parallel configure_node workers to complete.
 * Uses LangGraph's `defer: true` option to ensure fan-in from all workers.
 *
 * This node:
 * 1. Merges all configuration results (workflowOperations from workers)
 * 2. Validates the configured workflow
 * 3. Creates coordination log entry for configurator phase
 */

import type { Logger } from 'n8n-workflow';

import type { ParentGraphState } from '../parent-graph-state';
import type { CoordinationLogEntry } from '../types/coordination';
import { createConfiguratorMetadata } from '../types/coordination';

export interface ValidateParallelConfigParams {
	logger?: Logger;
}

/**
 * Create the validation node handler.
 * Note: This node should be added with { defer: true } to wait for all workers.
 */
export function createValidateParallelConfigNode(params: ValidateParallelConfigParams) {
	return (state: typeof ParentGraphState.State): Partial<typeof ParentGraphState.State> => {
		const { logger } = params;
		const { workflowJSON, configuredNodeIds = [], nodesToConfigure = [] } = state;

		const totalConfigured = configuredNodeIds.length;
		const totalExpected = nodesToConfigure.length;

		logger?.debug('[ValidateParallelConfig] All workers complete', {
			configuredNodes: totalConfigured,
			expectedNodes: totalExpected,
			totalWorkflowNodes: workflowJSON.nodes.length,
		});

		// Log any nodes that may have failed configuration
		if (totalConfigured < totalExpected) {
			const configuredSet = new Set(configuredNodeIds);
			const failedNodes = nodesToConfigure.filter((id) => !configuredSet.has(id));
			if (failedNodes.length > 0) {
				logger?.warn('[ValidateParallelConfig] Some nodes failed configuration', {
					failedNodeIds: failedNodes,
				});
			}
		}

		// Determine if there are setup instructions to pass to responder
		// For parallel workers, we don't have a single "setup instructions" message
		// but we can summarize what was configured
		const hasSetupInstructions = workflowJSON.nodes.some(
			(n) =>
				n.type.includes('Trigger') || n.type.includes('Webhook') || n.type.includes('credential'),
		);

		// Create coordination log entry
		const logEntry: CoordinationLogEntry = {
			phase: 'configurator',
			status: 'completed',
			timestamp: Date.now(),
			summary: `Configured ${totalConfigured} nodes in parallel`,
			output: hasSetupInstructions
				? 'Some nodes may require credentials or webhook setup. Please check the workflow.'
				: undefined,
			metadata: createConfiguratorMetadata({
				nodesConfigured: totalConfigured,
				hasSetupInstructions,
			}),
		};

		return {
			coordinationLog: [logEntry],
			// Clear the tracking state
			nodesToConfigure: [],
		};
	};
}
