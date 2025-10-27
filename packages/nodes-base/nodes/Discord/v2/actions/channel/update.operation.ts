import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { parseDiscordError, prepareErrorData, setupChannelGetter } from '../../helpers/utils';
import { discordApiRequest } from '../../transport';
import { categoryRLC, channelRLC } from '../common.description';

const properties: INodeProperties[] = [
	channelRLC,
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description:
			"The new name of the channel. Fill this field only if you want to change the channel's name.",
		placeholder: 'e.g. new-channel-name',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Age-Restricted (NSFW)',
				name: 'nsfw',
				type: 'boolean',
				default: false,
				description: 'Whether the content of the channel might be nsfw (not safe for work)',
			},
			{
				displayName: 'Bitrate',
				name: 'bitrate',
				type: 'number',
				default: 8000,
				typeOptions: {
					minValue: 8000,
					maxValue: 96000,
				},
				description: 'The bitrate (in bits) of the voice channel',
				hint: 'Only applicable to voice channels',
			},
			categoryRLC,
			{
				displayName: 'Position',
				name: 'position',
				type: 'number',
				default: 1,
			},

			{
				displayName: 'Rate Limit Per User',
				name: 'rate_limit_per_user',
				type: 'number',
				default: 0,
				description: 'Amount of seconds a user has to wait before sending another message',
			},
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 2,
				},
				description: 'The channel topic description (0-1024 characters)',
				placeholder: 'e.g. This channel is about…',
			},
			{
				displayName: 'User Limit',
				name: 'user_limit',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
					maxValue: 99,
				},
				placeholder: 'e.g. 20',
				hint: 'Only applicable to voice channels',
				description:
					'The limit for the number of members that can be in the channel (0 refers to no limit)',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['channel'],
		operation: ['update'],
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

			const name = this.getNodeParameter('name', i) as string;
			const options = this.getNodeParameter('options', i);

			if (options.categoryId) {
				options.parent_id = (options.categoryId as IDataObject).value;
				delete options.categoryId;
			}

			const body: IDataObject = {
				name,
				...options,
			};

			const response = await discordApiRequest.call(this, 'PATCH', `/channels/${channelId}`, body);

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
