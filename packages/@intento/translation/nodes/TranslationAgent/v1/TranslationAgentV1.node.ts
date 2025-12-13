import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	NodeConnectionTypes,
} from 'n8n-workflow';

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
							type: 'intento_nmt',
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
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		this.logger.debug(`🚀 Checking connected models..`);
		const models = await this.getInputConnectionData(
			NodeConnectionTypes.IntentoTranslationProvider,
			0,
		);
		// Check connected models and restore order
		if (Array.isArray(models) && models.length > 0) {
			this.logger.debug(`🔗 Models connected: ${models.length}`);
			const reversedModels = [...models].reverse();

			// Try executing each model in left to right order
			for (let i = 0; i < reversedModels.length; i++) {
				const model = reversedModels[i];
				this.logger.debug(`🔗 Execuring model "${i}". Info: "${JSON.stringify(model)}"`);
				try {
					const startTime = Date.now();
					const response = await model.invoke([
						{ role: 'system', content: this.getNodeParameter('systemMessage', 0) as string },
						{ role: 'user', content: this.getNodeParameter('userMessage', 0) as string },
					]);
					this.logger.debug(`✅ Model "${i}" execution completed in "${Date.now() - startTime}ms"`);
					return [[{ json: response }]];
				} catch (error) {
					this.logger.warn(`⚠️ Model "${i}" execution failed because of "${error.toString()}"`);
				}
			}
		}
		throw new Error(
			'❌ No models were able to process the request. Please check your models configuration and try again.',
		);
	}
}
