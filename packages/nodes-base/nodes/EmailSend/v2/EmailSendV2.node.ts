import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, SEND_AND_WAIT_OPERATION } from 'n8n-workflow';

import * as send from './send.operation';
import * as sendAndWait from './sendAndWait.operation';
import { smtpConnectionTest } from './utils';
import { sendAndWaitWebhooksDescription } from '../../../utils/sendAndWait/descriptions';
import { sendAndWaitWebhook } from '../../../utils/sendAndWait/utils';

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
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
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
			],
		},
		...send.description,
		...sendAndWait.description,
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

		return returnData;
	}
}
