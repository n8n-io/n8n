import {
	type INodeType,
	type INodeTypeDescription,
	type INodeTypeBaseDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { DryRunTranslationSupplier } from '../../../suppliers/DryRunTranslationSupplier';
import { TranslationFeatures } from '../../../types/TranslationFeatures';

export class DryRunProviderV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: { name: 'DryRun' },
			inputs: [],
			outputs: [NodeConnectionTypes.TranslationSupplier],
			properties: [
				...TranslationFeatures.MOCKED_TRANSLATION,
				...TranslationFeatures.DELAY,
				...TranslationFeatures.RETRY,
			],
		};
	}

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return {
			response: new DryRunTranslationSupplier(NodeConnectionTypes.TranslationSupplier, this),
		};
	}
}
