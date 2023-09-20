/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeDescription } from 'n8n-workflow';

import * as message from './message';
import * as channel from './channel';
import * as member from './member';
import * as webhook from './webhook';
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
			name: 'discordBotApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['botToken'],
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
					name: 'Bot Token',
					value: 'botToken',
				},
				{
					name: 'Webhook',
					value: 'webhook',
				},
			],
			default: 'botToken',
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
				{
					name: 'Webhook',
					value: 'webhook',
				},
			],
			default: 'channel',
		},
		{
			...guildRLC,
			displayOptions: {
				show: {
					authentication: ['botToken'],
				},
				hide: {
					resource: ['webhook'],
				},
			},
		},
		{
			displayName: 'You need to use Webhook credentials to access this resource',
			name: 'webhookAuthRequired',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					authentication: ['botToken'],
					resource: ['webhook'],
				},
			},
		},
		...message.description,
		...channel.description,
		...member.description,
		...webhook.description,
	],
};
