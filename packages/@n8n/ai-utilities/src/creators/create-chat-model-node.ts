import type { INodeType, ISupplyDataFunctions } from 'n8n-workflow';

import { supplyModel } from 'src/suppliers/supplyModel';
import type { ChatModelNodeConfig } from 'src/types/creators';

export const createChatModelNode = (chatModelNode: ChatModelNodeConfig): unknown => {
	return class ChatModelNode implements INodeType {
		description = chatModelNode.description;
		methods = chatModelNode.methods;

		async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
			const model = await chatModelNode.getModel(this, itemIndex);
			return supplyModel(this, model);
		}
	};
};
