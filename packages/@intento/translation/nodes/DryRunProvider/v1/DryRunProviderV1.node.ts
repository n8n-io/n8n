import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type INodeTypeBaseDescription,
	type INodeProperties,
	NodeConnectionTypes,
} from 'n8n-workflow';

const dryRunNodeProperties: INodeProperties[] = [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		default: 'passthrough',
		options: [
			{
				name: 'Passthrough',
				value: 'passthrough',
				description: 'Returns input as-is without modifications',
			},
			{
				name: 'Echo',
				value: 'echo',
				description: 'Echoes the input with provider name prefix',
			},
		],
		description: 'Operational mode of the DryRun provider',
	},
];

export class DryRunProviderV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 1,
			defaults: { name: 'DryRun Translation Provider' },
			inputs: [],
			outputs: [NodeConnectionTypes.IntentoTranslationProvider],
			properties: dryRunNodeProperties,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Return empty execution data
		return [];
	}
}
