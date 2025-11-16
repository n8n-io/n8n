import type { BaseChatMemory } from 'langchain/memory';
import omit from 'lodash/omit';
import { jsonParse } from 'n8n-workflow';
import type { INodeExecutionData } from 'n8n-workflow';

import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';

import type { AgentResult } from '../types';

/**
 * Finalizes the result by parsing output and preparing execution data.
 * Handles output parser integration and memory-based parsing.
 *
 * @param result - The agent result to finalize
 * @param itemIndex - The current item index
 * @param memory - Optional memory for parsing context
 * @param outputParser - Optional output parser for structured responses
 * @returns INodeExecutionData ready for output
 */
export function finalizeResult(
	result: AgentResult,
	itemIndex: number,
	memory: BaseChatMemory | undefined,
	outputParser: N8nOutputParser | undefined,
): INodeExecutionData {
	// If memory and outputParser are connected, parse the output.
	if (memory && outputParser) {
		const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(result.output);
		// Type assertion needed because parsedOutput can be various types
		result.output = (parsedOutput?.output ?? parsedOutput) as unknown as string;
	}

	// Omit internal keys before returning the result.
	const itemResult: INodeExecutionData = {
		json: omit(
			result,
			'system_message',
			'formatting_instructions',
			'input',
			'chat_history',
			'agent_scratchpad',
		),
		pairedItem: { item: itemIndex },
	};

	return itemResult;
}
