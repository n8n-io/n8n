/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as message from './message/Message.resource';
import * as channel from './channel/Channel.resource';
import * as member from './member/Member.resource';
import { guildRLC } from './common.description';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Discord',
	name: 'discord',
	icon: 'file:discord.svg',
	group: ['output'],
	version: 2,
	subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
	description: 'Sends data to Discord',
	defaults: {
		name: 'Discord',
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
		guildRLC,
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Channel',
					value: 'channel',
				},
				{
					name: 'Message',
					value: 'message',
				},
				{
					name: 'Member',
					value: 'member',
				},
			],
			default: 'channel',
		},
		...message.description,
		...channel.description,
		...member.description,
	],
};
