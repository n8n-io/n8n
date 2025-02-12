import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import * as send from './send.operation';
import * as sendAndWait from './sendAndWait.operation';
import * as sendToInstanceUser from './sendToInstanceUser.operation';
import { smtpConnectionTest } from './utils';
import { sendAndWaitWebhooksDescription } from '../../../utils/sendAndWait/descriptions';
import { sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';

const OPERATION_SEND_TO_INSTANCE_USER = 'sendToInstanceUser';

export const versionDescription: INodeTypeDescription = {
	displayName: 'Send Email',
	name: 'emailSend',
	icon: 'fa:envelope',
	group: ['output'],
	version: [2, 2.1],
	description: 'Sends an email using SMTP protocol',
	defaults: {
		name: 'Send Email',
		color: '#00bb88',
	},
	inputs: [NodeConnectionType.Main],
	outputs: [NodeConnectionType.Main],
	usableAsTool: true,
	credentials: [
		{
			name: 'smtp',
			required: true,
			testedBy: 'smtpConnectionTest',
		},
	],
	webhooks: sendAndWaitWebhooksDescription,
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'hidden',
			noDataExpression: true,
			default: 'email',
			options: [
				{
					name: 'Email',
					value: 'email',
				},
			],
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			default: 'send',
			options: [
				{
					name: 'Send',
					value: 'send',
					action: 'Send an Email',
				},
				{
					name: 'Send and Wait for Response',
					value: SEND_AND_WAIT_OPERATION,
					action: 'Send message and wait for response',
				},
				{
					name: 'Send an Email to Instance User',
					value: OPERATION_SEND_TO_INSTANCE_USER,
					action: 'Send an Email to Instance User',
				},
			],
		},
		...send.description,
		...sendAndWait.description,
		...sendToInstanceUser.description,
	],
};

export class EmailSendV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	methods = {
		credentialTest: { smtpConnectionTest },
		loadOptions: {
			// TODO: Retrieve users properly
			async getUsers(this: ILoadOptionsFunctions) {
				return [
					{
						name: 'Marc Littlemore',
						value: 'marc@n8n.io',
						description: 'marc@n8n.io' /* eslint-disable-line */,
					},
					{
						name: 'Tuukka Kantola',
						value: 'tuukka@n8n.io',
						description: 'tuukka@n8n.io' /* eslint-disable-line */,
					},
					{
						name: 'Jonathan Bennetts',
						value: 'jonathan@n8n.io',
						description: 'jonathan@n8n.io' /* eslint-disable-line */,
					},
				];
			},

			// TODO: Get server status from somewhere
			async getSmtpServerStatus(this: ILoadOptionsFunctions) {
				return [
					{
						name: 'ServerDisabled',
						value: false,
						description: 'SMTP server is not enabled',
					},
					{
						name: 'ServerEnabled',
						value: true,
						description: 'SMTP server is enabled',
					},
				];
			},
		},
	};

	webhook = sendAndWaitWebhook;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData[][] = [];
		const operation = this.getNodeParameter('operation', 0);

		if (operation === SEND_AND_WAIT_OPERATION) {
			returnData = await sendAndWait.execute.call(this);
		}

		if (operation === 'send') {
			returnData = await send.execute.call(this);
		}

		if (operation === OPERATION_SEND_TO_INSTANCE_USER) {
			returnData = await sendToInstanceUser.execute.call(this);
		}

		return returnData;
	}
}
