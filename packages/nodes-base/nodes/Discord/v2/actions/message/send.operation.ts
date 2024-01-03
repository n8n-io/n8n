import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { discordApiMultiPartRequest, discordApiRequest } from '../../transport';
import {
	embedsFixedCollection,
	filesFixedCollection,
	textChannelRLC,
	userRLC,
} from '../common.description';

import {
	checkAccessToChannel,
	parseDiscordError,
	prepareEmbeds,
	prepareErrorData,
	prepareMultiPartForm,
	prepareOptions,
} from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Send To',
		name: 'sendTo',
		type: 'options',
		options: [
			{
				name: 'User',
				value: 'user',
			},
			{
				name: 'Channel',
				value: 'channel',
			},
		],
		default: 'channel',
		description: 'Send message to a channel or DM to a user',
	},

	{
		...userRLC,
		displayOptions: {
			show: {
				sendTo: ['user'],
			},
		},
	},
	{
		...textChannelRLC,
		displayOptions: {
			show: {
				sendTo: ['channel'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'content',
		type: 'string',
		default: '',
		description: 'The content of the message (up to 2000 characters)',
		placeholder: 'e.g. My message',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Flags',
				name: 'flags',
				type: 'multiOptions',
				default: [],
				description:
					'Message flags. <a href="https://discord.com/developers/docs/resources/channel#message-object-message-flags" target="_blank">More info</a>.”.',
				options: [
					{
						name: 'Suppress Embeds',
						value: 'SUPPRESS_EMBEDS',
					},
					{
						name: 'Suppress Notifications',
						value: 'SUPPRESS_NOTIFICATIONS',
					},
				],
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Message to Reply to',
				name: 'message_reference',
				type: 'string',
				default: '',
				description: 'Fill this to make your message a reply. Add the message ID.',
				placeholder: 'e.g. 1059467601836773386',
			},
			{
				displayName: 'Text-to-Speech (TTS)',
				name: 'tts',
				type: 'boolean',
				default: false,
				description: 'Whether to have a bot reading the message directly in the channel',
			},
		],
	},
	embedsFixedCollection,
	filesFixedCollection,
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['send'],
	},
	hide: {
		authentication: ['webhook'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	guildId: string,
	userGuilds: IDataObject[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	const isOAuth2 = this.getNodeParameter('authentication', 0) === 'oAuth2';

	for (let i = 0; i < items.length; i++) {
		const content = this.getNodeParameter('content', i) as string;
		const options = prepareOptions(this.getNodeParameter('options', i, {}), guildId);

		const embeds = (this.getNodeParameter('embeds', i, undefined) as IDataObject)
			?.values as IDataObject[];
		const files = (this.getNodeParameter('files', i, undefined) as IDataObject)
			?.values as IDataObject[];

		const body: IDataObject = {
			content,
			...options,
		};

		if (embeds) {
			body.embeds = prepareEmbeds.call(this, embeds, i);
		}

		try {
			const sendTo = this.getNodeParameter('sendTo', i) as string;

			let channelId = '';

			if (sendTo === 'user') {
				const userId = this.getNodeParameter('userId', i, undefined, {
					extractValue: true,
				}) as string;

				channelId = (
					(await discordApiRequest.call(this, 'POST', '/users/@me/channels', {
						recipient_id: userId,
					})) as IDataObject
				).id as string;
			}

			if (sendTo === 'channel') {
				channelId = this.getNodeParameter('channelId', i, undefined, {
					extractValue: true,
				}) as string;
			}

			if (!channelId) {
				throw new NodeOperationError(this.getNode(), 'Channel ID is required');
			}

			if (isOAuth2) await checkAccessToChannel.call(this, channelId, userGuilds, i);

			let response: IDataObject[] = [];

			if (files?.length) {
				const multiPartBody = await prepareMultiPartForm.call(this, items, files, body, i);

				response = await discordApiMultiPartRequest.call(
					this,
					'POST',
					`/channels/${channelId}/messages`,
					multiPartBody,
				);
			} else {
				response = await discordApiRequest.call(
					this,
					'POST',
					`/channels/${channelId}/messages`,
					body,
				);
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
