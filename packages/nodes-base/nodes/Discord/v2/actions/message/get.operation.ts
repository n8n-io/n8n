import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	createSimplifyFunction,
	parseDiscordError,
	prepareErrorData,
	setupChannelGetter,
} from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { channelRLC, messageIdString, simplifyBoolean } from '../common.description';

const properties: INodeProperties[] = [
	channelRLC,
	messageIdString,
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
		operation: ['get'],
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

			const messageId = this.getNodeParameter('messageId', i) as string;

			let response = await discordApiRequest.call(
				this,
				'GET',
				`/channels/${channelId}/messages/${messageId}`,
			);

			const simplify = this.getNodeParameter('options.simplify', i, false) as boolean;

			if (simplify) {
				response = simplifyResponse(response);
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
