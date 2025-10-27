/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { attributeFields, attributeOperations } from './AttributeDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { emailFields, emailOperations } from './EmailDescription';
import { senderFields, senderOperations } from './SenderDescrition';

export class Brevo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Brevo',
		// keep sendinblue name for backward compatibility
		name: 'sendInBlue',
		icon: 'file:brevo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Brevo API',
		defaults: {
			name: 'Brevo',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'sendInBlueApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.brevo.com',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Contact Attribute',
						value: 'attribute',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Sender',
						value: 'sender',
					},
				],
				default: 'email',
			},

			...attributeOperations,
			...attributeFields,
			...senderOperations,
			...senderFields,
			...contactOperations,
			...contactFields,
			...emailOperations,
			...emailFields,
		],
	};
}
