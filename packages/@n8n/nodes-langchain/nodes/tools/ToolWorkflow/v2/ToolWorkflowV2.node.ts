import type {
	INodeTypeBaseDescription,
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { nodeNameToToolName } from '@utils/helpers';

import { localResourceMapping } from './methods';
import { WorkflowToolService } from './utils/WorkflowToolService';
import { versionDescription } from './versionDescription';

export class ToolWorkflowV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		localResourceMapping,
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const node = this.getNode();
		const { typeVersion } = node;
		const returnAllItems = typeVersion > 2;

		const workflowToolService = new WorkflowToolService(this, { returnAllItems });
		const name =
			typeVersion <= 2.1
				? (this.getNodeParameter('name', itemIndex) as string)
				: nodeNameToToolName(node);
		const description = this.getNodeParameter('description', itemIndex) as string;

		const tool = await workflowToolService.createTool({
			ctx: this,
			name,
			description,
			itemIndex,
		});

		return { response: tool };
	}
}
