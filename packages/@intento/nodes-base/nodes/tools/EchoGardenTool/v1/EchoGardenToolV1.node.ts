import { EchogardenSupplier } from 'intento-segmentation';
import type { INodeType, INodeTypeDescription, INodeTypeBaseDescription, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class EchoGardenToolV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: { name: 'EchoGarden' },
			inputs: [],
			outputs: [NodeConnectionTypes.IntentoSegmentSupplier],
			properties: [],
		};
	}

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return await Promise.resolve({
			response: new EchogardenSupplier(this),
		});
	}
}
