import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type INodeTypeBaseDescription,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

import type { TranslationRequest } from '../../../types/TranslationRequest';
import type { TranslationSupplier } from '../../../types/TranslationSupplier';

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
					description:
						'Number of translation provider slots to connect (1-9). First is required, others optional for failover.',
				},
				{
					displayName: 'Text to Translate',
					name: 'text',
					type: 'string',
					default: '',
					description: 'The text you want to translate',
					placeholder: 'Enter text to translate',
				},
				{
					displayName: 'From Language',
					name: 'from',
					type: 'string',
					default: 'en',
					description: 'ISO 639-1 language code of the source language (e.g., en, es, fr)',
					placeholder: 'en',
				},
				{
					displayName: 'To Language',
					name: 'to',
					type: 'string',
					default: 'es',
					description: 'ISO 639-1 language code of the target language (e.g., en, es, fr)',
					placeholder: 'es',
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug(`🚀 Checking translation providers connected to ${this.getNode().name}..`);
		const connections = await this.getInputConnectionData(
			NodeConnectionTypes.TranslationSupplier,
			0,
		);

		if (!Array.isArray(connections) || connections.length <= 0) {
			const nodeName = this.getNode().name;
			const message = `❌ At least one translation provider must be connected to ${nodeName}.`;
			throw new NodeOperationError(this.getNode(), message);
		}

		const request = {
			text: this.getNodeParameter('text', 0),
			from: this.getNodeParameter('from', 0),
			to: this.getNodeParameter('to', 0),
		} as TranslationRequest;
		const suppliers = [...(connections as TranslationSupplier[])].reverse();

		for (let i = 0; i < suppliers.length; i++) {
			try {
				return [[{ json: await suppliers[i].translate(request) }]];
			} catch (error) {
				this.logger.warn(`Provider ${i + 1} failed:`, error);
			}
		}

		throw new NodeOperationError(
			this.getNode(),
			`All ${suppliers.length} translation providers failed to process the request.`,
		);
	}
}
