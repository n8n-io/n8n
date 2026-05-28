import type { RequestResponseMetadata } from '@utils/agent-execution';
import type {
	EngineRequest,
	EngineResponse,
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { getHighlightedResponseKey, sleep } from 'n8n-workflow';

import { buildExecutionContext, executeBatch } from './helpers';
import { isExecuteFunctions } from '../../utils';

/** Keys written in `finally` for Tools Agent V3 execution tracing (`setMetadata`). */
type ToolsAgentV3TracingMetadata = {
	'ai.agent.version': 'v3';
	'ai.agent.streaming.enabled': boolean;
	'ai.agent.items.total': number;
	'ai.agent.items.failed': number;
	'ai.agent.tool_calls.requested': number;
	'ai.agent.tool_calls.completed': number;
	'ai.agent.iteration.count': number;
	'ai.agent.memory.loads': number;
	'ai.agent.memory.saves': number;
	'ai.agent.execution.succeeded': boolean;
	'ai.agent.failure.type'?: string;
};

function countFailedItems(returnData: INodeExecutionData[]): number {
	let failed = 0;
	for (const { json } of returnData) {
		if (typeof json.error === 'string' && json.error.length > 0) {
			failed++;
		}
	}
	return failed;
}

/* -----------------------------------------------------------
   Main Executor Function
----------------------------------------------------------- */
/**
 * The main executor method for the Tools Agent V3.
 *
 * This function orchestrates the execution across input batches, handling:
 * - Building shared execution context (models, memory, batching config)
 * - Processing items in batches with continue-on-fail logic
 * - Returning either tool call requests or node output data
 *
 * @param this Execute context. SupplyDataContext is passed when agent is used as a tool
 * @param response Optional engine response containing tool call results from previous execution
 * @returns Array of execution data for all processed items, or engine request for tool calls
 */
export async function toolsAgentExecute(
	this: IExecuteFunctions | ISupplyDataFunctions,
	response?: EngineResponse<RequestResponseMetadata>,
): Promise<INodeExecutionData[][] | EngineRequest<RequestResponseMetadata>> {
	this.logger.debug('Executing Tools Agent V3');

	let request: EngineRequest<RequestResponseMetadata> | undefined = undefined;

	const returnData: INodeExecutionData[] = [];
	let requestedToolCalls = 0;
	// Tool calls that completed before this invocation are surfaced through the inbound
	// EngineResponse — V3 routes tool execution through the engine, so we count
	// `actionResponses` directly rather than relying on the optional `intermediateSteps`
	// payload (which is only populated when `returnIntermediateSteps` is enabled).
	const completedToolCalls = response?.actionResponses?.length ?? 0;
	let failedItems = 0;
	let iterationCount = 0;
	let itemsTotal = 0;
	let enableStreaming = true;
	let failureType: string | undefined;
	let memoryLoads = 0;
	let memorySaves = 0;

	try {
		// Build execution context with shared configuration
		const executionContext = await buildExecutionContext(this);
		const { items, batchSize, delayBetweenBatches, model, fallbackModel, memory } =
			executionContext;
		itemsTotal = items.length;
		enableStreaming = this.getNodeParameter('options.enableStreaming', 0, true) as boolean;

		// Process items in batches
		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);

			const {
				returnData: batchReturnData,
				request: batchRequest,
				memoryHits,
			} = await executeBatch(this, batch, i, model, fallbackModel, memory, response);

			// Collect results from batch
			memoryLoads += memoryHits.loads;
			memorySaves += memoryHits.saves;
			returnData.push.apply(returnData, batchReturnData);
			failedItems += countFailedItems(batchReturnData);

			// Collect requests from batch
			if (batchRequest) {
				requestedToolCalls += batchRequest.actions.length;
				const currentIteration = batchRequest.metadata?.iterationCount;
				if (typeof currentIteration === 'number') {
					iterationCount = Math.max(iterationCount, currentIteration);
				}
				if (!request) {
					request = batchRequest;
				} else {
					request.actions.push.apply(request.actions, batchRequest.actions);
				}
			}

			// Apply delay between batches if configured
			if (i + batchSize < items.length && delayBetweenBatches > 0) {
				await sleep(delayBetweenBatches);
			}
		}

		// Return tool call request if any tools need to be executed
		if (request) {
			return request;
		}

		// Auto-highlight the agent's response output
		if (this.getNodeParameter('options.autoSaveHighlightedData', 0, true) !== false) {
			const firstOutput = returnData[0]?.json?.output;
			if (typeof firstOutput === 'string') {
				this.customData.set(getHighlightedResponseKey(this.getNode().name), firstOutput);
			}
		}

		// Otherwise return execution data
		return [returnData];
	} catch (error) {
		failureType =
			error instanceof Error ? error.name || error.constructor.name || 'Error' : typeof error;
		throw error;
	} finally {
		if (isExecuteFunctions(this)) {
			const tracing: ToolsAgentV3TracingMetadata = {
				'ai.agent.version': 'v3',
				'ai.agent.streaming.enabled': enableStreaming,
				'ai.agent.items.total': itemsTotal,
				'ai.agent.items.failed': failedItems,
				'ai.agent.tool_calls.requested': requestedToolCalls,
				'ai.agent.tool_calls.completed': completedToolCalls,
				'ai.agent.iteration.count': iterationCount,
				'ai.agent.memory.loads': memoryLoads,
				'ai.agent.memory.saves': memorySaves,
				'ai.agent.execution.succeeded': failureType === undefined,
			};
			if (failureType !== undefined) {
				tracing['ai.agent.failure.type'] = failureType;
			}
			this.setMetadata({ tracing });
		}
	}
}
