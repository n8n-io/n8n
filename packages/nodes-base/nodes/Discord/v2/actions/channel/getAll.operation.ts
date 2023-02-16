import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { discordApiRequest } from '../../transport';
import { maxResultsNumber } from '../common.description';

const properties: INodeProperties[] = [
	maxResultsNumber,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Guild Text',
						value: 0,
					},
					{
						name: 'Guild Voice',
						value: 2,
					},
					{
						name: 'Guild Category',
						value: 4,
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	guildId: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	try {
		let response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);

		const maxResults = this.getNodeParameter('maxResults', 0, 50) as number;

		if (maxResults) {
			response = (response as IDataObject[]).slice(0, maxResults);
		}

		const options = this.getNodeParameter('options', 0, {});

		if (options.filter) {
			const filter = options.filter as number[];
			response = (response as IDataObject[]).filter((item) => filter.includes(item.type as number));
		}

		const executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(response),
			{ itemData: { item: 0 } },
		);

		returnData.push(...executionData);
	} catch (error) {
		console.log(error);
		if (this.continueOnFail()) {
			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: 0 } },
			);
			returnData.push(...executionErrorData);
		}
		throw error;
	}

	return returnData;
}
