import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { discordApiMultiPartRequest, discordApiRequest } from '../../transport';

import {
	parseDiscordError,
	prepareEmbeds,
	prepareErrorData,
	prepareMultiPartForm,
	prepareOptions,
} from '../../helpers/utils';

import { embedsFixedCollection, filesFixedCollection } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Webhook URL',
		name: 'webhookUri',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://discord.com/api/webhooks/ID/TOKEN',
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		default: '',
		required: true,
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
				displayName: 'Avatar URL',
				name: 'avatar_url',
				type: 'string',
				default: '',
				description: 'Override the default avatar of the webhook',
				placeholder: 'e.g. https://example.com/image.png',
			},
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
				displayName: 'Text-to-Speech (TTS)',
				name: 'tts',
				type: 'boolean',
				default: false,
				description: 'Whether to have a bot reading the message directly in the channel',
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				description: 'Override the default username of the webhook',
				placeholder: 'e.g. My Username',
			},
			{
				displayName: 'Wait',
				name: 'wait',
				type: 'boolean',
				default: false,
				description:
					'Whether waits for server confirmation of message send before response, and returns the created message body',
			},
		],
	},
	embedsFixedCollection,
	filesFixedCollection,
];

const displayOptions = {
	show: {
		resource: ['webhook'],
		operation: ['sendLegacy'],
		authentication: ['webhook'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const items = this.getInputData();

	for (let i = 0; i < items.length; i++) {
		const content = this.getNodeParameter('content', i) as string;
		const options = prepareOptions(this.getNodeParameter('options', i, {}));

		const embeds = (this.getNodeParameter('embeds', i, undefined) as IDataObject)
			?.values as IDataObject[];
		const files = (this.getNodeParameter('files', i, undefined) as IDataObject)
			?.values as IDataObject[];

		let qs: IDataObject | undefined = undefined;

		if (options.wait) {
			qs = {
				wait: options.wait,
			};

			delete options.wait;
		}

		const body: IDataObject = {
			content,
			...options,
		};

		if (embeds) {
			body.embeds = prepareEmbeds.call(this, embeds);
		}

		try {
			const webhookUri = this.getNodeParameter('webhookUri', i) as string;

			let response: IDataObject[] = [];

			if (files?.length) {
				const multiPartBody = await prepareMultiPartForm.call(this, items, files, body, i);

				response = await discordApiMultiPartRequest.call(
					this,
					'POST',
					'',
					multiPartBody,
					webhookUri,
				);
			} else {
				response = await discordApiRequest.call(this, 'POST', '', body, qs, webhookUri);
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
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
