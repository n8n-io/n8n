import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { awsApiRequestREST } from './GenericFunctions';

export class AwsSecretsManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Secrets Manager',
		name: 'awsSecretsManager',
		icon: 'file:secrets-manager.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume AWS Secrets Manager API',
		defaults: {
			name: 'AWS Secrets Manager',
			color: '#ea3e40'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true
			}
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Get Secret Value',
						value: 'getSecretValue'
					}
				],
				default: 'getSecretValue',
				description: 'The operation to perform.'
			},
			{
				displayName: 'Secret ID',
				name: 'SecretId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getSecretValue']
					}
				},
				description:
					'Specifies the secret containing the version that you want to retrieve. You can specify either the Amazon Resource Name (ARN) or the friendly name of the secret.'
			},
			{
				displayName: 'Version ID',
				name: 'VersionId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['getSecretValue']
					}
				},
				description:
					"Specifies the unique identifier of the version of the secret that you want to retrieve. If you specify both this parameter and VersionStage, the two parameters must refer to the same secret version. If you don't specify either a VersionStage or VersionId then the default is to perform the operation on the version with the VersionStage value of AWSCURRENT."
			},
			{
				displayName: 'Version Stage',
				name: 'VersionStage',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						operation: ['getSecretValue']
					}
				},
				description:
					"Specifies the secret version that you want to retrieve by the staging label attached to the version. Staging labels are used to keep track of different versions during the rotation process. If you specify both this parameter and VersionId, the two parameters must refer to the same secret version . If you don't specify either a VersionStage or VersionId, then the default is to perform the operation on the version with the VersionStage value of AWSCURRENT."
			},
			{
				displayName: 'Decode JSON String',
				name: 'decode',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: ['getSecretValue']
					}
				},
				description:
					"Option to decode the JSON String recieved from the API. Result is added to the Workflow data."
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const qs: IDataObject = {};
		let responseData;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'getSecretValue') {

					let action = 'secretsmanager.GetSecretValue';

					const body: IDataObject = {};
                    const SecretId = this.getNodeParameter('SecretId', i) as string;
                    const VersionId = this.getNodeParameter('VersionId', i) as string;
                    const VersionStage = this.getNodeParameter('VersionStage', i) as string;
                    body.SecretId = SecretId
                    if(VersionId){
                        body.VersionId = VersionId
                    }
                    if(VersionStage){
                        body.VersionStage = VersionStage
                    }

					responseData = await awsApiRequestREST.call(
						this,
						'secretsmanager',
						'POST',
						'',
						JSON.stringify(body),
						{
							'X-Amz-Target': action,
                            'Accept-Encoding': 'identity',
							'Content-Type': 'application/x-amz-json-1.1'
						}
					);

					const decode = this.getNodeParameter('decode', i) as boolean;

					if(decode){
						responseData.SecretString = JSON.parse(responseData.SecretString);
					}
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData);
				}
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
