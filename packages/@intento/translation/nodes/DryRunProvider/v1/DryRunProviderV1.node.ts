import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	INodeProperties,
} from 'n8n-workflow';

const dryRunNodeProperties: INodeProperties[] = [
	{
		displayName: 'Provider Name',
		name: 'providerName',
		type: 'string',
		default: 'dryrun',
		description: 'Name of the DryRun translation provider instance',
	},
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
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: dryRunNodeProperties,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Return empty execution data
		return [];
	}
}
