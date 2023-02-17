import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { parseDiscordError, prepareErrorData } from '../../helpers/utils';
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
		description:
			'The emoji you want to react with, get the code from <a href="https://unicode.org/emoji/charts/full-emoji-list.html" target="_blank">here</a>',
		placeholder: 'e.g. 🙂',
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['react'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		try {
			const channelId = this.getNodeParameter('channelId', i, undefined, {
				extractValue: true,
			}) as string;

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
			const err = parseDiscordError.call(this, error);

			if (this.continueOnFail()) {
				returnData.push(...prepareErrorData.call(this, err, i));
				continue;
			}

			throw err;
		}
	}

	return returnData;
}
