import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	discordApiRequest,
} from './GenericFunctions';

import {
	auditLogFields,
	auditLogOperations,
	channelFields,
	channelOperations,
	directMessageFields,
	directMessageOperations,
	emojiFields,
	emojiOperations,
	inviteFields,
	inviteOperations,
	messageFields,
	messageOperations,
	pinnedMessageFields,
	pinnedMessageOperations,
	userFields,
	userOperations,
} from './descriptions';

export class Discord implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discord',
		name: 'discord',
		icon: 'file:discord.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Discord API',
		defaults: {
			name: 'Discord',
			color: '\#7289da',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'discordOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Audit Log',
						value: 'auditLog',
					},
					{
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Direct Message',
						value: 'directMessage',
					},
					{
						name: 'Emoji',
						value: 'emoji',
					},
					{
						name: 'Invite',
						value: 'invite',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Pinned Message',
						value: 'pinnedMessage',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'channel',
				description: 'Resource to consume',
			},
			...auditLogOperations,
			...auditLogFields,
			...channelOperations,
			...channelFields,
			...directMessageOperations,
			...directMessageFields,
			...emojiOperations,
			...emojiFields,
			...inviteOperations,
			...inviteFields,
			...messageOperations,
			...messageFields,
			...pinnedMessageOperations,
			...pinnedMessageFields,
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'auditLog') {

				// **********************************************************************
				//                                auditLog
				// **********************************************************************

				if (operation === 'get') {

					// ----------------------------------------
					//              auditLog: get
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/audit-log#get-guild-audit-log

					const guildId = this.getNodeParameter('guildId', i);

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/guilds/${guildId}/audit-logs`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint, {}, qs);

				}

			} else if (resource === 'channel') {

				// **********************************************************************
				//                                channel
				// **********************************************************************

				if (operation === 'delete') {

					// ----------------------------------------
					//             channel: delete
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#deleteclose-channel

					const channelId = this.getNodeParameter('channelId', i);

					const endpoint = `/channels/${channelId}`;
					responseData = await discordApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------------
					//               channel: get
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#get-channel

					const channelId = this.getNodeParameter('channelId', i);

					const endpoint = `/channels/${channelId}`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------------
					//             channel: update
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#modify-channel

					const channelId = this.getNodeParameter('channelId', i);
					const overwriteId = this.getNodeParameter('overwriteId', i);

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/channels/${channelId}/permissions/${overwriteId}`;
					responseData = await discordApiRequest.call(this, 'PUT', endpoint, {}, qs);

				}

			} else if (resource === 'directMessage') {

				// **********************************************************************
				//                             directMessage
				// **********************************************************************

				if (operation === 'create') {

					// ----------------------------------------
					//          directMessage: create
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/user#create-dm

					const endpoint = '/users/@me/channels';
					responseData = await discordApiRequest.call(this, 'POST', endpoint);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//          directMessage: getAll
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/user#get-user-dms

					const endpoint = '/users/@me/channels';
					responseData = await discordApiRequest.call(this, 'GET', endpoint);

				}

			} else if (resource === 'emoji') {

				// **********************************************************************
				//                                 emoji
				// **********************************************************************

				if (operation === 'create') {

					// ----------------------------------------
					//              emoji: create
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/emoji#create-guild-emoji

					const guildId = this.getNodeParameter('guildId', i);

					const body = {
						name: this.getNodeParameter('name', i),
						image: this.getNodeParameter('image', i),
					} as IDataObject;

					const endpoint = `/guilds/${guildId}/emojis`;
					responseData = await discordApiRequest.call(this, 'POST', endpoint, body);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//              emoji: delete
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/emoji#delete-guild-emoji

					const guildId = this.getNodeParameter('guildId', i);

					const body = {
						name: this.getNodeParameter('name', i),
					} as IDataObject;

					const endpoint = `/guilds/${guildId}/emojis`;
					responseData = await discordApiRequest.call(this, 'DELETE', endpoint, body);

				} else if (operation === 'get') {

					// ----------------------------------------
					//                emoji: get
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/emoji#get-guild-emoji

					const guildId = this.getNodeParameter('guildId', i);
					const emojiId = this.getNodeParameter('emojiId', i);

					const endpoint = `/guilds/${guildId}/emojis/${emojiId}`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//              emoji: getAll
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/emoji#list-guild-emojis

					const guildId = this.getNodeParameter('guildId', i);

					const endpoint = `/guilds/${guildId}/emojis`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'update') {

					// ----------------------------------------
					//              emoji: update
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/emoji#modify-guild-emoji

					const guildId = this.getNodeParameter('guildId', i);
					const emojiId = this.getNodeParameter('emojiId', i);

					const body = {
						name: this.getNodeParameter('name', i),
					} as IDataObject;

					const endpoint = `/guilds/${guildId}/emojis/${emojiId}`;
					responseData = await discordApiRequest.call(this, 'PATCH', endpoint, body);

				}

			} else if (resource === 'invite') {

				// **********************************************************************
				//                                 invite
				// **********************************************************************

				if (operation === 'delete') {

					// ----------------------------------------
					//              invite: delete
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/invite#delete-invite

					const inviteCode = this.getNodeParameter('inviteCode', i);

					const qs: IDataObject = {
						with_counts: this.getNodeParameter('withCounts', i),
					};

					const endpoint = `/invites/${inviteCode}`;
					responseData = await discordApiRequest.call(this, 'DELETE', endpoint, {}, qs);

				} else if (operation === 'get') {

					// ----------------------------------------
					//               invite: get
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/invite#get-invite

					const inviteCode = this.getNodeParameter('inviteCode', i);

					const qs: IDataObject = {
						with_counts: this.getNodeParameter('with_counts', i),
					};

					const endpoint = `/invites/${inviteCode}`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint, {}, qs);

				} else {
					throw new Error(`Unknown operation: ${operation}`);
				}

			} else if (resource === 'message') {

				// **********************************************************************
				//                                message
				// **********************************************************************

				if (operation === 'create') {

					// ----------------------------------------
					//             message: create
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#create-message

					const channelId = this.getNodeParameter('channelId', i);

					const qs: IDataObject = {
						content: this.getNodeParameter('content', i),
					};

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/channels/${channelId}/messages`;
					responseData = await discordApiRequest.call(this, 'POST', endpoint, {}, qs);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//             message: delete
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#delete-message

					const channelId = this.getNodeParameter('channelId', i);
					const messageId = this.getNodeParameter('messageId', i);

					const endpoint = `/channels/${channelId}/messages/${messageId}`;
					responseData = await discordApiRequest.call(this, 'DELETE', endpoint);

				} else if (operation === 'update') {

					// ----------------------------------------
					//             message: update
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#edit-message

					const channelId = this.getNodeParameter('channelId', i);
					const messageId = this.getNodeParameter('messageId', i);

					const qs: IDataObject = {
						content: this.getNodeParameter('content', i),
						embed: this.getNodeParameter('embed', i),
					};

					const endpoint = `/channels/${channelId}/messages/${messageId}`;
					responseData = await discordApiRequest.call(this, 'PATCH', endpoint, {}, qs);

				} else if (operation === 'get') {

					// ----------------------------------------
					//               message: get
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#get-channel-message

					const channelId = this.getNodeParameter('channelId', i);
					const messageId = this.getNodeParameter('messageId', i);

					const endpoint = `/channels/${channelId}/messages/${messageId}`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//             message: getAll
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#get-channel-messages

					const channelId = this.getNodeParameter('channelId', i);

					const qs: IDataObject = {
						after: this.getNodeParameter('after', i),
						around: this.getNodeParameter('around', i),
						before: this.getNodeParameter('before', i),
					};

					const endpoint = `/channels/${channelId}/messages`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint, {}, qs);

				}

			} else if (resource === 'pinnedMessage') {

				// **********************************************************************
				//                             pinnedMessage
				// **********************************************************************

				if (operation === 'getAll') {

					// ----------------------------------------
					//          pinnedMessage: getAll
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#get-pinned-messages

					const channelId = this.getNodeParameter('channelId', i);

					const qs: IDataObject = {
					};

					const endpoint = `/channels/${channelId}/pins`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint, {}, qs);

				} else if (operation === 'create') {

					// ----------------------------------------
					//          pinnedMessage: create
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#add-pinned-channel-message

					const channelId = this.getNodeParameter('channelId', i);
					const messageId = this.getNodeParameter('messageId', i);

					const endpoint = `/channels/${channelId}/pins/${messageId}`;
					responseData = await discordApiRequest.call(this, 'PUT', endpoint);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//          pinnedMessage: delete
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/channel#delete-pinned-channel-message

					const channelId = this.getNodeParameter('channelId', i);
					const messageId = this.getNodeParameter('messageId', i);

					const endpoint = `/channels/${channelId}/pins/${messageId}`;
					responseData = await discordApiRequest.call(this, 'DELETE', endpoint);

				}

			} else if (resource === 'user') {

				// **********************************************************************
				//                                  user
				// **********************************************************************

				if (operation === 'getCurrentUser') {

					// ----------------------------------------
					//           user: getCurrentUser
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/user#get-current-user

					const endpoint = '/users/@me';
					responseData = await discordApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'getCurrentUserGuilds') {

					// ----------------------------------------
					//        user: getCurrentUserGuilds
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/user#get-current-user-guilds

					const endpoint = '/users/@me/guilds';
					responseData = await discordApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'get') {

					// ----------------------------------------
					//                user: get
					// ----------------------------------------

					// https://discord.com/developers/docs/resources/user#get-user

					const userId = this.getNodeParameter('userId', i);

					const endpoint = `/users/${userId}`;
					responseData = await discordApiRequest.call(this, 'GET', endpoint);

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
