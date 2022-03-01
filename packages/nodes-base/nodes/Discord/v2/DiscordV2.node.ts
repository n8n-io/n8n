import {
	IExecuteFunctions
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';
import { INodeExecutionData } from 'n8n-workflow';
import { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';
import { DiscordWebhook } from './Interfaces';

export class DiscordV2 implements INodeType {
	description: INodeTypeDescription;
	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			displayName: 'Discord',
			name: 'discord',
			icon: 'file:discord.svg',
			group: ['output'],
			version: 2,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Discord API',
			defaults: {
				name: 'Discord',
				color: '#000000',
			},
			inputs: ['main'],
			outputs: ['main'],
			properties:[
				{
					displayName: 'Webhook URL',
					name: 'webhookUri',
					type: 'string',
					typeOptions: {
						alwaysOpenEditWindow: true,
					},
					required: true,
					default: '',
					placeholder: 'https://discord.com/api/webhooks/ID/TOKEN',
				},
				{
					displayName: 'Content',
					name: 'content',
					type: 'string',
					typeOptions: {
						maxValue: 2000,
						alwaysOpenEditWindow: true,
					},
					default: '',
					required: false,
					placeholder: 'You are a pirate.',
				},
				{
					displayName: 'Username',
					name: 'username',
					type: 'string',
					default: '',
					required: false,
					placeholder: 'Captain Hook',
				},
				{
					displayName: 'Avatar URL',
					name: 'avatarUrl',
					type: 'string',
					default: '',
					required: false,
				},
				{
					displayName: 'TTS',
					name: 'tts',
					type: 'boolean',
					default: false,
					required: false,
					description: 'Should this message be sent as a Text To Speech message?',
				},
				{
					displayName: 'Embeds',
					name: 'embeds',
					type: 'json',
					typeOptions: { alwaysOpenEditWindow: true, editor: 'code' },
					default: '',
					required: false,
				},
				{
					displayName: 'Allowed Mentions',
					name: 'allowedMentions',
					type: 'json',
					typeOptions: { alwaysOpenEditWindow: true, editor: 'code' },
					default: '',
				},
			],
		};


	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const nodeInput = this.getInputData()[0].json as any,
			returnData: IDataObject[] = [];

		const body: DiscordWebhook = {};

		const webhookUri = this.getNodeParameter('webhookUri', 0, '') as string;

		if (!webhookUri) throw Error('Webhook uri is required.');

		body.content =
			nodeInput['content'] ||
			(this.getNodeParameter('content', 0, '') as string);
		body.username =
			nodeInput['username'] ||
			(this.getNodeParameter('username', 0, '') as string);
		body.avatar_url =
			nodeInput['avatarUrl'] ||
			(this.getNodeParameter('avatarUrl', 0, '') as string);
		body.tts =
			nodeInput['tts'] || (this.getNodeParameter('tts', 0, false) as boolean);
		body.embeds =
			nodeInput['embeds'] || (this.getNodeParameter('embeds', 0, '') as any);
		body.allowed_mentions =
			nodeInput['allowedMentions'] ||
			(this.getNodeParameter('allowedMentions', 0, '') as any);

		if (!body.content && !body.embeds) {
			throw new Error('Either content or embeds must be set.');
		}

		if (body.embeds) {
			try {
				//@ts-expect-error
				body.embeds = JSON.parse(body.embeds);
				if (!Array.isArray(body.embeds)) {
					throw new Error('Embeds must be an array of embeds.');
				}
			} catch (e) {
				throw new Error('Embeds must be valid JSON.');
			}
		}

		//* Not used props, delete them from the payload as Discord won't need them :^
		if (!body.content) delete body.content;
		if (!body.username) delete body.username;
		if (!body.avatar_url) delete body.avatar_url;
		if (!body.embeds) delete body.embeds;
		if (!body.allowed_mentions) delete body.allowed_mentions;

		const options = {
			method: 'POST',
			body,
			uri: webhookUri,
			headers: {
				'content-type': 'application/json; charset=utf-8',
			},
			json: true,
		};

		let maxTries = 5;
		do {
			try {
				await this.helpers.request(options);
				break;
			} catch (error) {
				if (error.statusCode === 429) {
					//* Await ratelimit to be over
					await new Promise<void>((resolve) =>
						setTimeout(resolve, error.response.body.retry_after || 150),
					);

					continue;
				}

				//* Different Discord error, throw it
				throw error;
			}
		} while (--maxTries);

		if (maxTries <= 0) {
			throw new Error(
				'Could not send Webhook message. Max. amount of rate-limit retries reached.',
			);
		}

		returnData.push({ success: true });

		return [this.helpers.returnJsonArray(returnData)];
	}
}
