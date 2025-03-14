import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { parseDiscordError, prepareErrorData, setupChannelGetter } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { channelRLC, messageIdString } from '../common.description';

const properties: INodeProperties[] = [
	channelRLC,
	messageIdString,
	{
		displayName: 'Emoji',
		name: 'emoji',
		type: 'string',
		default: '',
		required: true,
		description: 'The emoji you want to react with',
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['react'],
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

	const getChannelId = await setupChannelGetter.call(this, userGuilds);

	for (let i = 0; i < items.length; i++) {
		try {
			const channelId = await getChannelId(i);

			const messageId = this.getNodeParameter('messageId', i) as string;
			const emoji = this.getNodeParameter('emoji', i) as string;

			await discordApiRequest.call(
				this,
				'PUT',
				`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ success: true }),
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
