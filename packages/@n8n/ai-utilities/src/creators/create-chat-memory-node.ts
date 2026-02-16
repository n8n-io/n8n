import type { INodeType, ISupplyDataFunctions } from 'n8n-workflow';

import { supplyMemory } from 'src/suppliers/supplyMemory';
import type { ChatMemoryNodeConfig } from 'src/types/creators';

export const createChatMemoryNode = (chatMemoryNode: ChatMemoryNodeConfig): unknown => {
	return class ChatMemoryNode implements INodeType {
		description = chatMemoryNode.description;
		methods = chatMemoryNode.methods;

		async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
			const memory = await chatMemoryNode.getMemory(this, itemIndex);
			return supplyMemory(this, memory, chatMemoryNode.memoryOptions);
		}
	};
};
