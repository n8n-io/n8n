import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import {
	asanaApiRequest,
} from './GenericFunctions';

export class Asana implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Asana',
		name: 'asana',
		icon: 'file:asana.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access and edit Asana tasks',
		defaults: {
			name: 'Asana',
			color: '#339922',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'asanaApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'task',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         task
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'task',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a task',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a task',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a task',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a task',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search for tasks',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         task:create
			// ----------------------------------
			{
				displayName: 'Workspace',
				name: 'workspace',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'The workspace to create the task in',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'The name of the task to create',
			},

			// ----------------------------------
			//         delete
			// ----------------------------------
			{
				displayName: 'Task ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'delete',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'The ID of the task to delete.',
			},

			// ----------------------------------
			//         get
			// ----------------------------------
			{
				displayName: 'Task ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'The ID of the task to get the data of.',
			},

			// ----------------------------------
			//         update
			// ----------------------------------
			{
				displayName: 'Task ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'update',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'The ID of the task to update the data of.',
			},


			// ----------------------------------
			//         search
			// ----------------------------------
			{
				displayName: 'Workspace',
				name: 'workspace',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'search',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'The workspace to create the task in',
			},
			{
				displayName: 'Search Properties',
				name: 'searchTaskProperties',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'search',
						],
						resource: [
							'task',
						],
					},
				},
				default: {},
				description: 'Properties to search for',
				placeholder: 'Add Search Property',
				options: [
					// TODO: Add "assignee" and "assignee_status"
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
							rows: 5,
						},
						default: '',
						description: 'Text to search for in name or notes.',
					},
					{
						displayName: 'Completed',
						name: 'completed',
						type: 'boolean',
						default: false,
						description: 'If the task is marked completed.',
					},
				],
			},

			// ----------------------------------
			//         create/update
			// ----------------------------------
			{
				displayName: 'Other Properties',
				name: 'otherProperties',
				type: 'collection',
				displayOptions: {
					show: {
						resource: [
							'task',
						],
						operation: [
							'create',
							'update',
						],
					},
				},
				default: {},
				description: 'Other properties to set',
				placeholder: 'Add Property',
				options: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						displayOptions: {
							show: {
								'/operation': [
									'update',
								],
							},
						},
						description: 'The new name of the task',
					},
					// TODO: Add "assignee" and "assignee_status"
					{
						displayName: 'Notes',
						name: 'notes',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
							rows: 5,
						},
						default: '',
						description: 'The task notes',
					},
					{
						displayName: 'Completed',
						name: 'completed',
						type: 'boolean',
						default: false,
						description: 'If the task should be marked completed.',
					},
					{
						displayName: 'Due On',
						name: 'due_on',
						type: 'dateTime',
						default: '',
						description: 'Date on which the time is due.',
					},
					{
						displayName: 'Liked',
						name: 'liked',
						type: 'boolean',
						default: false,
						description: 'If the task is liked by the authorized user.',
					},
				],
			},



			// ----------------------------------
			//         user
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'user',
						],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get data of all users',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get data of a user',
					},
				],
				default: 'get',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         user:get
			// ----------------------------------
			{
				displayName: 'Id',
				name: 'userId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'user',
						],
					},
				},
				description: 'An identifier for the user to get data of. Can be one of an<br />email address,the globally unique identifier for the user,<br />or the keyword me to indicate the current user making the request.',
			},

			// ----------------------------------
			//         user:getAll
			// ----------------------------------
			{
				displayName: 'Workspace',
				name: 'workspace',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getWorkspaces',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'user',
						],
					},
				},
				description: 'The workspace in which to get users.',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available workspaces to display them to user so that he can
			// select them easily
			async getWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = 'workspaces';
				const responseData = await asanaApiRequest.call(this, 'GET', endpoint, {});

				if (responseData.data === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const workspaceData of responseData.data) {
					if (workspaceData.resource_type !== 'workspace') {
						// Not sure if for some reason also ever other resources
						// get returned but just in case filter them out
						continue;
					}

					returnData.push({
						name: workspaceData.name,
						value: workspaceData.gid,
					});
				}

				return returnData;
			}
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const credentials = this.getCredentials('asanaApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';

		let body: IDataObject;
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			body = {};
			qs = {};

			if (resource === 'task') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = 'tasks';

					body.name = this.getNodeParameter('name', i) as string;
					// body.notes = this.getNodeParameter('taskNotes', 0) as string;
					body.workspace = this.getNodeParameter('workspace', i) as string;

					const otherProperties = this.getNodeParameter('otherProperties', i) as IDataObject;
					Object.assign(body, otherProperties);

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					endpoint = 'tasks/' + this.getNodeParameter('id', i) as string;

				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					endpoint = 'tasks/' + this.getNodeParameter('id', i) as string;

				} else if (operation === 'update') {
					// ----------------------------------
					//         update
					// ----------------------------------

					requestMethod = 'PUT';
					endpoint = 'tasks/' + this.getNodeParameter('id', i) as string;

					const otherProperties = this.getNodeParameter('otherProperties', i) as IDataObject;
					Object.assign(body, otherProperties);

				} else if (operation === 'search') {
					// ----------------------------------
					//         search
					// ----------------------------------

					const workspaceId = this.getNodeParameter('workspace', i) as string;

					requestMethod = 'GET';
					endpoint = `workspaces/${workspaceId}/tasks/search`;

					const searchTaskProperties = this.getNodeParameter('searchTaskProperties', i) as IDataObject;
					Object.assign(qs, searchTaskProperties);

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else if (resource === 'user') {
				if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					const userId = this.getNodeParameter('userId', i) as string;

					requestMethod = 'GET';
					endpoint = `users/${userId}`;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         getAll
					// ----------------------------------

					const workspaceId = this.getNodeParameter('workspace', i) as string;

					requestMethod = 'GET';
					endpoint = `workspaces/${workspaceId}/users`;

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}
			const responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body);

			returnData.push(responseData.data as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
