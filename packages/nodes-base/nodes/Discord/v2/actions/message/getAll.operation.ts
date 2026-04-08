import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { returnAllOrLimit } from '../../../../../utils/descriptions';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	createSimplifyFunction,
	parseDiscordError,
	prepareErrorData,
	setupChannelGetter,
} from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { channelRLC, simplifyBoolean } from '../common.description';

const properties: INodeProperties[] = [
	channelRLC,
	...returnAllOrLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [simplifyBoolean],
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['getAll'],
	},
	hide: {
		authentication: ['webhook'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	_guildId: string,
	userGuilds: IDataObject[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();
	const simplifyResponse = createSimplifyFunction([
		'id',
		'channel_id',
		'author',
		'content',
		'timestamp',
		'type',
	]);

	const getChannelId = await setupChannelGetter.call(this, userGuilds);

	for (let i = 0; i < items.length; i++) {
		try {
			const channelId = await getChannelId(i);

			const returnAll = this.getNodeParameter('returnAll', i, false);

			const qs: IDataObject = {};

			let response: IDataObject[] = [];

			if (!returnAll) {
				const limit = this.getNodeParameter('limit', 0);
				qs.limit = limit;
				response = await discordApiRequest.call(
					this,
					'GET',
					`/channels/${channelId}/messages`,
					undefined,
					qs,
				);
			} else {
				let responseData;
				qs.limit = 100;

				do {
					responseData = await discordApiRequest.call(
						this,
						'GET',
						`/channels/${channelId}/messages`,
						undefined,
						qs,
					);
					if (!responseData?.length) break;
					qs.before = responseData[responseData.length - 1].id;
					response.push(...responseData);
				} while (responseData.length);
			}

			const simplify = this.getNodeParameter('options.simplify', i, false) as boolean;

			if (simplify) {
				response = response.map(simplifyResponse);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		} catch (error) {
			const err = parseDiscordError.call(this, error, i);

			if (this.continueOnFail()) {
				returnData.push(...prepareErrorData.call(this, err, i));
				continue;
			}

			throw err;
		}
	}

	return returnData;
}
