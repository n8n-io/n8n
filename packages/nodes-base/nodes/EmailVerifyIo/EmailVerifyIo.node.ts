import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { emailVerifyIoApiRequest } from './GenericFunctions';

export class EmailVerifyIo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'EmailVerify.io',
		name: 'emailVerifyIo',
		icon: 'file:emailverify.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume EmailVerify.io API',
		defaults: {
			name: 'EmailVerify.io',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'emailVerifyIoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Verify Email',
						value: 'verifyEmail',
						description: 'Verify the validity of an email address',
						action: 'Verify the validity of an email address',
					},
					{
						name: 'Find Email',
						value: 'findEmail',
						description: 'Find an email address using a name and domain',
						action: 'Find an email address using a name and domain',
					},
					{
						name: 'Check Account Balance',
						value: 'checkBalance',
						description: 'Check your account balance and remaining credits',
						action: 'Check your account balance and remaining credits',
					},
				],
				default: 'verifyEmail',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				displayOptions: {
					show: {
						operation: ['verifyEmail'],
					},
				},
				default: '',
				required: true,
				description: 'The email address you want to verify',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				placeholder: 'John',
				displayOptions: {
					show: {
						operation: ['findEmail'],
					},
				},
				default: '',
				required: true,
				description: 'The name of the person you want to find the email for',
			},
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				placeholder: 'example.com',
				displayOptions: {
					show: {
						operation: ['findEmail'],
					},
				},
				default: '',
				required: true,
				description: 'The domain of the company or website',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		let responseData;

		for (let i = 0; i < length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);

				if (operation === 'verifyEmail') {
					const email = this.getNodeParameter('email', i) as string;
					const qs: IDataObject = {
						email,
					};

					responseData = await emailVerifyIoApiRequest.call(this, 'GET', '/validate', {}, qs);
				}

				if (operation === 'findEmail') {
					const name = this.getNodeParameter('name', i) as string;
					const domain = this.getNodeParameter('domain', i) as string;
					const qs: IDataObject = {
						name,
						domain,
					};

					responseData = await emailVerifyIoApiRequest.call(this, 'GET', '/finder', {}, qs);
				}

				if (operation === 'checkBalance') {
					responseData = await emailVerifyIoApiRequest.call(
						this,
						'GET',
						'/check-account-balance/',
						{},
					);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
