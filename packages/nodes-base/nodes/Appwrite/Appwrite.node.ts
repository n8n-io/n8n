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

import {
	OptionsWithUri,
} from 'request';

export class Appwrite implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Appwrite',
			name: 'appwrite',
			icon: 'file:Appwrite.svg',
			group: ['transform'],
			version: 1,
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
			{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					displayOptions: {
							show: {
									resource: [
											'document',
									],
							},
					},
					options: [
							{
									name: 'Create',
									value: 'createDoc',
									description: 'Create a document in collection',
							},
							{
								name: 'Get',
								value: 'getDoc',
								description: 'Get a document in collection',
							},
							{
								name: 'Get All',
								value: 'getAllDocs',
								description: 'Get all documents in collection',
							},
							{
								name: 'Update',
								value: 'updateDoc',
								description: 'Get all documents in collection',
							},
							{
								name: 'Delete',
								value: 'deleteDoc',
								description: 'Delete document in collection',
							},
					],
					default: 'getAllDocs',
					description: 'The operation to perform.',
			},
			{
					displayName: 'Collection ID',
					name: 'collectionId',
					type: 'string',
					required: true,
					displayOptions: {
							show: {
									operation: [
											'createDoc',
											'getAllDocs',
											'getDoc',
											'updateDoc',
											'deleteDoc',
									],
									resource: [
											'document',
									],
							},
					},
					default:'',
					description:'Collection to list/create documents in',
			},
			{
				displayName: 'Document ID',
				name: 'documentId',
				type: 'string',
				required: true,
				displayOptions: {
						show: {
								operation: [
										'getDoc',
										'updateDoc',
										'deleteDoc',
								],
								resource: [
										'document',
								],
						},
				},
				default:'',
				description:'Document ID to get from collection',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'json',
				required: true,
				displayOptions: {
						show: {
								operation: [
										'createDoc',
										'updateDoc',
								],
								resource: [
										'document',
								],
						},
				},
				default:'{"attributeName1":"attribute-value1", "attributeName2":"attribute-value2"}',
				description:'Body to create document with',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
						show: {
							operation: [
								'createDoc',
								'getAllDocs',
							],
							resource: [
									'document',
							],
						},
				},
				options: [
						{
								displayName: 'limit',
								name: 'limit',
								type: 'number',
								default: '',
								description: 'Maximum number of documents to return in response. By default will return maximum 25 results. Maximum of 100 results allowed per request.'
						},
						{
								displayName: 'offset',
								name: 'offset',
								type: 'number',
								default: '',
								description: 'Offset value. The default value is 0. Use this value to manage pagination. [learn more about pagination](https://appwrite.io/docs/pagination)'
						},
						{
							displayName: 'cursor',
							name: 'cursor',
							type: 'string',
							default: '',
							description: 'ID of the document used as the starting point for the query, excluding the document itself. Should be used for efficient pagination when working with large sets of data. [learn more about pagination](https://appwrite.io/docs/pagination)',
						},
						{
							displayName: 'cursorDirection',
							name: 'cursorDirection',
							type: 'string',
							default: '',
							description: 'Direction of the cursor.',
						},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async appwriteApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
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
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		//Get credentials the user provided for this node
		const credentials = await this.getCredentials('appwriteApi') as IDataObject;

		if (resource === 'document') {

			if (operation === 'createDoc') {

				// get collectionID input
				const collectionId = this.getNodeParameter('collectionId', 0) as string;

				let options = {} as OptionsWithUri;

				options = {
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'X-Appwrite-Project': `${credentials.projectId}`,
						'X-Appwrite-Key': `${credentials.apiKey}`,
					},
					method: 'POST',
					uri: `${credentials.url}/v1/database/collections/${collectionId}/documents`,
					json: true,
					body: {
						documentId: "unique()",
						data: this.getNodeParameter('body', 0) as IDataObject,
					},
				};

				responseData = await this.helpers.request(options);
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

				let options = {} as OptionsWithUri;

				options = {
					headers: {
						'Accept': 'application/json',
						'X-Appwrite-Project': `${credentials.projectId}`,
						'X-Appwrite-Key': `${credentials.apiKey}`,
					},
					method: 'GET',
					uri: `${credentials.url}/v1/database/collections/${collectionId}/documents`,
					json: true,
					qs
				};

				responseData = await this.helpers.request(options);
			}

			if (operation === 'getDoc') {

				// get collectionID input
				const collectionId = this.getNodeParameter('collectionId', 0) as string;
				// get documentID input
				const documentId = this.getNodeParameter('documentId', 0) as string;

				let options = {} as OptionsWithUri;

				options = {
					headers: {
						'Accept': 'application/json',
						'X-Appwrite-Project': `${credentials.projectId}`,
						'X-Appwrite-Key': `${credentials.apiKey}`,
					},
					method: 'GET',
					uri: `${credentials.url}/v1/database/collections/${collectionId}/documents/${documentId}`,
					json: true,
				};

				responseData = await this.helpers.request(options);
			}

			if (operation === 'updateDoc') {

				// get collectionID input
				const collectionId = this.getNodeParameter('collectionId', 0) as string;
				// get documentID input
				const documentId = this.getNodeParameter('documentId', 0) as string;

				let options = {} as OptionsWithUri;

				options = {
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'X-Appwrite-Project': `${credentials.projectId}`,
						'X-Appwrite-Key': `${credentials.apiKey}`,
					},
					method: 'PATCH',
					uri: `${credentials.url}/v1/database/collections/${collectionId}/documents/${documentId}`,
					json: true,
					body: {
						data: this.getNodeParameter('body', 0) as IDataObject,
					},
				};

				responseData = await this.helpers.request(options);
			}

			if (operation === 'deleteDoc') {

				// get collectionID input
				const collectionId = this.getNodeParameter('collectionId', 0) as string;
				// get documentID input
				const documentId = this.getNodeParameter('documentId', 0) as string;

				let options = {} as OptionsWithUri;

				options = {
					headers: {
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'X-Appwrite-Project': `${credentials.projectId}`,
						'X-Appwrite-Key': `${credentials.apiKey}`,
					},
					method: 'DELETE',
					uri: `${credentials.url}/v1/database/collections/${collectionId}/documents/${documentId}`,
					json: true,
				};

				responseData = await this.helpers.request(options);
			}
		}

		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
}

}
