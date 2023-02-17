/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as message from './message/Message.resource';
import * as channel from './channel/Channel.resource';
import * as member from './member/Member.resource';
import * as webhook from './webhook/Webhook.resource';
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
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
		{
			name: 'discordWebhookApi',
			displayOptions: {
				show: {
					authentication: ['webhook'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
				{
					name: 'Webhook',
					value: 'webhook',
				},
			],
			default: 'oAuth2',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Webhook',
					value: 'webhook',
				},
			],
			default: 'webhook',
			displayOptions: {
				show: {
					authentication: ['webhook'],
				},
			},
		},
		{
			...guildRLC,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
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
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},

		...message.description,
		...channel.description,
		...member.description,
		...webhook.description,
	],
};
