/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as channel from './channel';
import * as member from './member';
import * as message from './message';
import * as webhook from './webhook';
import { sendAndWaitWebhooksDescription } from '../../../../utils/sendAndWait/descriptions';
import { SEND_AND_WAIT_WAITING_TOOLTIP } from '../../../../utils/sendAndWait/utils';

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
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	waitingNodeTooltip: SEND_AND_WAIT_WAITING_TOOLTIP,
	webhooks: sendAndWaitWebhooksDescription,
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
			displayName: 'Connection Type',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Bot Token',
					value: 'botToken',
					description: 'Manage messages, channels, and members on a server',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
					description: "Same features as 'Bot Token' with easier Bot installation",
				},
				{
					name: 'Webhook',
					value: 'webhook',
					description: 'Send messages to a specific channel',
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
			],
			default: 'channel',
			displayOptions: {
				hide: {
					authentication: ['webhook'],
				},
			},
		},

		...message.description,
		...channel.description,
		...member.description,
		...webhook.description,
	],
};
