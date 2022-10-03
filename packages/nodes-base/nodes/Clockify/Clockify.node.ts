import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { clockifyApiRequest, clockifyApiRequestAllItems } from './GenericFunctions';

import { IClientDto, IWorkspaceDto } from './WorkpaceInterfaces';

import { IUserDto } from './UserDtos';

import { IProjectDto } from './ProjectInterfaces';

import { clientFields, clientOperations } from './ClientDescription';

import { projectFields, projectOperations } from './ProjectDescription';

import { tagFields, tagOperations } from './TagDescription';

import { taskFields, taskOperations } from './TaskDescription';

import { timeEntryFields, timeEntryOperations } from './TimeEntryDescription';

import { userFields, userOperations } from './UserDescription';

import { workspaceFields, workspaceOperations } from './WorkspaceDescription';

import moment from 'moment-timezone';

export class Clockify implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clockify',
		name: 'clockify',
		icon: 'file:clockify.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Clockify REST API',
		defaults: {
			name: 'Clockify',
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
				noDataExpression: true,
				options: [
					{
						name: 'Client',
						value: 'client',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'Time Entry',
						value: 'timeEntry',
					},
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Workspace',
						value: 'workspace',
					},
				],
				default: 'project',
			},
			...clientOperations,
			...projectOperations,
			...tagOperations,
			...taskOperations,
			...timeEntryOperations,
			...userOperations,
			...workspaceOperations,
			...workspaceFields,
			{
				displayName: 'Workspace Name or ID',
				name: 'workspaceId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'listWorkspaces',
				},
				required: true,
				default: [],
				displayOptions: {
					hide: {
						resource: ['workspace'],
					},
				},
			},
			...clientFields,
			...projectFields,
			...tagFields,
			...taskFields,
			...userFields,
			...timeEntryFields,
		],
	};

	methods = {
		loadOptions: {
			async listWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rtv: INodePropertyOptions[] = [];
				const workspaces: IWorkspaceDto[] = await clockifyApiRequest.call(
					this,
					'GET',
					'workspaces',
				);
				if (undefined !== workspaces) {
					workspaces.forEach((value) => {
						rtv.push({
							name: value.name,
							value: value.id,
						});
					});
				}
				return rtv;
			},
			async loadUsersForWorkspace(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rtv: INodePropertyOptions[] = [];
				const workspaceId = this.getCurrentNodeParameter('workspaceId');
				if (undefined !== workspaceId) {
					const resource = `workspaces/${workspaceId}/users`;
					const users: IUserDto[] = await clockifyApiRequest.call(this, 'GET', resource);
					if (undefined !== users) {
						users.forEach((value) => {
							rtv.push({
								name: value.name,
								value: value.id,
							});
						});
					}
				}
				return rtv;
			},
			async loadClientsForWorkspace(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rtv: INodePropertyOptions[] = [];
				const workspaceId = this.getCurrentNodeParameter('workspaceId');
				if (undefined !== workspaceId) {
					const resource = `workspaces/${workspaceId}/clients`;
					const clients: IClientDto[] = await clockifyApiRequest.call(this, 'GET', resource);
					if (undefined !== clients) {
						clients.forEach((value) => {
							rtv.push({
								name: value.name,
								value: value.id,
							});
						});
					}
				}
				return rtv;
			},
			async loadProjectsForWorkspace(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rtv: INodePropertyOptions[] = [];
				const workspaceId = this.getCurrentNodeParameter('workspaceId');
				if (undefined !== workspaceId) {
					const resource = `workspaces/${workspaceId}/projects`;
					const users: IProjectDto[] = await clockifyApiRequest.call(this, 'GET', resource);
					if (undefined !== users) {
						users.forEach((value) => {
							rtv.push({
								name: value.name,
								value: value.id,
							});
						});
					}
				}
				return rtv;
			},
			async loadTagsForWorkspace(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rtv: INodePropertyOptions[] = [];
				const workspaceId = this.getCurrentNodeParameter('workspaceId');
				if (undefined !== workspaceId) {
					const resource = `workspaces/${workspaceId}/tags`;
					const users: IProjectDto[] = await clockifyApiRequest.call(this, 'GET', resource);
					if (undefined !== users) {
						users.forEach((value) => {
							rtv.push({
								name: value.name,
								value: value.id,
							});
						});
					}
				}
				return rtv;
			},
			async loadCustomFieldsForWorkspace(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const rtv: INodePropertyOptions[] = [];
				const workspaceId = this.getCurrentNodeParameter('workspaceId');
				if (undefined !== workspaceId) {
					const resource = `workspaces/${workspaceId}/custom-fields`;
					const customFields = await clockifyApiRequest.call(this, 'GET', resource);
					for (const customField of customFields) {
						rtv.push({
							name: customField.name,
							value: customField.id,
						});
					}
				}
				return rtv;
			},
		},
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
				if (resource === 'client') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						const body: IDataObject = {
							name,
						};

						responseData = await clockifyApiRequest.call(
							this,
							'POST',
							`/workspaces/${workspaceId}/clients`,
							body,
							qs,
						);
					}

					if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const clientId = this.getNodeParameter('clientId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'DELETE',
							`/workspaces/${workspaceId}/clients/${clientId}`,
							{},
							qs,
						);
					}

					if (operation === 'update') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const clientId = this.getNodeParameter('clientId', i) as string;
						const name = this.getNodeParameter('name', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {
							name,
						};

						Object.assign(body, updateFields);

						responseData = await clockifyApiRequest.call(
							this,
							'PUT',
							`/workspaces/${workspaceId}/clients/${clientId}`,
							body,
							qs,
						);
					}

					if (operation === 'get') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const clientId = this.getNodeParameter('clientId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'GET',
							`/workspaces/${workspaceId}/clients/${clientId}`,
							{},
							qs,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						Object.assign(qs, additionalFields);

						if (returnAll) {
							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/clients`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;

							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/clients`,
								{},
								qs,
							);

							responseData = responseData.splice(0, qs.limit);
						}
					}
				}

				if (resource === 'project') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							name,
						};

						Object.assign(body, additionalFields);

						if (body.estimateUi) {
							body.estimate = (body.estimateUi as IDataObject).estimateValues;

							delete body.estimateUi;
						}

						responseData = await clockifyApiRequest.call(
							this,
							'POST',
							`/workspaces/${workspaceId}/projects`,
							body,
							qs,
						);
					}

					if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const projectId = this.getNodeParameter('projectId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'DELETE',
							`/workspaces/${workspaceId}/projects/${projectId}`,
							{},
							qs,
						);
					}

					if (operation === 'get') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const projectId = this.getNodeParameter('projectId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'GET',
							`/workspaces/${workspaceId}/projects/${projectId}`,
							{},
							qs,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						Object.assign(qs, additionalFields);

						if (returnAll) {
							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/projects`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;

							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/projects`,
								{},
								qs,
							);

							responseData = responseData.splice(0, qs.limit);
						}
					}

					if (operation === 'update') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const projectId = this.getNodeParameter('projectId', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						Object.assign(body, updateFields);

						if (body.estimateUi) {
							body.estimate = (body.estimateUi as IDataObject).estimateValues;

							delete body.estimateUi;
						}

						responseData = await clockifyApiRequest.call(
							this,
							'PUT',
							`/workspaces/${workspaceId}/projects/${projectId}`,
							body,
							qs,
						);
					}
				}

				if (resource === 'tag') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						const body: IDataObject = {
							name,
						};

						responseData = await clockifyApiRequest.call(
							this,
							'POST',
							`/workspaces/${workspaceId}/tags`,
							body,
							qs,
						);
					}

					if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const tagId = this.getNodeParameter('tagId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'DELETE',
							`/workspaces/${workspaceId}/tags/${tagId}`,
							{},
							qs,
						);

						responseData = { success: true };
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						Object.assign(qs, additionalFields);

						if (returnAll) {
							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/tags`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;

							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/tags`,
								{},
								qs,
							);

							responseData = responseData.splice(0, qs.limit);
						}
					}

					if (operation === 'update') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const tagId = this.getNodeParameter('tagId', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						Object.assign(body, updateFields);

						responseData = await clockifyApiRequest.call(
							this,
							'PUT',
							`/workspaces/${workspaceId}/tags/${tagId}`,
							body,
							qs,
						);
					}
				}

				if (resource === 'task') {
					if (operation === 'create') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const projectId = this.getNodeParameter('projectId', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							name,
						};

						Object.assign(body, additionalFields);

						if (body.estimate) {
							const [hour, minute] = (body.estimate as string).split(':');
							body.estimate = `PT${hour}H${minute}M`;
						}

						responseData = await clockifyApiRequest.call(
							this,
							'POST',
							`/workspaces/${workspaceId}/projects/${projectId}/tasks`,
							body,
							qs,
						);
					}

					if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const projectId = this.getNodeParameter('projectId', i) as string;

						const taskId = this.getNodeParameter('taskId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'DELETE',
							`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
							{},
							qs,
						);
					}

					if (operation === 'get') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const projectId = this.getNodeParameter('projectId', i) as string;

						const taskId = this.getNodeParameter('taskId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'GET',
							`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
							{},
							qs,
						);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const projectId = this.getNodeParameter('projectId', i) as string;

						const filters = this.getNodeParameter('filters', i) as IDataObject;

						Object.assign(qs, filters);

						if (returnAll) {
							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/projects/${projectId}/tasks`,
								{},
								qs,
							);
						} else {
							qs['page-size'] = this.getNodeParameter('limit', i) as number;

							responseData = await clockifyApiRequest.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/projects/${projectId}/tasks`,
								{},
								qs,
							);
						}
					}

					if (operation === 'update') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const projectId = this.getNodeParameter('projectId', i) as string;

						const taskId = this.getNodeParameter('taskId', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						Object.assign(body, updateFields);

						if (body.estimate) {
							const [hour, minute] = (body.estimate as string).split(':');
							body.estimate = `PT${hour}H${minute}M`;
						}

						responseData = await clockifyApiRequest.call(
							this,
							'PUT',
							`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
							body,
							qs,
						);
					}
				}

				if (resource === 'timeEntry') {
					if (operation === 'create') {
						const timezone = this.getTimezone();

						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const start = this.getNodeParameter('start', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body: IDataObject = {
							start: moment.tz(start, timezone).utc().format(),
						};

						Object.assign(body, additionalFields);

						if (body.end) {
							body.end = moment.tz(body.end, timezone).utc().format();
						}

						if (body.customFieldsUi) {
							const customFields = (body.customFieldsUi as IDataObject)
								.customFieldsValues as IDataObject[];

							body.customFields = customFields;
						}

						responseData = await clockifyApiRequest.call(
							this,
							'POST',
							`/workspaces/${workspaceId}/time-entries`,
							body,
							qs,
						);
					}

					if (operation === 'delete') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const timeEntryId = this.getNodeParameter('timeEntryId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'DELETE',
							`/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
							{},
							qs,
						);

						responseData = { success: true };
					}

					if (operation === 'get') {
						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const timeEntryId = this.getNodeParameter('timeEntryId', i) as string;

						responseData = await clockifyApiRequest.call(
							this,
							'GET',
							`/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
							{},
							qs,
						);
					}

					if (operation === 'update') {
						const timezone = this.getTimezone();

						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const timeEntryId = this.getNodeParameter('timeEntryId', i) as string;

						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						const body: IDataObject = {};

						Object.assign(body, updateFields);

						if (body.end) {
							body.end = moment.tz(body.end, timezone).utc().format();
						}

						if (body.start) {
							body.start = moment.tz(body.start, timezone).utc().format();
						} else {
							// even if you do not want to update the start time, it always has to be set
							// to make it more simple to the user, if he did not set a start time look for the current start time
							// and set it
							const {
								timeInterval: { start },
							} = await clockifyApiRequest.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
								{},
								qs,
							);

							body.start = start;
						}

						responseData = await clockifyApiRequest.call(
							this,
							'PUT',
							`/workspaces/${workspaceId}/time-entries/${timeEntryId}`,
							body,
							qs,
						);
					}
				}

				if (resource === 'user') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;

						const workspaceId = this.getNodeParameter('workspaceId', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						Object.assign(qs, additionalFields);

						if (returnAll) {
							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/users`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i) as number;

							responseData = await clockifyApiRequestAllItems.call(
								this,
								'GET',
								`/workspaces/${workspaceId}/users`,
								{},
								qs,
							);

							responseData = responseData.splice(0, qs.limit);
						}
					}
				}

				if (resource === 'workspace') {
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						responseData = await clockifyApiRequest.call(this, 'GET', '/workspaces', {}, qs);
						if (!returnAll) {
							qs.limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, qs.limit);
						}
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
