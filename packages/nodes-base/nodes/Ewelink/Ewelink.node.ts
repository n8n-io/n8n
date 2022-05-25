import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	NodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { appwriteApiRequest } from './GenericFunctions';

import {
	OptionsWithUri,
} from 'request';

import { documentFields, documentOperations } from './DocumentDescription';

export class Appwrite implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Appwrite',
			name: 'appwrite',
			icon: 'file:Appwrite.svg',
			group: ['transform'],
			version: 1,
			subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
			description: 'Consume Appwrite API',
			defaults: {
					name: 'Appwrite',
					color: '#1A82e2',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'appwriteApi',
					required: false,
					testedBy: 'appwriteApiTest',
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
									name: 'Documents',
									value: 'document',
							},
					],
					default: 'document',
					required: true,
					description: 'Resource to consume',
			},
			...documentOperations,
			...documentFields,
		],
	};

	methods = {
		credentialTest: {
			async appwriteApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<NodeCredentialTestResult> {
				const credentials = await credential.data as IDataObject;
				let options = {} as OptionsWithUri;

				options = {
					headers: {
						'Accept': 'application/json',
						'X-Appwrite-Project': `${credentials.projectId}`,
						'X-Appwrite-Key': `${credentials.apiKey}`,
					},
					method: 'GET',
					uri: `${credentials.url}/v1/health`,
					json: true,
				};
				try {
					await this.helpers.request(options);
					return {
						status: 'OK',
						message: 'Authentication successful',
					};
				} catch (error) {
					return {
						status: 'Error',
						message: `Auth settings are not valid: ${error}`,
					};
				}
			},
		},
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];

		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		try {
			if (resource === 'document') {

				if (operation === 'createDoc') {

					// get collectionID input
					const collectionId = this.getNodeParameter('collectionId', 0) as string;

					const body: IDataObject = {
						documentId: 'unique()',
						data: this.getNodeParameter('body', 0) as IDataObject,
					};

					responseData = await appwriteApiRequest.call(this, 'POST', collectionId, '', body);
					returnData.push(responseData);
				}

				if (operation === 'getAllDocs') {

					// get collectionID input
					const collectionId = this.getNodeParameter('collectionId', 0) as string;
					// get additional fields input
					const optionalFields = this.getNodeParameter('options', 0) as IDataObject;
					const qs: IDataObject = {};

					if (optionalFields.limit) {
							qs.limit = optionalFields.limit;
					}
					if (optionalFields.offset) {
							qs.offset = optionalFields.offset;
					}
					if (optionalFields.cursor) {
							qs.cursor = optionalFields.cursor;
					}
					if (optionalFields.cursorDirection) {
							qs.cursorDirection = optionalFields.cursorDirection;
					}

					responseData = await appwriteApiRequest.call(this, 'GET', collectionId, '', {}, qs);
					returnData.push(responseData);
				}

				if (operation === 'getDoc') {

					// get collectionID input
					const collectionId = this.getNodeParameter('collectionId', 0) as string;
					// get documentID input
					const documentId = this.getNodeParameter('documentId', 0) as string;

					responseData = await appwriteApiRequest.call(this, 'GET', collectionId, documentId);
					returnData.push(responseData);
				}

				if (operation === 'updateDoc') {

					// get collectionID input
					const collectionId = this.getNodeParameter('collectionId', 0) as string;
					// get documentID input
					const documentId = this.getNodeParameter('documentId', 0) as string;

					const body: IDataObject = {
						data: this.getNodeParameter('body', 0) as IDataObject,
					};

					responseData = await appwriteApiRequest.call(this, 'PATCH', collectionId, documentId, body);
					returnData.push(responseData);
				}

				if (operation === 'deleteDoc') {

					// get collectionID input
					const collectionId = this.getNodeParameter('collectionId', 0) as string;
					// get documentID input
					const documentId = this.getNodeParameter('documentId', 0) as string;

					responseData = await appwriteApiRequest.call(this, 'DELETE', collectionId, documentId);
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
