import type { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';

import { LangchainMemoryAdapter } from '../adapters/langchain-memory';
import type { ChatMemory } from '../types/memory';
import { logWrapper } from '../utils/log-wrapper';

export interface SupplyMemoryOptions {
	closeFunction?: () => Promise<void>;
}

export function supplyMemory(
	context: ISupplyDataFunctions,
	memory: ChatMemory,
	options?: SupplyMemoryOptions,
): SupplyData {
	const adapter = new LangchainMemoryAdapter(memory);
	const wrappedAdapter = logWrapper(adapter, context);

	return {
		response: wrappedAdapter,
		closeFunction: options?.closeFunction,
	};
}
