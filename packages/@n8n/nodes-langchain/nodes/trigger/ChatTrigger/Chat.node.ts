/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { BaseChatMemory } from '@langchain/classic/memory';
import {
	limitWaitTimeOption,
	sendAndWaitWebhooksDescription,
} from 'n8n-nodes-base/dist/utils/sendAndWait/descriptions';
import {
	SEND_AND_WAIT_WAITING_TOOLTIP,
	sendAndWaitWebhook,
} from 'n8n-nodes-base/dist/utils/sendAndWait/utils';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_WAIT_USER_REPLY,
	FREE_TEXT_CHAT_RESPONSE_TYPE,
	NodeConnectionTypes,
	NodeOperationError,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	NodeTypeAndVersion,
	INode,
} from 'n8n-workflow';

import {
	configureInputs,
	configureWaitTillDate,
	getChatMessage,
	getSendAndWaitPropertiesForChatNode,
} from './util';

export class Chat implements INodeType {
	description: INodeTypeDescription = {
		usableAsTool: true,
		displayName: 'Chat',
		name: 'chat',
		icon: 'fa:comments',
		iconColor: 'black',
		group: ['input'],
		version: [1, 1.1],
		defaultVersion: 1.1,
		description: 'Send a message into the chat',
		defaults: {
			name: 'Chat',
		},
		codex: {
			categories: ['Core Nodes', 'HITL'],
			subcategories: {
				HITL: ['Human in the Loop'],
			},
			alias: ['human', 'wait', 'hitl'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.respondtochat/',
					},
				],
			},
		},
		inputs: `={{ (${configureInputs})($parameter) }}`,
		outputs: [NodeConnectionTypes.Main],
		waitingNodeTooltip: SEND_AND_WAIT_WAITING_TOOLTIP,
		webhooks: sendAndWaitWebhooksDescription,
		properties: [
			{
				displayName:
					"Verify you're using a chat trigger with the 'Response Mode' option set to 'Using Response Nodes'",
				name: 'generalNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: 'send',
				noDataExpression: true,
				options: [
					{
						name: 'Send Message',
						value: 'send',
						action: 'Send a message',
					},
					{
						name: 'Send and Wait for Response',
						value: SEND_AND_WAIT_OPERATION,
						action: 'Send message and wait for response',
					},
				],
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Wait for User Reply',
				name: CHAT_WAIT_USER_REPLY,
				type: 'boolean',
				default: true,
				noDataExpression: true,
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lt: 1.1 } }],
					},
				},
			},
			...getSendAndWaitPropertiesForChatNode(),
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					hide: {
						'@tool': [true],
					},
				},
				options: [
					{
						displayName: 'Add Memory Input Connection',
						name: 'memoryConnection',
						type: 'boolean',
						default: false,
						displayOptions: {
							hide: {
								'/responseType': ['approval'],
							},
						},
					},
					{
						...limitWaitTimeOption,
						displayOptions: {
							show: {
								[`/${CHAT_WAIT_USER_REPLY}`]: [true],
							},
						},
					},
					{
						...limitWaitTimeOption,
						displayOptions: {
							show: {
								'/operation': [SEND_AND_WAIT_OPERATION],
							},
						},
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [limitWaitTimeOption],
				displayOptions: {
					show: {
						'@tool': [true],
						[`/${CHAT_WAIT_USER_REPLY}`]: [true],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [limitWaitTimeOption],
				displayOptions: {
					show: {
						'@tool': [true],
						'/operation': [SEND_AND_WAIT_OPERATION],
					},
				},
			},
		],
	};

	webhook = sendAndWaitWebhook;

	async onMessage(
		context: IExecuteFunctions,
		data: INodeExecutionData,
	): Promise<INodeExecutionData[][]> {
		const options = context.getNodeParameter('options', 0, {}) as {
			memoryConnection?: boolean;
		};

		const nodeVersion = context.getNode().typeVersion;
		let waitForReply;
		if (nodeVersion >= 1.1) {
			const operation = context.getNodeParameter('operation', 0, 'sendMessage');
			waitForReply = operation === SEND_AND_WAIT_OPERATION;
		} else {
			waitForReply = context.getNodeParameter(CHAT_WAIT_USER_REPLY, 0, true) as boolean;
		}

		if (!waitForReply) {
			const inputData = context.getInputData();
			return [inputData];
		}

		if (options.memoryConnection) {
			const memory = (await context.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
				| BaseChatMemory
				| undefined;

			const message = data.json?.chatInput;

			if (memory && message) {
				await memory.chatHistory.addUserMessage(message as string);
			}
		}

		if (nodeVersion < 1.1) {
			return [[data]];
		}

		const responseType = context.getNodeParameter(
			'responseType',
			0,
			FREE_TEXT_CHAT_RESPONSE_TYPE,
		) as string;
		const isFreeText = responseType === FREE_TEXT_CHAT_RESPONSE_TYPE;
		return [
			[
				{
					...data,
					json: {
						// put everything under the `data` key to be consistent
						// with other HITL nodes
						data: {
							...data.json,
							// if the response type is not "Free Text" and the
							// user has typed something - we assume it's
							// disapproval
							approved: isFreeText ? undefined : false,
						},
					},
				},
			],
		];
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const connectedNodes = this.getParentNodes(this.getNode().name, {
			includeNodeParameters: true,
		});

		let chatTrigger: INode | NodeTypeAndVersion | undefined | null = connectedNodes.find(
			(node) => node.type === CHAT_TRIGGER_NODE_TYPE && !node.disabled,
		);

		if (!chatTrigger) {
			try {
				// try to get chat trigger from workflow if node working as a tool
				chatTrigger = this.getChatTrigger();
			} catch (error) {}
		}

		if (!chatTrigger) {
			throw new NodeOperationError(
				this.getNode(),
				'Workflow must be started from a chat trigger node',
			);
		}

		const parameters = chatTrigger.parameters as {
			mode?: 'hostedChat' | 'webhook';
			options: { responseMode: 'lastNode' | 'responseNodes' | 'streaming' | 'responseNode' };
		};

		if (parameters.mode === 'webhook') {
			throw new NodeOperationError(
				this.getNode(),
				'"Embedded chat" is not supported, change the "Mode" in the chat trigger node to the "Hosted Chat"',
			);
		}

		if (parameters.options.responseMode !== 'responseNodes') {
			throw new NodeOperationError(
				this.getNode(),
				'"Response Mode" in the chat trigger node must be set to "Respond Nodes"',
			);
		}

		const message = getChatMessage(this);
		const options = this.getNodeParameter('options', 0, {}) as {
			memoryConnection?: boolean;
		};

		if (options.memoryConnection) {
			const memory = (await this.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
				| BaseChatMemory
				| undefined;

			if (memory) {
				const text = typeof message === 'string' ? message : message.text;
				await memory.chatHistory.addAIMessage(text);
			}
		}

		const waitTill = configureWaitTillDate(this);

		await this.putExecutionToWait(waitTill);
		return [[{ json: {}, sendMessage: message }]];
	}
}
