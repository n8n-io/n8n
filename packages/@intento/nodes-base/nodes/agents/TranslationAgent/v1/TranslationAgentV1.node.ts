import { CONTEXT_TRANSLATION, TranslationAgent } from 'intento-translation';
import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, INodeTypeBaseDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

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
							type: 'intento_translationSupplier',
							maxConnections: 1,
							displayName: 'M' + i,
							required: i === 0,
						});
					}
					inputs.push({ type: 'intento_segmentSupplier', maxConnections: 1, required: true, displayName: 'Segmentation' });
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
		const signal = this.getExecutionCancelSignal() ?? new AbortController().signal;
		const agent = await TranslationAgent.initializeAgent(this, signal);
		return await agent.run(signal);
	}
}
