import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import { clockifyApiRequest, computeValues, flatten } from './GenericFunctions';
import { timeEntryOperations, timeEntryFields } from './TimeEntryDescription';

export class Clockify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clockify',
		name: 'clockify',
		icon: 'file:clockify.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Clockify',
		defaults: {
			name: 'Clockify',
			color: '#22BB44',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'clockifyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Time Entries',
						value: 'timeEntry',
					},
				],
				default: 'task',
				description: 'The resource to operate on.',
			},

			// operations
			...timeEntryOperations,

			// fields
			...timeEntryFields,
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';
		let body: IDataObject | Buffer;
		let qs: IDataObject;

		const credentials = this.getCredentials('clockifyApi');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}
		for (let i = 0; i < items.length; i++) {
			body = {};
			qs = {};

			if (resource === 'timeEntry') {
				if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------
					requestMethod = 'GET';
					endpoint = `workspaces/${credentials.workspaceId}/users`;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const billable = this.getNodeParameter('billable', i) as boolean;

					const filterEntries = (entry: { billable: boolean; }) => {
						if (billable) {
							return entry.billable;
						}
						return true;
					}

					let limit = 100;
					if (!returnAll) {
						limit = this.getNodeParameter('limit', i) as number;
					}
					qs['page-size'] = returnAll ? 100000 : limit;
					const additionalFields = this.getNodeParameter('filters', i) as IDataObject;
					Object.assign(qs, additionalFields);
					const responseUsersData: IDataObject[] = await clockifyApiRequest.call(this, requestMethod, endpoint, {}, qs);

					const data = await Promise.all(responseUsersData.map(async user => {
						endpoint = `workspaces/${credentials.workspaceId}/user/${user.id}/time-entries`;
						const entries = await clockifyApiRequest.call(this, requestMethod, endpoint, {}, qs)
						return entries
							.filter(filterEntries)
							.map(
								(entry: any) => ({
									...entry,
									...computeValues(entry, user),
									user: {
										id: user.id,
										email: user.email,
										name: user.name,
									}
								})
							);
						}
					));
					returnData = flatten(data);

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}

			}

			return [this.helpers.returnJsonArray(returnData)];
		}
		return [];
	}
}
