import type {
	INodeTypeBaseDescription,
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

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
		const workflowToolService = new WorkflowToolService(this);
		const name = this.getNodeParameter('name', itemIndex) as string;
		const description = this.getNodeParameter('description', itemIndex) as string;

		const tool = await workflowToolService.createTool({
			name,
			description,
			itemIndex,
		});

		return { response: tool };
	}
}
