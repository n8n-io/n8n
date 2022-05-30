import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { appwriteApiRequest } from './GenericFunctions';

import {
	OptionsWithUri,
} from 'request';

import ewelink from 'ewelink-api';

import { documentFields, documentOperations } from './DocumentDescription';

export class Ewelink implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Ewelink',
			name: 'ewelink',
			icon: 'file:Ewelink.svg',
			group: ['transform'],
			version: 1,
			subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
			description: 'Consume Ewelink API',
			defaults: {
					name: 'Ewelink',
					color: '#1A82e2',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'ewelinkApi',
					required: false,
					testedBy: 'ewelinkApiTest',
			},
			],
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					noDataExpression: true,
					type: 'options',
					options: [
							{
									name: 'Document',
									value: 'document',
							},
					],
					default: 'document',
					required: true,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-weak
					description: 'Resource to consume',
			},
			...documentOperations,
			...documentFields,
		],
	};

	// methods = {
	// 	credentialTest: {
	// 		async ewelinkApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
	// 			const credentials = await credential.data as IDataObject;
	// 			let options = {} as OptionsWithUri;

	// 			options = {
	// 				// headers: {
	// 				// 	'Accept': 'application/json',
	// 				// 	'X-Appwrite-Project': `${credentials.projectId}`,
	// 				// 	'X-Appwrite-Key': `${credentials.apiKey}`,
	// 				// },
	// 				method: 'GET',
	// 				uri: `${credentials.url}/v1/health`,
	// 				json: true,
	// 			};
	// 			try {
	// 				await this.helpers.request(options);
	// 				return {
	// 					status: 'OK',
	// 					message: 'Authentication successful',
	// 				};
	// 			} catch (error) {
	// 				return {
	// 					status: 'Error',
	// 					message: `Auth settings are not valid: ${error}`,
	// 				};
	// 			}
	// 		},
	// 	},
	// };
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];

		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		try {
			if (resource === 'document') {

				if (operation === 'createDoc') {

					const connection = new ewelink({
						email: 'saadmujeeb123@gmail.com',
						password: 'Saad123!@#',
						// region: 'as',
					});

					const devices = await connection.getDevices();
					const responseData: IDataObject = {
						data: devices,
					};

					returnData.push(responseData);
				}
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ error: error.message });
			} else {
				throw error;
			}
		}

		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
}

}
