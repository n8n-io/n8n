import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { returnAllOrLimit } from '../../../../../utils/descriptions';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { parseDiscordError, prepareErrorData } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	...returnAllOrLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Filter by Type',
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
	hide: {
		authentication: ['webhook'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	guildId: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	try {
		const returnAll = this.getNodeParameter('returnAll', 0, false);
		let response = await discordApiRequest.call(this, 'GET', `/guilds/${guildId}/channels`);

		if (!returnAll) {
			const limit = this.getNodeParameter('limit', 0);
			response = (response as IDataObject[]).slice(0, limit);
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
		const err = parseDiscordError.call(this, error);

		if (this.continueOnFail()) {
			returnData.push(...prepareErrorData.call(this, err, 0));
		}

		throw err;
	}

	return returnData;
}
