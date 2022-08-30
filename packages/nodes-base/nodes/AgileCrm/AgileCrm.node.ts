import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { contactFields, contactOperations } from './ContactDescription';

import { companyFields, companyOperations } from './CompanyDescription';

import { dealFields, dealOperations } from './DealDescription';

import { IContact, IContactUpdate } from './ContactInterface';

import {
	agileCrmApiRequest,
	agileCrmApiRequestAllItems,
	agileCrmApiRequestUpdate,
	getFilterRules,
	simplifyResponse,
	validateJSON,
} from './GenericFunctions';

import { IDeal } from './DealInterface';

import { IFilter, ISearchConditions } from './FilterInterface';

export class AgileCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Agile CRM',
		name: 'agileCrm',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:agilecrm.png',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		group: ['transform'],
		version: 1,
		description: 'Consume Agile CRM API',
		defaults: {
			name: 'AgileCRM',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'agileCrmApi',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
				],
				default: 'contact',
			},
			// CONTACT
			...contactOperations,
			...contactFields,

			// COMPANY
			...companyOperations,
			...companyFields,

			// DEAL
			...dealOperations,
			...dealFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			if (resource === 'contact' || resource === 'company') {
				const idGetter = resource === 'contact' ? 'contactId' : 'companyId';

				if (operation === 'get') {
					const contactId = this.getNodeParameter(idGetter, i) as string;

					const endpoint = `api/contacts/${contactId}`;
					responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, {});
				} else if (operation === 'delete') {
					const contactId = this.getNodeParameter(idGetter, i) as string;

					const endpoint = `api/contacts/${contactId}`;
					responseData = await agileCrmApiRequest.call(this, 'DELETE', endpoint, {});
				} else if (operation === 'getAll') {
					const simple = this.getNodeParameter('simple', 0) as boolean;
					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
					const filterType = this.getNodeParameter('filterType', i) as string;
					const sort = this.getNodeParameter('options.sort.sort', i, {}) as {
						direction: string;
						field: string;
					};
					const body: IDataObject = {};
					const filterJson: IFilter = {};

					let contactType = '';
					if (resource === 'contact') {
						contactType = 'PERSON';
					} else {
						contactType = 'COMPANY';
					}
					filterJson.contact_type = contactType;

					if (filterType === 'manual') {
						const conditions = this.getNodeParameter(
							'filters.conditions',
							i,
							[],
						) as ISearchConditions[];
						const matchType = this.getNodeParameter('matchType', i) as string;
						let rules;
						if (conditions.length !== 0) {
							rules = getFilterRules(conditions, matchType);
							Object.assign(filterJson, rules);
						} else {
							throw new NodeOperationError(
								this.getNode(),
								'At least one condition must be added.',
								{ itemIndex: i },
							);
						}
					} else if (filterType === 'json') {
						const filterJsonRules = this.getNodeParameter('filterJson', i) as string;
						if (validateJSON(filterJsonRules) !== undefined) {
							Object.assign(filterJson, JSON.parse(filterJsonRules) as IFilter);
						} else {
							throw new NodeOperationError(this.getNode(), 'Filter (JSON) must be a valid json', {
								itemIndex: i,
							});
						}
					}
					body.filterJson = JSON.stringify(filterJson);

					if (sort) {
						if (sort.direction === 'ASC') {
							body.global_sort_key = sort.field;
						} else if (sort.direction === 'DESC') {
							body.global_sort_key = `-${sort.field}`;
						}
					}

					if (returnAll) {
						body.page_size = 100;
						responseData = await agileCrmApiRequestAllItems.call(
							this,
							'POST',
							`api/filters/filter/dynamic-filter`,
							body,
							undefined,
							undefined,
							true,
						);
					} else {
						body.page_size = this.getNodeParameter('limit', 0) as number;
						responseData = await agileCrmApiRequest.call(
							this,
							'POST',
							`api/filters/filter/dynamic-filter`,
							body,
							undefined,
							undefined,
							true,
						);
					}

					if (simple) {
						responseData = simplifyResponse(responseData);
					}
				} else if (operation === 'create') {
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
					const body: IContact = {};
					const properties: IDataObject[] = [];

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {
							if (validateJSON(additionalFieldsJson) !== undefined) {
								Object.assign(body, JSON.parse(additionalFieldsJson));
							} else {
								throw new NodeOperationError(
									this.getNode(),
									'Additional fields must be a valid JSON',
									{ itemIndex: i },
								);
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// if company, add 'company' as type. default is person
						if (resource === 'company') {
							body.type = 'COMPANY';
						}
						if (additionalFields.starValue) {
							body.star_value = additionalFields.starValue as string;
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags as string[];
						}

						// Contact specific properties
						if (resource === 'contact') {
							if (additionalFields.firstName) {
								properties.push({
									type: 'SYSTEM',
									name: 'first_name',
									value: additionalFields.firstName as string,
								} as IDataObject);
							}
							if (additionalFields.lastName) {
								properties.push({
									type: 'SYSTEM',
									name: 'last_name',
									value: additionalFields.lastName as string,
								} as IDataObject);
							}
							if (additionalFields.company) {
								properties.push({
									type: 'SYSTEM',
									name: 'company',
									value: additionalFields.company as string,
								} as IDataObject);
							}
							if (additionalFields.title) {
								properties.push({
									type: 'SYSTEM',
									name: 'title',
									value: additionalFields.title as string,
								} as IDataObject);
							}
							if (additionalFields.emailOptions) {
								//@ts-ignore
								additionalFields.emailOptions.emailProperties.map((property) => {
									properties.push({
										type: 'SYSTEM',
										subtype: property.subtype as string,
										name: 'email',
										value: property.email as string,
									} as IDataObject);
								});
							}
							if (additionalFields.addressOptions) {
								//@ts-ignore
								additionalFields.addressOptions.addressProperties.map((property) => {
									properties.push({
										type: 'SYSTEM',
										subtype: property.subtype as string,
										name: 'address',
										value: property.address as string,
									} as IDataObject);
								});
							}

							if (additionalFields.phoneOptions) {
								//@ts-ignore
								additionalFields.phoneOptions.phoneProperties.map((property) => {
									properties.push({
										type: 'SYSTEM',
										subtype: property.subtype as string,
										name: 'phone',
										value: property.number as string,
									} as IDataObject);
								});
							}
						} else if (resource === 'company') {
							if (additionalFields.email) {
								properties.push({
									type: 'SYSTEM',
									name: 'email',
									value: additionalFields.email as string,
								} as IDataObject);
							}

							if (additionalFields.address) {
								properties.push({
									type: 'SYSTEM',
									name: 'address',
									value: additionalFields.address as string,
								} as IDataObject);
							}

							if (additionalFields.phone) {
								properties.push({
									type: 'SYSTEM',
									name: 'phone',
									value: additionalFields.phone as string,
								} as IDataObject);
							}
						}

						if (additionalFields.websiteOptions) {
							//@ts-ignore
							additionalFields.websiteOptions.websiteProperties.map((property) => {
								properties.push({
									type: 'SYSTEM',
									subtype: property.subtype as string,
									name: 'webiste',
									value: property.url as string,
								} as IDataObject);
							});
						}

						if (additionalFields.customProperties) {
							//@ts-ignore
							additionalFields.customProperties.customProperty.map((property) => {
								properties.push({
									type: 'CUSTOM',
									subtype: property.subtype as string,
									name: property.name,
									value: property.value as string,
								} as IDataObject);
							});
						}
						body.properties = properties;
					}
					const endpoint = 'api/contacts';
					responseData = await agileCrmApiRequest.call(this, 'POST', endpoint, body);
				} else if (operation === 'update') {
					const contactId = this.getNodeParameter(idGetter, i) as string;
					const contactUpdatePayload: IContactUpdate = { id: contactId };
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;
					const body: IContact = {};
					const properties: IDataObject[] = [];

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {
							if (validateJSON(additionalFieldsJson) !== undefined) {
								Object.assign(body, JSON.parse(additionalFieldsJson));
							} else {
								throw new NodeOperationError(
									this.getNode(),
									'Additional fields must be a valid JSON',
									{ itemIndex: i },
								);
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (additionalFields.starValue) {
							body.star_value = additionalFields.starValue as string;
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags as string[];
						}

						// Contact specific properties
						if (resource === 'contact') {
							if (additionalFields.leadScore) {
								body.lead_score = additionalFields.leadScore as string;
							}

							if (additionalFields.firstName) {
								properties.push({
									type: 'SYSTEM',
									name: 'first_name',
									value: additionalFields.firstName as string,
								} as IDataObject);
							}
							if (additionalFields.lastName) {
								properties.push({
									type: 'SYSTEM',
									name: 'last_name',
									value: additionalFields.lastName as string,
								} as IDataObject);
							}
							if (additionalFields.company) {
								properties.push({
									type: 'SYSTEM',
									name: 'company',
									value: additionalFields.company as string,
								} as IDataObject);
							}
							if (additionalFields.title) {
								properties.push({
									type: 'SYSTEM',
									name: 'title',
									value: additionalFields.title as string,
								} as IDataObject);
							}
							if (additionalFields.emailOptions) {
								//@ts-ignore
								additionalFields.emailOptions.emailProperties.map((property) => {
									properties.push({
										type: 'SYSTEM',
										subtype: property.subtype as string,
										name: 'email',
										value: property.email as string,
									} as IDataObject);
								});
							}
							if (additionalFields.addressOptions) {
								//@ts-ignore
								additionalFields.addressOptions.addressProperties.map((property) => {
									properties.push({
										type: 'SYSTEM',
										subtype: property.subtype as string,
										name: 'address',
										value: property.address as string,
									} as IDataObject);
								});
							}

							if (additionalFields.phoneOptions) {
								//@ts-ignore
								additionalFields.phoneOptions.phoneProperties.map((property) => {
									properties.push({
										type: 'SYSTEM',
										subtype: property.subtype as string,
										name: 'phone',
										value: property.number as string,
									} as IDataObject);
								});
							}
						} else if (resource === 'company') {
							if (additionalFields.email) {
								properties.push({
									type: 'SYSTEM',
									name: 'email',
									value: additionalFields.email as string,
								} as IDataObject);
							}

							if (additionalFields.address) {
								properties.push({
									type: 'SYSTEM',
									name: 'address',
									value: additionalFields.address as string,
								} as IDataObject);
							}

							if (additionalFields.phone) {
								properties.push({
									type: 'SYSTEM',
									name: 'phone',
									value: additionalFields.phone as string,
								} as IDataObject);
							}
						}

						if (additionalFields.websiteOptions) {
							//@ts-ignore
							additionalFields.websiteOptions.websiteProperties.map((property) => {
								properties.push({
									type: 'SYSTEM',
									subtype: property.subtype as string,
									name: 'webiste',
									value: property.url as string,
								} as IDataObject);
							});
						}
						if (additionalFields.customProperties) {
							//@ts-ignore
							additionalFields.customProperties.customProperty.map((property) => {
								properties.push({
									type: 'CUSTOM',
									subtype: property.subtype as string,
									name: property.name,
									value: property.value as string,
								} as IDataObject);
							});
						}
						body.properties = properties;
					}

					Object.assign(contactUpdatePayload, body);

					responseData = await agileCrmApiRequestUpdate.call(this, 'PUT', '', contactUpdatePayload);
				}
			} else if (resource === 'deal') {
				if (operation === 'get') {
					const dealId = this.getNodeParameter('dealId', i) as string;

					const endpoint = `api/opportunity/${dealId}`;
					responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, {});
				} else if (operation === 'delete') {
					const contactId = this.getNodeParameter('dealId', i) as string;

					const endpoint = `api/opportunity/${contactId}`;
					responseData = await agileCrmApiRequest.call(this, 'DELETE', endpoint, {});
				} else if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
					const endpoint = 'api/opportunity';

					if (returnAll) {
						const limit = 100;
						responseData = await agileCrmApiRequestAllItems.call(this, 'GET', endpoint, undefined, {
							page_size: limit,
						});
					} else {
						const limit = this.getNodeParameter('limit', 0) as number;
						responseData = await agileCrmApiRequest.call(this, 'GET', endpoint, undefined, {
							page_size: limit,
						});
					}
				} else if (operation === 'create') {
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					const body: IDeal = {};

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {
							if (validateJSON(additionalFieldsJson) !== undefined) {
								Object.assign(body, JSON.parse(additionalFieldsJson));
							} else {
								throw new NodeOperationError(
									this.getNode(),
									'Additional fields must be a valid JSON',
									{ itemIndex: i },
								);
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						body.close_date = new Date(this.getNodeParameter('closeDate', i) as string).getTime();
						body.expected_value = this.getNodeParameter('expectedValue', i) as number;
						body.milestone = this.getNodeParameter('milestone', i) as string;
						body.probability = this.getNodeParameter('probability', i) as number;
						body.name = this.getNodeParameter('name', i) as string;

						if (additionalFields.contactIds) {
							body.contactIds = additionalFields.contactIds as string[];
						}

						if (additionalFields.customData) {
							// @ts-ignore
							body.customData = additionalFields.customData.customProperty as IDealCustomProperty[];
						}
					}

					const endpoint = 'api/opportunity';
					responseData = await agileCrmApiRequest.call(this, 'POST', endpoint, body);
				} else if (operation === 'update') {
					const jsonParameters = this.getNodeParameter('jsonParameters', i) as boolean;

					const body: IDeal = {};

					if (jsonParameters) {
						const additionalFieldsJson = this.getNodeParameter('additionalFieldsJson', i) as string;

						if (additionalFieldsJson !== '') {
							if (validateJSON(additionalFieldsJson) !== undefined) {
								Object.assign(body, JSON.parse(additionalFieldsJson));
							} else {
								throw new NodeOperationError(
									this.getNode(),
									'Additional fields must be valid JSON',
									{ itemIndex: i },
								);
							}
						}
					} else {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						body.id = this.getNodeParameter('dealId', i) as number;

						if (additionalFields.expectedValue) {
							body.expected_value = additionalFields.expectedValue as number;
						}

						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}

						if (additionalFields.probability) {
							body.probability = additionalFields.probability as number;
						}

						if (additionalFields.contactIds) {
							body.contactIds = additionalFields.contactIds as string[];
						}

						if (additionalFields.customData) {
							// @ts-ignore
							body.customData = additionalFields.customData.customProperty as IDealCustomProperty[];
						}
					}

					const endpoint = 'api/opportunity/partial-update';
					responseData = await agileCrmApiRequest.call(this, 'PUT', endpoint, body);
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
