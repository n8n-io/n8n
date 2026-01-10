import { CONTEXT_EXECUTION } from 'intento-core';
import { CONTEXT_SPLIT } from 'intento-segmentation';
import { DryRunSupplier, CONTEXT_DELAY, CONTEXT_DRY_RUN } from 'intento-translation';
import type { INodeType, INodeTypeDescription, INodeTypeBaseDescription, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class DryRunToolV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: { name: 'DryRun' },
			inputs: [],
			outputs: [NodeConnectionTypes.IntentoTranslationSupplier],
			properties: [...CONTEXT_DELAY, ...CONTEXT_DRY_RUN, ...CONTEXT_SPLIT, ...CONTEXT_EXECUTION],
		};
	}

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return await Promise.resolve({
			response: new DryRunSupplier(NodeConnectionTypes.IntentoTranslationSupplier, this),
		});
	}
}
