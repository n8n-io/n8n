import type {
	INodeTypeBaseDescription,
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { loadWorkflowInputMappings } from './methods/resourceMapping';
import { SupplyDataService } from './utils/SupplyDataService';
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
		localResourceMapping: {
			loadWorkflowInputMappings,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const supplyDataService = new SupplyDataService(this);
		const name = this.getNodeParameter('name', itemIndex) as string;
		const description = this.getNodeParameter('description', itemIndex) as string;
		const workflowProxy = this.getWorkflowDataProxy(0);

		// TODO: Move this to the service also
		const subworkflowInputsSchema = supplyDataService.getSubworkflowInputsSchema();
		const useSchema = subworkflowInputsSchema.length > 0;

		const tool = await supplyDataService.createTool({
			name,
			description,
			itemIndex,
			useSchema,
			workflowProxy,
		});

		return { response: tool };
	}
}
