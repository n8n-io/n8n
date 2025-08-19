import type { Serialized } from '@langchain/core/load/serializable';
import type { LLMResult } from '@langchain/core/outputs';
import type { IDataObject, ISupplyDataFunctions } from 'n8n-workflow';
import { N8nLlmTracing } from '../N8nLlmTracing';

/**
 * Adapter wrapper for N8nLlmTracing that handles parameter conversion
 * for fake LLMs that might pass different parameter types than expected.
 */
export class N8nLlmTracingAdapter extends N8nLlmTracing {
	constructor(executionFunctions: ISupplyDataFunctions) {
		super(executionFunctions);
	}

	async handleLLMStart(llm: Serialized, prompts: any, runId: string) {
		// Convert various input types to string array as expected by N8nLlmTracing
		let promptStrings: string[];

		if (Array.isArray(prompts)) {
			// Handle array of messages or strings
			promptStrings = prompts.map((prompt) => {
				if (typeof prompt === 'string') {
					return prompt;
				} else if (prompt && typeof prompt.content === 'string') {
					// Handle BaseMessage objects
					return prompt.content;
				} else if (prompt && typeof prompt.toString === 'function') {
					return prompt.toString();
				} else {
					return String(prompt);
				}
			});
		} else if (typeof prompts === 'string') {
			promptStrings = [prompts];
		} else if (prompts && typeof prompts.content === 'string') {
			// Single BaseMessage object
			promptStrings = [prompts.content];
		} else {
			// Fallback
			promptStrings = [String(prompts)];
		}

		// Call the original handleLLMStart with properly formatted strings
		return super.handleLLMStart(llm, promptStrings, runId);
	}

	async handleLLMEnd(output: LLMResult, runId: string) {
		return super.handleLLMEnd(output, runId);
	}

	async handleLLMError(error: IDataObject | Error, runId: string, parentRunId?: string) {
		return super.handleLLMError(error, runId, parentRunId);
	}
}
