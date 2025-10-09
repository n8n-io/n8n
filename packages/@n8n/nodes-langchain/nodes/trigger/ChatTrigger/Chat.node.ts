/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { BaseChatMemory } from 'langchain/memory';
import {
	CHAT_TRIGGER_NODE_TYPE,
	CHAT_WAIT_USER_REPLY,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeTypeDescription,
	INodeType,
	INodeProperties,
} from 'n8n-workflow';

import { configureInputs, configureWaitTillDate } from './util';

const limitWaitTimeProperties: INodeProperties[] = [
	{
		displayName: 'Limit Type',
		name: 'limitType',
		type: 'options',
		default: 'afterTimeInterval',
		description:
			'Sets the condition for the execution to resume. Can be a specified date or after some time.',
		options: [
			{
				name: 'After Time Interval',
				description: 'Waits for a certain amount of time',
				value: 'afterTimeInterval',
			},
			{
				name: 'At Specified Time',
				description: 'Waits until the set date and time to continue',
				value: 'atSpecifiedTime',
			},
		],
	},
	{
		displayName: 'Amount',
		name: 'resumeAmount',
		type: 'number',
		displayOptions: {
			show: {
				limitType: ['afterTimeInterval'],
			},
		},
		typeOptions: {
			minValue: 0,
			numberPrecision: 2,
		},
		default: 1,
		description: 'The time to wait',
	},
	{
		displayName: 'Unit',
		name: 'resumeUnit',
		type: 'options',
		displayOptions: {
			show: {
				limitType: ['afterTimeInterval'],
			},
		},
		options: [
			{
				name: 'Minutes',
				value: 'minutes',
			},
			{
				name: 'Hours',
				value: 'hours',
			},
			{
				name: 'Days',
				value: 'days',
			},
		],
		default: 'hours',
		description: 'Unit of the interval value',
	},
	{
		displayName: 'Max Date and Time',
		name: 'maxDateAndTime',
		type: 'dateTime',
		displayOptions: {
			show: {
				limitType: ['atSpecifiedTime'],
			},
		},
		default: '',
		description: 'Continue execution after the specified date and time',
	},
];

const limitWaitTimeOption: INodeProperties = {
	displayName: 'Limit Wait Time',
	name: 'limitWaitTime',
	type: 'fixedCollection',
	description:
		'Whether to limit the time this node should wait for a user response before execution resumes',
	default: { values: { limitType: 'afterTimeInterval', resumeAmount: 45, resumeUnit: 'minutes' } },
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: limitWaitTimeProperties,
		},
	],
	displayOptions: {
		show: {
			[`/${CHAT_WAIT_USER_REPLY}`]: [true],
		},
	},
};

export class Chat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Chat',
		name: 'chat',
		icon: 'fa:comments',
		iconColor: 'black',
		group: ['input'],
		version: 1,
		description: 'Send a message to a chat',
		defaults: {
			name: 'Respond to Chat',
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
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chat/',
					},
				],
			},
		},
		inputs: `={{ (${configureInputs})($parameter) }}`,
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					"Verify you're using a chat trigger with the 'Response Mode' option set to 'Using Response Nodes'",
				name: 'generalNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				typeOptions: {
					rows: 6,
				},
			},
			{
				displayName: 'Wait for User Reply',
				name: CHAT_WAIT_USER_REPLY,
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Add Memory Input Connection',
						name: 'memoryConnection',
						type: 'boolean',
						default: false,
					},
					limitWaitTimeOption,
				],
			},
		],
	};

	async onMessage(
		context: IExecuteFunctions,
		data: INodeExecutionData,
	): Promise<INodeExecutionData[][]> {
		const options = context.getNodeParameter('options', 0, {}) as {
			memoryConnection?: boolean;
		};

		const waitForReply = context.getNodeParameter(CHAT_WAIT_USER_REPLY, 0, true) as boolean;

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

		return [[data]];
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const connectedNodes = this.getParentNodes(this.getNode().name, {
			includeNodeParameters: true,
		});

		const chatTrigger = connectedNodes.find(
			(node) => node.type === CHAT_TRIGGER_NODE_TYPE && !node.disabled,
		);

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
				'"Embeded chat" is not supported, change the "Mode" in the chat trigger node to the "Hosted Chat"',
			);
		}

		if (parameters.options.responseMode !== 'responseNodes') {
			throw new NodeOperationError(
				this.getNode(),
				'"Response Mode" in the chat trigger node must be set to "Respond Nodes"',
			);
		}

		const message = (this.getNodeParameter('message', 0) as string) ?? '';
		const options = this.getNodeParameter('options', 0, {}) as {
			memoryConnection?: boolean;
		};

		if (options.memoryConnection) {
			const memory = (await this.getInputConnectionData(NodeConnectionTypes.AiMemory, 0)) as
				| BaseChatMemory
				| undefined;

			if (memory) {
				await memory.chatHistory.addAIChatMessage(message);
			}
		}

		const waitTill = configureWaitTillDate(this);

		await this.putExecutionToWait(waitTill);
		return [[{ json: {}, sendMessage: message }]];
	}
}
