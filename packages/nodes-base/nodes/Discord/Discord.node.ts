import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	jsonParse,
	NodeApiError,
	NodeOperationError,
	sleep,
} from 'n8n-workflow';

import { DiscordAttachment, DiscordWebhook } from './Interfaces';
export class Discord implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discord',
		name: 'discord',
		icon: 'file:discord.svg',
		group: ['output'],
		version: 1,
		description: 'Sends data to Discord',
		defaults: {
			name: 'Discord',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
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
				name: 'text',
				type: 'string',
				typeOptions: {
					maxValue: 2000,
					alwaysOpenEditWindow: true,
				},
				default: '',
				placeholder: 'Hello World!',
			},
			{
				displayName: 'Additional Fields',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Allowed Mentions',
						name: 'allowedMentions',
						type: 'json',
						typeOptions: { alwaysOpenEditWindow: true, editor: 'code' },
						default: '',
					},
					{
						displayName: 'Attachments',
						name: 'attachments',
						type: 'json',
						typeOptions: { alwaysOpenEditWindow: true, editor: 'code' },
						default: '',
					},
					{
						displayName: 'Avatar URL',
						name: 'avatarUrl',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Components',
						name: 'components',
						type: 'json',
						typeOptions: { alwaysOpenEditWindow: true, editor: 'code' },
						default: '',
					},
					{
						displayName: 'Embeds',
						name: 'embeds',
						type: 'json',
						typeOptions: { alwaysOpenEditWindow: true, editor: 'code' },
						default: '',
					},
					{
						displayName: 'Flags',
						name: 'flags',
						type: 'number',
						default: '',
					},
					{
						displayName: 'JSON Payload',
						name: 'payloadJson',
						type: 'json',
						typeOptions: { alwaysOpenEditWindow: true, editor: 'code' },
						default: '',
					},
					{
						displayName: 'Username',
						name: 'username',
						type: 'string',
						default: '',
						placeholder: 'User',
					},
					{
						displayName: 'TTS',
						name: 'tts',
						type: 'boolean',
						default: false,
						description: 'Whether this message be sent as a Text To Speech message',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];

		const webhookUri = this.getNodeParameter('webhookUri', 0, '') as string;

		if (!webhookUri) throw new NodeOperationError(this.getNode(), 'Webhook uri is required.');

		const items = this.getInputData();
		const length = items.length;
		for (let i = 0; i < length; i++) {
			const body: DiscordWebhook = {};

			const iterationWebhookUri = this.getNodeParameter('webhookUri', i) as string;
			body.content = this.getNodeParameter('text', i) as string;
			const options = this.getNodeParameter('options', i);

			if (!body.content && !options.embeds) {
				throw new NodeOperationError(this.getNode(), 'Either content or embeds must be set.', {
					itemIndex: i,
				});
			}
			if (options.embeds) {
				try {
					//@ts-expect-error
					body.embeds = JSON.parse(options.embeds);
					if (!Array.isArray(body.embeds)) {
						throw new NodeOperationError(this.getNode(), 'Embeds must be an array of embeds.', {
							itemIndex: i,
						});
					}
				} catch (e) {
					throw new NodeOperationError(this.getNode(), 'Embeds must be valid JSON.', {
						itemIndex: i,
					});
				}
			}
			if (options.username) {
				body.username = options.username as string;
			}

			if (options.components) {
				try {
					//@ts-expect-error
					body.components = JSON.parse(options.components);
				} catch (e) {
					throw new NodeOperationError(this.getNode(), 'Components must be valid JSON.', {
						itemIndex: i,
					});
				}
			}

			if (options.allowed_mentions) {
				//@ts-expect-error
				body.allowed_mentions = jsonParse(options.allowed_mentions);
			}

			if (options.avatarUrl) {
				body.avatar_url = options.avatarUrl as string;
			}

			if (options.flags) {
				body.flags = options.flags as number;
			}

			if (options.tts) {
				body.tts = options.tts as boolean;
			}

			if (options.payloadJson) {
				//@ts-expect-error
				body.payload_json = jsonParse(options.payloadJson);
			}

			if (options.attachments) {
				//@ts-expect-error
				body.attachments = jsonParse(options.attachments as DiscordAttachment[]);
			}

			//* Not used props, delete them from the payload as Discord won't need them :^
			if (!body.content) delete body.content;
			if (!body.username) delete body.username;
			if (!body.avatar_url) delete body.avatar_url;
			if (!body.embeds) delete body.embeds;
			if (!body.allowed_mentions) delete body.allowed_mentions;
			if (!body.flags) delete body.flags;
			if (!body.components) delete body.components;
			if (!body.payload_json) delete body.payload_json;
			if (!body.attachments) delete body.attachments;

			let requestOptions;

			if (!body.payload_json) {
				requestOptions = {
					resolveWithFullResponse: true,
					method: 'POST',
					body,
					uri: iterationWebhookUri,
					headers: {
						'content-type': 'application/json; charset=utf-8',
					},
					json: true,
				};
			} else {
				requestOptions = {
					resolveWithFullResponse: true,
					method: 'POST',
					body,
					uri: iterationWebhookUri,
					headers: {
						'content-type': 'multipart/form-data; charset=utf-8',
					},
				};
			}
			let maxTries = 5;
			let response;

			do {
				try {
					response = await this.helpers.request(requestOptions);
					const resetAfter = response.headers['x-ratelimit-reset-after'] * 1000;
					const remainingRatelimit = response.headers['x-ratelimit-remaining'];

					// remaining requests 0
					// https://discord.com/developers/docs/topics/rate-limits
					if (!+remainingRatelimit) {
						await sleep(resetAfter ?? 1000);
					}

					break;
				} catch (error) {
					// HTTP/1.1 429 TOO MANY REQUESTS
					// Await when the current rate limit will reset
					// https://discord.com/developers/docs/topics/rate-limits
					if (error.statusCode === 429) {
						const retryAfter = error.response?.headers['retry-after'] || 1000;

						await sleep(+retryAfter);

						continue;
					}

					throw error;
				}
			} while (--maxTries);

			if (maxTries <= 0) {
				throw new NodeApiError(this.getNode(), {
					error: 'Could not send Webhook message. Max amount of rate-limit retries reached.',
				});
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ success: true }),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
