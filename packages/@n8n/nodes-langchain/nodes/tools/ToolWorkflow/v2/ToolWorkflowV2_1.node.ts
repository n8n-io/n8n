import type { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';

import { ToolWorkflowV2 } from './ToolWorkflowV2.node';
import { WorkflowToolService } from './utils/WorkflowToolService';

export class ToolWorkflowV2_1 extends ToolWorkflowV2 {
	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const workflowToolService = new WorkflowToolService(this);
		const name = this.getNodeParameter('name', itemIndex) as string;
		const description = this.getNodeParameter('description', itemIndex) as string;

		const tool = await workflowToolService.createTool({
			name,
			description,
			itemIndex,
			returnAllItems: true,
		});

		return { response: tool };
	}
}
