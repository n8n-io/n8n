import type { INodeProperties } from 'n8n-workflow';

export const guildRLC: INodeProperties = {
	displayName: 'Server',
	name: 'guildId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Select the server(guild) that your bot is connected to',
	modes: [
		{
			displayName: 'By Name',
			name: 'list',
			type: 'list',
			placeholder: 'e.g. my-server',
			typeOptions: {
				searchListMethod: 'guildSearch',
			},
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://discord.com/channels/[guild-id]',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/discord.com\\/channels\\/([0-9]+)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https:\\/\\/discord.com\\/channels\\/([0-9]+)',
						errorMessage: 'Not a valid Discord Server URL',
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
						errorMessage: 'Not a valid Discord Server ID',
					},
				},
			],
		},
	],
};

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

export const textChannelRLC: INodeProperties = {
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
				searchListMethod: 'textChannelSearch',
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

export const userRLC: INodeProperties = {
	displayName: 'User',
	name: 'userId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	description: 'Select the user you want to assign a role to',
	modes: [
		{
			displayName: 'By Name',
			name: 'list',
			type: 'list',
			placeholder: 'e.g. DiscordUser',
			typeOptions: {
				searchListMethod: 'userSearch',
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 786953432728469534',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[0-9]+',
						errorMessage: 'Not a valid User ID',
					},
				},
			],
		},
	],
};

export const roleMultiOptions: INodeProperties = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
	displayName: 'Role',
	name: 'role',
	type: 'multiOptions',
	typeOptions: {
		loadOptionsMethod: 'getRoles',
	},
	required: true,
	// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
	description: 'Select the roles you want to add to the user',
	default: [],
};

export const maxResultsNumber: INodeProperties = {
	displayName: 'Max Results',
	name: 'maxResults',
	type: 'number',
	typeOptions: {
		minValue: 1,
	},
	default: 50,
	description: 'Maximum number of results. Too many results may slow down the query.',
};

export const messageIdString: INodeProperties = {
	displayName: 'Message ID',
	name: 'messageId',
	type: 'string',
	default: '',
	required: true,
	description: 'The ID of the message',
	placeholder: 'e.g. 1057576506244726804',
};

export const simplifyBoolean: INodeProperties = {
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: false,
	description: 'Whether to return a simplified version of the response instead of the raw data',
};
