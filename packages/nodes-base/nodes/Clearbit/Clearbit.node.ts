import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { clearbitApiRequest } from './GenericFunctions';

import { companyFields, companyOperations } from './CompanyDescription';

import { personFields, personOperations } from './PersonDescription';

export class Clearbit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clearbit',
		name: 'clearbit',
		icon: 'file:clearbit.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Consume Clearbit API',
		defaults: {
			name: 'Clearbit',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'clearbitApi',
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
						name: 'Company',
						value: 'company',
						description: 'The Company API allows you to look up a company by their domain',
					},
					{
						name: 'Person',
						value: 'person',
						description:
							'The Person API lets you retrieve social information associated with an email address, such as a person’s name, location and Twitter handle',
					},
				],
				default: 'company',
			},
			...companyOperations,
			...companyFields,
			...personOperations,
			...personFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'person') {
					if (operation === 'enrich') {
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						qs.email = email;
						if (additionalFields.givenName) {
							qs.given_name = additionalFields.givenName as string;
						}
						if (additionalFields.familyName) {
							qs.family_name = additionalFields.familyName as string;
						}
						if (additionalFields.ipAddress) {
							qs.ip_address = additionalFields.ipAddress as string;
						}
						if (additionalFields.location) {
							qs.location = additionalFields.location as string;
						}
						if (additionalFields.company) {
							qs.company = additionalFields.company as string;
						}
						if (additionalFields.companyDomain) {
							qs.company_domain = additionalFields.companyDomain as string;
						}
						if (additionalFields.linkedIn) {
							qs.linkedin = additionalFields.linkedIn as string;
						}
						if (additionalFields.twitter) {
							qs.twitter = additionalFields.twitter as string;
						}
						if (additionalFields.facebook) {
							qs.facebook = additionalFields.facebook as string;
						}
						responseData = await clearbitApiRequest.call(
							this,
							'GET',
							`${resource}-stream`,
							'/v2/people/find',
							{},
							qs,
						);
					}
				}
				if (resource === 'company') {
					if (operation === 'enrich') {
						const domain = this.getNodeParameter('domain', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						qs.domain = domain;
						if (additionalFields.companyName) {
							qs.company_name = additionalFields.companyName as string;
						}
						if (additionalFields.linkedin) {
							qs.linkedin = additionalFields.linkedin as string;
						}
						if (additionalFields.twitter) {
							qs.twitter = additionalFields.twitter as string;
						}
						if (additionalFields.facebook) {
							qs.facebook = additionalFields.facebook as string;
						}
						responseData = await clearbitApiRequest.call(
							this,
							'GET',
							`${resource}-stream`,
							'/v2/companies/find',
							{},
							qs,
						);
					}
					if (operation === 'autocomplete') {
						const name = this.getNodeParameter('name', i) as string;
						qs.query = name;
						responseData = await clearbitApiRequest.call(
							this,
							'GET',
							'autocomplete',
							'/v1/companies/suggest',
							{},
							qs,
						);
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {} });
					continue;
				}
				throw error;
			}
		}
		return this.prepareOutputData(returnData);
	}
}
