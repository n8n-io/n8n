import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import {
	parseDiscordError,
	prepareEmbeds,
	prepareErrorData,
	prepareOptions,
	sendDiscordMessage,
} from '../../helpers/utils';
import {
	embedsFixedCollection,
	filesFixedCollection,
	sendToProperties,
} from '../common.description';

const properties: INodeProperties[] = [
	...sendToProperties,
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
		placeholder: 'Add option',
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
			body.embeds = prepareEmbeds.call(this, embeds);
		}

		try {
			returnData.push(
				...(await sendDiscordMessage.call(this, {
					guildId,
					userGuilds,
					isOAuth2,
					body,
					items,
					files,
					itemIndex: i,
				})),
			);
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
