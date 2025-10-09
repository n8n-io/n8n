import type { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';

import type {
	INodeTypeBaseDescription,
	ISupplyDataFunctions,
	SupplyData,
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { nodeNameToToolName } from 'n8n-workflow';

import { localResourceMapping } from './methods';
import { WorkflowToolService } from './utils/WorkflowToolService';
import { versionDescription } from './versionDescription';

async function getTool(
	ctx: ISupplyDataFunctions | IExecuteFunctions,
	enableLogging: boolean,
	itemIndex: number,
): Promise<DynamicTool | DynamicStructuredTool> {
	const node = ctx.getNode();
	const { typeVersion } = node;
	const returnAllItems = typeVersion > 2;

	const workflowToolService = new WorkflowToolService(ctx, { returnAllItems });
	const name =
		typeVersion <= 2.1 ? (ctx.getNodeParameter('name', 0) as string) : nodeNameToToolName(node);
	const description = ctx.getNodeParameter('description', 0) as string;

	return await workflowToolService.createTool({
		ctx,
		name,
		description,
		itemIndex,
		manualLogging: enableLogging,
	});
}

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
		return { response: await getTool(this, true, itemIndex) };
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const response: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < this.getInputData().length; itemIndex++) {
			const item = items[itemIndex];
			const tool = await getTool(this, false, itemIndex);

			if (item === undefined) {
				continue;
			}
			const result = await tool.invoke(item.json);
			response.push(result);
		}

		return [response];
	}
}
