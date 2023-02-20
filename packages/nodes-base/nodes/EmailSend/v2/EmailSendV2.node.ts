/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { IExecuteFunctions } from 'n8n-core';

import type {
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as send from './send.operation';

// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
const versionDescription: INodeTypeDescription = {
	displayName: 'Send Email',
	name: 'emailSend',
	icon: 'fa:envelope',
	group: ['output'],
	version: 2,
	description: 'Sends an email using SMTP protocol',
	defaults: {
		name: 'Send Email',
		color: '#00bb88',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'smtp',
			required: true,
		},
	],
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
			type: 'hidden',
			noDataExpression: true,
			default: 'send',
			options: [
				{
					name: 'Send',
					value: 'send',
					action: 'Send an Email',
				},
			],
		},
		...send.description,
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnData: INodeExecutionData[][] = [];

		returnData = await send.execute.call(this);

		return returnData;
	}
}
