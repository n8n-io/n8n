import type { INodeProperties } from 'n8n-workflow';

export const channelRLC: INodeProperties = {
	displayName: 'Channel',
	name: 'channelId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Select the channel by name or ID',
	modes: [
		{
			displayName: 'By Name',
			name: 'list',
			type: 'list',
			placeholder: 'e.g. my-channel',
			typeOptions: {
				searchListMethod: 'channelSearch',
				searchable: true,
			},
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://discord.com/channels/[guild-id]/[channel-id]',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/discord.com\\/channels\\/[0-9]+\\/([0-9]+)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https:\\/\\/discord.com\\/channels\\/[0-9]+\\/([0-9]+)',
						errorMessage: 'Not a valid Discord Channel URL',
					},
				},
			],
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 896347036838936576',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[0-9]+',
						errorMessage: 'Not a valid Discord Channel ID',
					},
				},
			],
		},
	],
};

export const categoryRLC: INodeProperties = {
	displayName: 'Parent Category',
	name: 'categoryId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description: 'The parent category where you want the channel to appear',
	modes: [
		{
			displayName: 'By Name',
			name: 'list',
			type: 'list',
			placeholder: 'e.g. my-channel',
			typeOptions: {
				searchListMethod: 'categorySearch',
				searchable: true,
			},
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://discord.com/channels/[guild-id]/[channel-id]',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/discord.com\\/channels\\/[0-9]+\\/([0-9]+)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https:\\/\\/discord.com\\/channels\\/[0-9]+\\/([0-9]+)',
						errorMessage: 'Not a valid Discord Category URL',
					},
				},
			],
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 896347036838936576',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[0-9]+',
						errorMessage: 'Not a valid Discord Category ID',
					},
				},
			],
		},
	],
};
