import type { INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../utils/utilities';

export const guildRLC: INodeProperties = {
	displayName: 'Server',
	name: 'guildId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'Select the server (guild) that your bot is connected to',
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
	description: 'Select the channel by name, URL, or ID',
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
	description: 'Select the channel by name, URL, or ID',
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
		loadOptionsDependsOn: ['userId.value', 'guildId.value', 'operation'],
	},
	required: true,
	// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-multi-options
	description: 'Select the roles you want to add to the user',
	default: [],
};

// moderation --------------------------------------------------------------------------------

// Maps the reason option value to the text written to Discord's audit log
export const moderationReasonLabels: Record<string, string> = {
	suspicious_spam: 'Suspicious or spam account',
	compromised: 'Compromised or hacked account',
	rule_break: 'Breaking server rules',
};

export const moderationReason: INodeProperties = {
	displayName: 'Reason',
	name: 'reason',
	type: 'options',
	description: 'The reason recorded in the server audit log',
	options: [
		{
			name: 'Suspicious or Spam Account',
			value: 'suspicious_spam',
		},
		{
			name: 'Compromised or Hacked Account',
			value: 'compromised',
		},
		{
			name: 'Breaking Server Rules',
			value: 'rule_break',
		},
		{
			name: 'Other',
			value: 'other',
		},
	],
	default: 'suspicious_spam',
};

export const moderationReasonCustom: INodeProperties = {
	displayName: 'Custom Reason',
	name: 'reasonCustom',
	type: 'string',
	default: '',
	description: 'The custom reason recorded in the server audit log',
	placeholder: 'e.g. Posting phishing links',
	displayOptions: {
		show: {
			reason: ['other'],
		},
	},
};

export const banDeleteHistory: INodeProperties = {
	displayName: 'Delete Message History',
	name: 'deleteMessageSeconds',
	type: 'options',
	description: "How much of the user's recent message history to delete on ban",
	options: [
		{ name: 'No Cleanup', value: 0 },
		{ name: 'Previous Hour', value: 3600 },
		{ name: 'Previous 6 Hours', value: 21600 },
		{ name: 'Previous 12 Hours', value: 43200 },
		{ name: 'Previous 24 Hours', value: 86400 },
		{ name: 'Previous 3 Days', value: 259200 },
		{ name: 'Previous 7 Days', value: 604800 },
	],
	default: 0,
};

export const timeoutDuration: INodeProperties = {
	displayName: 'Duration',
	name: 'duration',
	type: 'options',
	description: 'How long the member is prevented from interacting (Discord max is 28 days)',
	options: [
		{ name: '60 Seconds', value: 60 },
		{ name: '5 Minutes', value: 300 },
		{ name: '1 Hour', value: 3600 },
		{ name: '1 Day', value: 86400 },
		{ name: '1 Week', value: 604800 },
		{ name: '28 Days (Max)', value: 2419200 },
		{ name: 'Remove Timeout', value: 'remove' },
	],
	default: 3600,
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
	default: true,
	description: 'Whether to return a simplified version of the response instead of the raw data',
};

// embeds -----------------------------------------------------------------------------------------
const embedFields: INodeProperties[] = [
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		description: 'The description of embed',
		placeholder: 'e.g. My description',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Author',
		name: 'author',
		type: 'string',
		default: '',
		description: 'The name of the author',
		placeholder: 'e.g. John Doe',
	},
	{
		displayName: 'Color',
		name: 'color',

		type: 'color',
		default: '',
		description: 'Color code of the embed',
		placeholder: 'e.g. 12123432',
	},
	{
		displayName: 'Timestamp',
		name: 'timestamp',
		type: 'dateTime',
		default: '',
		description: 'The time displayed at the bottom of the embed. Provide in ISO8601 format.',
		placeholder: 'e.g. 2023-02-08 09:30:26',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		description: 'The title of embed',
		placeholder: "e.g. Embed's title",
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		description: 'The URL where you want to link the embed to',
		placeholder: 'e.g. https://discord.com/',
	},
	{
		displayName: 'URL Image',
		name: 'image',
		type: 'string',
		default: '',
		description: 'Source URL of image (only supports http(s) and attachments)',
		placeholder: 'e.g. https://example.com/image.png',
	},
	{
		displayName: 'URL Thumbnail',
		name: 'thumbnail',
		type: 'string',
		default: '',
		description: 'Source URL of thumbnail (only supports http(s) and attachments)',
		placeholder: 'e.g. https://example.com/image.png',
	},
	{
		displayName: 'URL Video',
		name: 'video',
		type: 'string',
		default: '',
		description: 'Source URL of video',
		placeholder: 'e.g. https://example.com/video.mp4',
	},
];

const embedFieldsDescription = updateDisplayOptions(
	{
		show: {
			inputMethod: ['fields'],
		},
	},
	embedFields,
);

export const embedsFixedCollection: INodeProperties = {
	displayName: 'Embeds',
	name: 'embeds',
	type: 'fixedCollection',
	placeholder: 'Add Embeds',
	typeOptions: {
		multipleValues: true,
	},
	default: [],
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'Input Method',
					name: 'inputMethod',
					type: 'options',
					options: [
						{
							name: 'Enter Fields',
							value: 'fields',
						},
						{
							name: 'Raw JSON',
							value: 'json',
						},
					],
					default: 'fields',
				},
				{
					displayName: 'Value',
					name: 'json',
					type: 'json',
					default: '={}',
					typeOptions: {
						rows: 2,
					},
					displayOptions: {
						show: {
							inputMethod: ['json'],
						},
					},
				},
				...embedFieldsDescription,
			],
		},
	],
};

// -------------------------------------------------------------------------------------------

export const filesFixedCollection: INodeProperties = {
	displayName: 'Files',
	name: 'files',
	type: 'fixedCollection',
	placeholder: 'Add Files',
	typeOptions: {
		multipleValues: true,
	},
	default: [],
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'Input Data Field Name',
					name: 'inputFieldName',
					type: 'string',
					default: 'data',
					description: 'The contents of the file being sent with the message',
					placeholder: 'e.g. data',
					hint: 'The name of the input field containing the binary file data to be sent',
				},
			],
		},
	],
};

export const sendToProperties: INodeProperties[] = [
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
];
