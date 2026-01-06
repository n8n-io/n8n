import { DeeplDescriptor, DeeplSupplier } from 'intento-translation';
import type { INodeType, INodeTypeDescription, INodeTypeBaseDescription, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class DeeplToolV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: {
				name: 'DeepL',
			},
			usableAsTool: true,
			inputs: [],
			outputs: [NodeConnectionTypes.IntentoTranslationProvider],
			credentials: [
				{
					name: `${DeeplDescriptor.credentials}`,
					required: true,
				},
			],
			properties: [],
		};
	}

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return await Promise.resolve({
			response: new DeeplSupplier(NodeConnectionTypes.IntentoTranslationProvider, this),
		});
	}
}
