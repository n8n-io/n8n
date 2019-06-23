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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create Task',
						value: 'createTask',
						description: 'Creates a task',
					},
					{
						name: 'Delete Task',
						value: 'deleteTask',
						description: 'Delete a task',
					},
					{
						name: 'Get Task',
						value: 'getTask',
						description: 'Get data of task',
					},
					{
						name: 'Update Task',
						value: 'updateTask',
						description: 'Update a task',
					},
					{
						name: 'Search For Tasks',
						value: 'searchForTasks',
						description: 'Search Tasks',
					},
				],
				default: 'createTask',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         createTask
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
							'createTask',
						],
					},
				},
				description: 'The workspace to create the task in',
			},
			{
				displayName: 'Name',
				name: 'taskName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'createTask',
						],
					},
				},
				description: 'The name of the task to create',
			},

			// ----------------------------------
			//         deleteTask
			// ----------------------------------
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'deleteTask',
						],
					},
				},
				description: 'The ID of the task to delete.',
			},

			// ----------------------------------
			//         getTask
			// ----------------------------------
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getTask',
						],
					},
				},
				description: 'The ID of the task to get the data of.',
			},

			// ----------------------------------
			//         updateTask
			// ----------------------------------
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'updateTask',
						],
					},
				},
				description: 'The ID of the task to update the data of.',
			},


			// ----------------------------------
			//         searchForTasks
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
							'searchForTasks',
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
							'searchForTasks',
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
			//         createTask/updateTask
			// ----------------------------------
			{
				displayName: 'Other Properties',
				name: 'otherProperties',
				type: 'collection',
				displayOptions: {
					hide: {
						operation: [
							'deleteTask',
							'getTask',
							'searchForTasks',
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
									'updateTask',
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

		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';

		let body: IDataObject;
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			body = {};
			qs = {};

			if (operation === 'createTask') {
				// ----------------------------------
				//         createTask
				// ----------------------------------

				requestMethod = 'POST';
				endpoint = 'tasks';
				// endpoint = this.getNodeParameter('folderCreate', i) as string;

				body.name = this.getNodeParameter('taskName', 0) as string;
				// body.notes = this.getNodeParameter('taskNotes', 0) as string;
				body.workspace = this.getNodeParameter('workspace', 0) as string;

				const otherProperties = this.getNodeParameter('otherProperties', i) as IDataObject;
				Object.assign(body, otherProperties);

			} else if (operation === 'deleteTask') {
				// ----------------------------------
				//         deleteTask
				// ----------------------------------

				requestMethod = 'DELETE';
				endpoint = 'tasks/' + this.getNodeParameter('taskId', i) as string;

			} else if (operation === 'getTask') {
				// ----------------------------------
				//         getTask
				// ----------------------------------

				requestMethod = 'GET';
				endpoint = 'tasks/' + this.getNodeParameter('taskId', i) as string;

			} else if (operation === 'updateTask') {
				// ----------------------------------
				//         getTask
				// ----------------------------------

				requestMethod = 'PUT';
				endpoint = 'tasks/' + this.getNodeParameter('taskId', i) as string;



				const otherProperties = this.getNodeParameter('otherProperties', i) as IDataObject;
				Object.assign(body, otherProperties);

			} else if (operation === 'searchForTasks') {
				// ----------------------------------
				//         searchForTasks
				// ----------------------------------

				const workspaceId = this.getNodeParameter('workspace', i) as string;

				requestMethod = 'GET';
				endpoint = `workspaces/${workspaceId}/tasks/search`;

				const searchTaskProperties = this.getNodeParameter('searchTaskProperties', i) as IDataObject;
				Object.assign(qs, searchTaskProperties);
			} else {
				throw new Error(`The operation "${operation}" is not known!`);
			}

			const responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body);

			returnData.push(responseData.data as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
