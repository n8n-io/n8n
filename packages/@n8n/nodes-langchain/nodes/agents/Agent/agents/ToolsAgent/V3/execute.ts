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

function isExecuteFunctions(
	context: IExecuteFunctions | ISupplyDataFunctions,
): context is IExecuteFunctions {
	return 'getExecuteData' in context;
}

const MAX_AGENT_FAILURE_MESSAGE_LENGTH = 1024;

function truncateAgentFailureMessage(message: string): string {
	if (message.length <= MAX_AGENT_FAILURE_MESSAGE_LENGTH) return message;
	return message.slice(0, MAX_AGENT_FAILURE_MESSAGE_LENGTH);
}

function countIntermediateSteps(returnData: INodeExecutionData[]): number {
	let total = 0;
	for (const item of returnData) {
		const json = item.json as { intermediateSteps?: unknown };
		if (Array.isArray(json.intermediateSteps)) {
			total += json.intermediateSteps.length;
		}
	}
	return total;
}

function countFailedItems(returnData: INodeExecutionData[]): number {
	let failed = 0;
	for (const item of returnData) {
		const json = item.json as { error?: unknown };
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
	let completedToolCalls = 0;
	let failedItems = 0;
	let iterationCount = 0;
	let itemsTotal = 0;
	let enableStreaming = true;
	let failureMessage: string | undefined;
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
			completedToolCalls += countIntermediateSteps(batchReturnData);
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
		failureMessage = error instanceof Error ? error.message : String(error);
		throw error;
	} finally {
		if (isExecuteFunctions(this)) {
			const tracing: Record<string, string | number | boolean> = {
				'ai.agent.version': 'v3',
				'ai.agent.streaming.enabled': enableStreaming,
				'ai.agent.items.total': itemsTotal,
				'ai.agent.items.failed': failedItems,
				'ai.agent.tool_calls.requested': requestedToolCalls,
				'ai.agent.tool_calls.completed': completedToolCalls,
				'ai.agent.iteration.count': iterationCount,
				'ai.agent.memory.loads': memoryLoads,
				'ai.agent.memory.saves': memorySaves,
				'ai.agent.execution.succeeded': failureMessage === undefined,
			};
			if (failureMessage !== undefined) {
				tracing['ai.agent.failure.message'] = truncateAgentFailureMessage(failureMessage);
			}
			this.setMetadata({ tracing });
		}
	}
}
