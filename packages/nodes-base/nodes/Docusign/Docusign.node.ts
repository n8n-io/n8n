import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData, INodeProperties,
	INodeType,
	INodeTypeDescription,
	NodeOperationError
} from 'n8n-workflow';

import {
	docusignApiRequest,
	docusignApiRequestAllItems,
} from './GenericFunctions';

/**
 * This node currently implements the DocuSign eSignature API
 * https://developers.docusign.com/docs/esign-rest-api/reference/
 */
export class Docusign implements INodeType {

	// Reusable Template to add DS "Tabs" to multiple places in the n8n UI
	tabsDefinition: INodeProperties = {
		displayName: 'Tabs',
		name: 'tabs',
		placeholder: 'Add Tab',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		description: 'Prefill Tabs within the document or envelope',
		default: {},
		options: [
			{
				name: 'textTabs',
				displayName: 'Text',
				values: [
					{
						displayName: 'Data Label',
						name: 'tabLabel',
						type: 'string',
						default: '',
						description: 'The Name of the Text Field in DocuSign ("Data Label")',
					},
					{
						displayName: 'Tab value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value to fill the Tab with',
					},
				],
			},
			{
				name: 'checkboxTabs',
				displayName: 'Checkbox',
				values: [
					{
						displayName: 'Data Label',
						name: 'tabLabel',
						type: 'string',
						default: '',
						description: 'The Name of the Checkbox in DocuSign ("Data Label")',
					},
					{
						displayName: 'Checked?',
						name: 'selected',
						type: 'boolean',
						default: true,
						description: 'Should the Checkbox be checked?',
					},
				],
			},
			{
				name: 'radioGroupTabs',
				displayName: 'Radio',
				values: [
					{
						displayName: 'Radio Group Name',
						name: 'groupName',
						type: 'string',
						default: '',
						description: 'The name of the Radio Button Group',
					},
					{
						displayName: 'Radios',
						name: 'radios',
						placeholder: 'Add Radiobutton',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
							sortable: true,
						},
						description: 'Only add the Radio(s) you want to preselect',
						default: {},
						options: [
							{
								displayName: 'Radio',
								name: 'radio',
								values: [
									{
										displayName: 'Radio Button Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'The value of the single Radio Button ("Radio Button Value")',
									},
									{
										displayName: 'Selected?',
										name: 'selected',
										type: 'boolean',
										default: true,
										description: 'Should the Radiobutton be selected?',
									},
								],
							},
						],
					},
				],
			},
		],
	};

	description: INodeTypeDescription = {
		displayName: 'Docusign',
		name: 'docusign',
		icon: 'file:docusign.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume DocuSign API',
		defaults: {
			name: 'DocuSign',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'docusignOAuth2Api',
				testedBy: 'docusignApiTest',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'oAuth2',
				description: 'Authentication method to use.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Template',
						value: 'template',
					},
				],
				default: 'template',
				description: 'The resource to operate on.',
			},

			// ----------------------------------
			//         operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'template',
						],
					},
				},
				options: [
					{
						name: 'Sign via Mail',
						value: 'sign_via_mail',
						description: 'Start signing process via Mail',
					},
				],
				default: 'sign_via_mail',
				description: 'The operation to perform.',
			},


			// ----------------------------------
			//         shared
			// ----------------------------------
			{
				displayName: 'Use default Account?',
				name: 'useDefaultAccount',
				type: 'boolean',
				default: true,
				description: 'This will use the default account for this user reported by the Docusign API',
			},
			{
				displayName: 'Account Id',
				name: 'accountId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						useDefaultAccount: [
							false,
						],
					},
				},
				description: 'UUID of the Account to use if other than the Default',
			},
			{
				displayName: 'Template Id',
				name: 'templateId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'template',
						],
					},
				},
				description: 'UUID of the Template to use',
			},

			// ------------------------------------
			//         Roles and Tab Data
			// ------------------------------------
			{
				displayName: 'Roles',
				name: 'templateRoles',
				placeholder: 'Add Role',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,

				},
				description: 'Add and configure a role for this envelope',
				default: {},
				options: [
					{
						name: 'role',
						displayName: 'Role',
						values: [
							{
								displayName: 'Role Name',
								name: 'roleName',
								type: 'string',
								default: '',
								placeholder: 'signer / cc / client / ...',
								description: 'The configured name of this role',
							},
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'Jane Doe',
								description: 'The persons Name of this role',
							},
							{
								displayName: 'Mail Address',
								name: 'email',
								type: 'string',
								default: '',
								placeholder: 'Jane.Doe@example.com',
								description: 'This roles E-Mail address',
							},
							this.tabsDefinition,
						],
					},
				],
			},
			{
				...this.tabsDefinition,
				displayName: 'Prefill Tabs',
				name: 'prefillTabs',
				placeholder: 'Add Prefill Tab',
				description: 'Fill "Prefill Tabs" of the document',
			},
			{
				displayName: 'Envelope Custom Fields',
				name: 'customFields',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'Add CustomFields to the envelope',
				default: {},
				options: [
					{
						name: 'textCustomFields',
						displayName: 'Text',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'The key of the custom text field',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value of the custom text field',
							},
							{
								displayName: 'Display in Envelope?',
								name: 'show',
								type: 'boolean',
								default: false,
								description: 'Should the customField be displayed in the Envelope?',
							},
							{
								displayName: 'Required?',
								name: 'required',
								type: 'hidden',
								default: false,
							},
						],
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async docusignApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;
				const baseUrl = credentials!.server as string || 'https://account.docusign.com';

				const options: OptionsWithUri = {
					method: 'GET',
					headers: {
						'User-Agent': 'n8n',
						Authorization: `Bearer ${credentials!.accessToken}`,
					},
					uri: baseUrl.endsWith('/') ? baseUrl + 'oauth/userinfo' : baseUrl + '/oauth/userinfo',
					json: true,
					timeout: 5000,
				};
				try {
					const response = await this.helpers.request(options);
					if (!response.id) {
						return {
							status: 'Error',
							message: `Token is not valid: ${response.error}`,
						};
					}
				} catch (error) {
					return {
						status: 'Error',
						message: `Settings are not valid: ${error}`,
					};
				}
				return {
					status: 'OK',
					message: 'Authentication successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const returnAll = false;

		let responseData;

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		const operation = this.getNodeParameter('operation', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const fullOperation = `${resource}:${operation}`;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				// Reset all values
				requestMethod = 'GET';
				endpoint = '';
				body = {};
				qs = {};

				if (resource === 'template') {

					// Set Template ID for Envelope
					const templateId = this.getNodeParameter('templateId', itemIndex) as string;
					body.templateId = templateId;

					// Add Roles to the Envelope
					const templateRoles = this.getNodeParameter('templateRoles', itemIndex, []) as {};
					if (templateRoles) {
						//@ts-ignore
						body.templateRoles = templateRoles.role;
					}

					// Add Prefill Tabs
					// TODO: This currently does not seem to be implemented correctly at DocuSign
					const prefillTabs = this.getNodeParameter('prefillTabs', itemIndex, {}) as {};
					body.prefillTabs = prefillTabs;

					// Add Custom Fields
					const customFields = this.getNodeParameter('customFields', itemIndex, {}) as {};
					body.customFields = customFields;

					if (operation === 'sign_via_mail') {
						// ----------------------------------
						//         create/edit
						// ----------------------------------

						requestMethod = 'POST';

						// Tell DS to send the signing request via mail
						body.status = 'Sent';

						endpoint = `/envelopes`;
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
				}

				// @ts-ignore
				if (returnAll === true) {
					responseData = await docusignApiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
				} else {
					responseData = await docusignApiRequest.call(this, requestMethod, endpoint, body, qs);
				}

				returnData.push(responseData);

			} catch (error) {
				if (this.continueOnFail()) {
					items[itemIndex].json = { error: error.message };
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
