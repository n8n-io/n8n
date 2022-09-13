import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import {
	msGraphSecurityApiRequest,
	throwOnEmptyUpdate,
	tolerateDoubleQuotes,
} from './GenericFunctions';

import {
	secureScoreControlProfileFields,
	secureScoreControlProfileOperations,
	secureScoreFields,
	secureScoreOperations,
} from './descriptions';

export class MicrosoftGraphSecurity implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Graph Security',
		name: 'microsoftGraphSecurity',
		icon: 'file:microsoftGraph.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Microsoft Graph Security API',
		defaults: {
			name: 'Microsoft Graph Security',
			color: '#0078d4',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftGraphSecurityOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Secure Score',
						value: 'secureScore',
					},
					{
						name: 'Secure Score Control Profile',
						value: 'secureScoreControlProfile',
					},
				],
				default: 'secureScore',
			},
			...secureScoreOperations,
			...secureScoreFields,
			...secureScoreControlProfileOperations,
			...secureScoreControlProfileFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as
			| 'secureScore'
			| 'secureScoreControlProfile';
		const operation = this.getNodeParameter('operation', 0) as 'get' | 'getAll' | 'update';

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'secureScore') {
					// **********************************************************************
					//                              secureScore
					// **********************************************************************

					if (operation === 'get') {
						// ----------------------------------------
						//             secureScore: get
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/securescore-get

						const secureScoreId = this.getNodeParameter('secureScoreId', i);

						responseData = await msGraphSecurityApiRequest.call(
							this,
							'GET',
							`/secureScores/${secureScoreId}`,
						);
						delete responseData['@odata.context'];
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//           secureScore: getAll
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/security-list-securescores

						const qs: IDataObject = {};

						const { filter, includeControlScores } = this.getNodeParameter('filters', i) as {
							filter?: string;
							includeControlScores?: boolean;
						};

						if (filter) {
							qs.$filter = tolerateDoubleQuotes(filter);
						}

						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

						if (!returnAll) {
							qs.$count = true;
							qs.$top = this.getNodeParameter('limit', 0);
						}

						responseData = (await msGraphSecurityApiRequest
							.call(this, 'GET', '/secureScores', {}, qs)
							.then((response) => response.value)) as Array<{ controlScores: object[] }>;

						if (!includeControlScores) {
							responseData = responseData.map(({ controlScores, ...rest }) => rest);
						}
					}
				} else if (resource === 'secureScoreControlProfile') {
					// **********************************************************************
					//                       secureScoreControlProfile
					// **********************************************************************

					if (operation === 'get') {
						// ----------------------------------------
						//      secureScoreControlProfile: get
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/securescorecontrolprofile-get

						const secureScoreControlProfileId = this.getNodeParameter(
							'secureScoreControlProfileId',
							i,
						);
						const endpoint = `/secureScoreControlProfiles/${secureScoreControlProfileId}`;

						responseData = await msGraphSecurityApiRequest.call(this, 'GET', endpoint);
						delete responseData['@odata.context'];
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//    secureScoreControlProfile: getAll
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/security-list-securescorecontrolprofiles

						const qs: IDataObject = {};

						const { filter } = this.getNodeParameter('filters', i) as { filter?: string };

						if (filter) {
							qs.$filter = tolerateDoubleQuotes(filter);
						}

						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

						if (!returnAll) {
							qs.$count = true;
							qs.$top = this.getNodeParameter('limit', 0);
						}

						responseData = await msGraphSecurityApiRequest
							.call(this, 'GET', '/secureScoreControlProfiles', {}, qs)
							.then((response) => response.value);
					} else if (operation === 'update') {
						// ----------------------------------------
						//    secureScoreControlProfile: update
						// ----------------------------------------

						// https://docs.microsoft.com/en-us/graph/api/securescorecontrolprofile-update

						const body: IDataObject = {
							vendorInformation: {
								provider: this.getNodeParameter('provider', i),
								vendor: this.getNodeParameter('vendor', i),
							},
						};

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (!Object.keys(updateFields).length) {
							throwOnEmptyUpdate.call(this);
						}

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						}

						const id = this.getNodeParameter('secureScoreControlProfileId', i);
						const endpoint = `/secureScoreControlProfiles/${id}`;
						const headers = { Prefer: 'return=representation' };

						responseData = await msGraphSecurityApiRequest.call(
							this,
							'PATCH',
							endpoint,
							body,
							{},
							headers,
						);
						delete responseData['@odata.context'];
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
