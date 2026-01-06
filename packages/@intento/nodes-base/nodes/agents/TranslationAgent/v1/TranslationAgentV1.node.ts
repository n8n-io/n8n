import type { IFunctions } from 'intento-core';
import { ContextFactory, SupplyFactory, Tracer } from 'intento-core';
import type { TranslationSupplierBase } from 'intento-translation';
import { TranslationError, TranslationResponse, CONTEXT_TRANSLATION, TranslationContext } from 'intento-translation';
import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class TranslationAgentV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: { name: 'Translation Agent' },
			inputs: `={{
				((numberModels) => {
					const inputs = [{ type: 'main' }];
					for (let i = 0; i < numberModels; i++) {
						inputs.push({
							type: 'intento_translationProvider',
							maxConnections: 1,
							displayName: 'M' + i,
							required: i === 0,
						});
					}
					return inputs;
				})($parameter.numberModels)
			}}`,
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName: 'Number of Models',
					name: 'numberModels',
					type: 'options',
					default: 1,
					options: [
						{ name: '1', value: 1 },
						{ name: '2', value: 2 },
						{ name: '3', value: 3 },
						{ name: '4', value: 4 },
						{ name: '5', value: 5 },
						{ name: '6', value: 6 },
						{ name: '7', value: 7 },
						{ name: '8', value: 8 },
						{ name: '9', value: 9 },
					],
					description: 'Number of translation provider slots to connect (1-9). First is required, others optional for failover.',
				},
				...CONTEXT_TRANSLATION,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const tracer = new Tracer(this);
		tracer.debug('🤖 Executing Translation Agent node...');
		const result = await TranslationAgentV1.supplyTranslation(this, tracer);
		if (result instanceof TranslationResponse) return [[{ json: result.asDataObject() }]];
		//	if (result instanceof TranslationError && this.continueOnFail()) {
		const error = { json: { error: result.asDataObject() } };
		const errorOutput = this.helpers.constructExecutionMetaData([error], { itemData: { item: 0 } });
		return [errorOutput];
		//	}
		tracer.error('🤖 All translation suppliers failed.', result?.asLogMetadata());
		return [[]];
	}

	private static async supplyTranslation(functions: IFunctions, tracer: Tracer): Promise<TranslationResponse | TranslationError> {
		const connection = NodeConnectionTypes.IntentoTranslationProvider;
		const context = ContextFactory.read<TranslationContext>(TranslationContext, functions, tracer);
		const suppliers = await SupplyFactory.getSuppliers<TranslationSupplierBase>(functions, connection, tracer);
		let result: TranslationError | TranslationResponse | undefined;
		for (let i = 0; i < suppliers.length; i++) {
			const request = context.toRequest();
			result = await suppliers[i].supplyWithRetries(request, functions.getExecutionCancelSignal());
			if (result instanceof TranslationResponse) return result;
			if (i >= suppliers.length - 1) return result;
		}
		throw new NodeOperationError(functions.getNode(), 'No translation suppliers were found.');
	}
}
