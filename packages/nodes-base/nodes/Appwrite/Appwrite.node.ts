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
									name: 'Contact',
									value: 'contact',
							},
					],
					default: 'contact',
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
											'contact',
									],
							},
					},
					options: [
							{
									name: 'Create',
									value: 'create',
									description: 'Create a contact',
							},
					],
					default: 'create',
					description: 'The operation to perform.',
			},
			{
					displayName: 'Email',
					name: 'email',
					type: 'string',
					required: true,
					displayOptions: {
							show: {
									operation: [
											'create',
									],
									resource: [
											'contact',
									],
							},
					},
					default:'',
					description:'Primary email for the contact',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
						show: {
								resource: [
										'contact',
								],
								operation: [
										'create',
								],
						},
				},
				options: [
						{
								displayName: 'First Name',
								name: 'firstName',
								type: 'string',
								default: '',
						},
						{
								displayName: 'Last Name',
								name: 'lastName',
								type: 'string',
								default: '',
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

		if (resource === 'contact') {
				if (operation === 'create') {
						// get email input
						const email = this.getNodeParameter('email', 0) as string;
						// get additional fields input
						const additionalFields = this.getNodeParameter('additionalFields', 0) as IDataObject;
						const data: IDataObject = {
								email,
						};

						Object.assign(data, additionalFields);

						//Make http request according to <https://sendgrid.com/docs/api-reference/>
						const options: OptionsWithUri = {
								headers: {
										'Accept': 'application/json',
										'X-Appwrite-Project': `${credentials.projectId}`,
										'X-Appwrite-Key': `${credentials.apiKey}`,
								},
								method: 'GET',
								body: {
										contacts: [
												data,
										],
								},
								uri: `http://localhost:8008/v1/health`,
								json: true,
						};

						responseData = await this.helpers.request(options);
				}
		}

		// Map data to n8n data
		return [this.helpers.returnJsonArray(responseData)];
}

}
