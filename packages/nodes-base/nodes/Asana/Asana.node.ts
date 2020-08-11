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
	asanaApiRequestAllItems,
} from './GenericFunctions';

export class Asana implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Asana',
		name: 'asana',
		icon: 'file:asana.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Asana REST API',
		defaults: {
			name: 'Asana',
			color: '#FC636B',
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
					{
						name: 'Project',
						value: 'project',
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
					{
						name: 'Move',
						value: 'moveToSection',
						description: 'Move task to section',
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
			//         task:delete
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
			//         task:get
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
			//         task:update
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
			//         task:search
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
				description: 'The workspace in which the task is searched',
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
			//         task:move to section
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
							'moveToSection',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'The ID of the task to be moved.',
			},
			{
				displayName: 'Project',
				name: 'projectId',
				type: "options",
				typeOptions: {
					loadOptionsMethod: 'getProjects',
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'moveToSection',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'Project to show the sections of.',
			},
			{
				displayName: 'Section',
				name: 'section',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSections',
					loadOptionsDependsOn: [
						'projectId',
					],
				},
				options: [],
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'moveToSection',
						],
						resource: [
							'task',
						],
					},
				},
				description: 'The Section to move the task to',
			},

			// ----------------------------------
			//         task:create/update properties
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
				displayName: 'ID',
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


			// ----------------------------------
			//         project
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'project',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get a project',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all projects',
					},
				],
				default: 'get',
				description: 'The operation to perform',
			},

			// ----------------------------------
			//         project:get
			// ----------------------------------
			{
				displayName: 'Project Id',
				name: 'projectId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'project',
						],
					},
				},
				description: 'Globally unique identifier for the project',
			},

			// ----------------------------------
			//         project:getAll
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
							'project',
						],
					},
				},
				description: 'The workspace to filter projects on.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'project',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: [
							'getAll',
						],
						resource: [
							'project',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				default: 100,
				description: 'How many results to return.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				displayOptions: {
					show: {
						resource: [
							'project',
						],
						operation: [
							'getAll',
						],
					},
				},
				default: {},
				description: 'Other properties to set',
				placeholder: 'Add Property',
				options: [
					{
						displayName: 'Archived',
						name: 'archived',
						type: 'boolean',
						default: false,
						description: 'Only return projects whose archived field takes on the value of this parameter.',
					},
					{
						displayName: 'Teams',
						name: 'team',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: [
								'workspace',
							],
							loadOptionsMethod: 'getTeams',
						},
						default: '',
						description: 'The team to filter projects on',
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
				const endpoint = '/workspaces';
				const responseData = await asanaApiRequest.call(this, 'GET', endpoint, {});

				if (responseData.data === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const workspaceData of responseData) {
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
			},
			// Get all available teams to display them to user so that they can be selected easily
			// See: https://developers.asana.com/docs/get-teams-in-an-organization
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const workspaceId = this.getCurrentNodeParameter('workspace') as string;
				const workspace = await asanaApiRequest.call(this, 'GET', `/workspaces/${workspaceId}`, {});

				// if the workspace selected is not an organization then error as the endpoint
				// to retrieve the teams from an organization just work with workspaces that are an organization

				if (workspace.is_organization === false) {
					throw Error('To filter by team, the workspace selected has to be an organization');
				}

				const endpoint = `/organizations/${workspaceId}/teams`;
				const responseData = await asanaApiRequestAllItems.call(this, 'GET', endpoint, {});

				const returnData: INodePropertyOptions[] = [];
				for (const teamData of responseData) {
					if (teamData.resource_type !== 'team') {
						// Not sure if for some reason also ever other resources
						// get returned but just in case filter them out
						continue;
					}

					returnData.push({
						name: teamData.name,
						value: teamData.gid,
					});
				}

				return returnData;
			},

			// Get all the available projects to display them to user so that they can be
			// selected easily
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = '/projects';
				const responseData = await asanaApiRequest.call(this, 'GET', endpoint, {});

				if (responseData.data === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const projectData of responseData) {
					if (projectData.resource_type !== 'project') {
						// Not sure if for some reason also ever other resources
						// get returned but just in case filter them out
						continue;
					}

					returnData.push({
						name: projectData.name,
						value: projectData.gid,
					});
				}

				return returnData;
			},
			// Get all the available sections in a project to display them to user so that they
			// can be selected easily
			async getSections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const projectId = this.getCurrentNodeParameter('projectId') as string;
				const endpoint = `projects/${projectId}/sections`;
				const responseData = await asanaApiRequest.call(this, 'GET', endpoint, {});

				if (responseData.data === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const sectionData of responseData.data) {
					if (sectionData.resource_type !== 'section') {
						// Not sure if for some reason also ever other resources
						// get returned but just in case filter them out
						continue;
					}

					returnData.push({
						name: sectionData.name,
						value: sectionData.gid,
					});
				}

				return returnData;
			},
			// Get all users to display them to user so that they can be selected easily
			// See: https://developers.asana.com/docs/get-multiple-users
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = `users`;
				const responseData = await asanaApiRequest.call(this, 'GET', endpoint, {});

				if (responseData.data === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const userData of responseData.data) {
					if (userData.resource_type !== 'user') {
						// Not sure if for some reason also ever other resources
						// get returned but just in case filter them out
						continue;
					}

					returnData.push({
						name: userData.name,
						value: userData.gid,
					});
				}

				return returnData;
			},
			// Get all tags to display them to user so that they can be selected easily
			// See: https://developers.asana.com/docs/get-multiple-tags
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const endpoint = `tags`;
				const responseData = await asanaApiRequest.call(this, 'GET', endpoint, {});

				if (responseData.data === undefined) {
					throw new Error('No data got returned');
				}

				const returnData: INodePropertyOptions[] = [];
				for (const tagData of responseData.data) {
					if (tagData.resource_type !== 'tag') {
						// Not sure if for some reason also ever other resources
						// get returned but just in case filter them out
						continue;
					}

					returnData.push({
						name: tagData.name,
						value: tagData.gid,
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
		let responseData;

		for (let i = 0; i < items.length; i++) {
			body = {};
			qs = {};

			if (resource === 'task') {
				if (operation === 'create') {
					// ----------------------------------
					//         create
					// ----------------------------------

					requestMethod = 'POST';
					endpoint = '/tasks';

					body.name = this.getNodeParameter('name', i) as string;
					// body.notes = this.getNodeParameter('taskNotes', 0) as string;
					body.workspace = this.getNodeParameter('workspace', i) as string;

					const otherProperties = this.getNodeParameter('otherProperties', i) as IDataObject;
					Object.assign(body, otherProperties);

					responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);
					responseData = responseData.data;

				} else if (operation === 'delete') {
					// ----------------------------------
					//         delete
					// ----------------------------------

					requestMethod = 'DELETE';
					endpoint = '/tasks/' + this.getNodeParameter('id', i) as string;

					responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = responseData.data;

				} else if (operation === 'get') {
					// ----------------------------------
					//         get
					// ----------------------------------

					requestMethod = 'GET';
					endpoint = '/tasks/' + this.getNodeParameter('id', i) as string;

				} else if (operation === 'move') {
					// ----------------------------------
					//         task:move
					// ----------------------------------

					const sectionId = this.getNodeParameter('section', i) as string;

					requestMethod = 'POST';

					endpoint = `/sections/${sectionId}/addTask`;

					body.task = this.getNodeParameter('id', i) as string;

					Object.assign(body);

					responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = { success: true };

				} else if (operation === 'update') {
					// ----------------------------------
					//         task:update
					// ----------------------------------

					requestMethod = 'PUT';
					endpoint = '/tasks/' + this.getNodeParameter('id', i) as string;

					const otherProperties = this.getNodeParameter('otherProperties', i) as IDataObject;
					Object.assign(body, otherProperties);

					responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = responseData.data;

				} else if (operation === 'search') {
					// ----------------------------------
					//         task:search
					// ----------------------------------

					const workspaceId = this.getNodeParameter('workspace', i) as string;

					requestMethod = 'GET';
					endpoint = `/workspaces/${workspaceId}/tasks/search`;

					const searchTaskProperties = this.getNodeParameter('searchTaskProperties', i) as IDataObject;
					Object.assign(qs, searchTaskProperties);

					responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = responseData.data;

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else if (resource === 'user') {
				if (operation === 'get') {
					// ----------------------------------
					//         user:get
					// ----------------------------------

					const userId = this.getNodeParameter('userId', i) as string;

					requestMethod = 'GET';
					endpoint = `/users/${userId}`;

					responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);
					responseData = responseData.data;

				} else if (operation === 'getAll') {
					// ----------------------------------
					//         user:getAll
					// ----------------------------------

					const workspaceId = this.getNodeParameter('workspace', i) as string;

					requestMethod = 'GET';
					endpoint = `/workspaces/${workspaceId}/users`;

					responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);
					responseData = responseData.data;

				}
			} else if (resource === 'project') {

				if (operation === 'get') {
					// ----------------------------------
					//         project:get
				 	// ----------------------------------

				 	const projectId = this.getNodeParameter('projectId', i) as string;

					requestMethod = 'GET';

					endpoint = `projects/${projectId}`;

					responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);

					responseData = responseData.data;

				} else if (operation === 'getAll') {

					// ----------------------------------
					//         getAll
					// ----------------------------------
					const workspaceId = this.getNodeParameter('workspace', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					requestMethod = 'GET';
					endpoint = `/projects`;

					if (additionalFields.team) {
						qs.team = additionalFields.team;
					} else {
						qs.workspace = workspaceId;
					}

					if (additionalFields.archived) {
						qs.archived = additionalFields.archived as boolean;
					}

					if (returnAll) {
						responseData = await asanaApiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
					} else {
						qs.limit = this.getNodeParameter('limit', i) as boolean;
						responseData = await asanaApiRequest.call(this, requestMethod, endpoint, body, qs);
						responseData = responseData.data;
					}
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
