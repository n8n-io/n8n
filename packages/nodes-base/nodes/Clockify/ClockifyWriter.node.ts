import {IExecuteFunctions} from 'n8n-core';
import {
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	INodeParameters,
} from 'n8n-workflow';

import {
	clockifyApiRequest, createProject, findProjectByName, findTagByName, createTag, createTimeEntry
} from './GenericFunctions';

import {IClientDto, IWorkspaceDto} from "./WorkpaceInterfaces";
import {IUserDto} from "./UserDtos";
import {IProjectDto, ITaskDto} from "./ProjectInterfaces";
import {ITagDto} from "./CommonDtos";
import {ITimeEntryRequest} from "./TimeEntryInterfaces";
import {isArray} from "util";


export class ClockifyWriter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clockify',
		name: 'clockifyWriter',
		icon: 'file:clockify.png',
		group: ['transform'],
		version: 1,
		description: 'Access data on Clockify',
		defaults: {
			name: 'Clockify',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'clockifyApi',
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
						name: 'Create',
						value: 'create'
					},
				],
				default: 'create',
				description: 'The operation you wish to carry out.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Project',
						value: 'project'
					},
					{
						name: 'Tag',
						value: 'tag'
					},
					{
						name: 'Time Entry',
						value: 'timeEntry'
					},
				],
				default: 'project',
				description: 'The resource to operate on.',
			},
			{
				displayName: 'Workspace',
				name: 'workspaceId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'listWorkspaces',
				},
				required: true,
				default: [],
			},
			{
				displayName: 'User',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadUsersForWorkspace',
				},
				required: true,
				default: [],
				displayOptions: {
					show: {
						resource: [
							'timeEntry',
						],
					},
				},
			},
			{
				displayName: 'Client',
				name: 'clientId',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadClientsForWorkspace',
				},
				required: true,
				default: [],
			},
			{
				displayName: 'Project',
				name: 'project',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadProjectsForWorkspace',
				},
				required: true,
				default: [],
				description: 'Project to associate with, leaving blank will use the project associated with the task.',
				displayOptions: {
					hide: {
						resource: [
							'project',
							'tag',
						],
					},
				}
			},
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				required: true,
				default: false,
				displayOptions: {
					hide: {
						resource: [
							'tag',
						],
					},
				}
			},
			//Project Properties
			{
				displayName: 'Project Name',
				name: 'projectName',
				type: 'string',
				required: true,
				default: '',
				description: 'Name of project being created.',
				displayOptions: {
					show: {
						resource: [
							'project',
						],
					},
				}
			},
			{
				displayName: 'Project Color',
				name: 'color',
				type: "color",
				required: true,
				default: '#0000FF',
				displayOptions: {
					show: {
						resource: [
							'project',
						],
					},
				}
			},
			{
				displayName: 'Public',
				name: 'isPublic',
				type: 'boolean',
				required: true,
				default: false,
				displayOptions: {
					show: {
						resource: [
							'project',
						],
					},
				}
			},
			{
				displayName: 'Note',
				name: 'projectNote',
				type: 'string',
				required: false,
				default: '',
				description: 'Note about the project. (OPTIONAL)',
				displayOptions: {
					show: {
						resource: [
							'project',
						],
					},
				}
			},
			//Tag Properties
			{
				displayName: 'Tag Name',
				name: 'tagName',
				type: 'string',
				required: true,
				default: '',
				description: 'Name of tag being created.',
				displayOptions: {
					show: {
						resource: [
							'tag',
						],
					},
				},
			},
			//Time Entry Properties
			{
				displayName: "Task",
				name: 'taskId',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['project'],
					loadOptionsMethod: 'loadTasksForProject',
				},
				required: false,
				default: [],
				displayOptions: {
					show: {
						resource: [
							'timeEntry',
						],
					},
				},
			},
			{
				displayName: "Tags",
				name: 'tagIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadTagsForWorkspace',
				},
				required: false,
				default: [],
				displayOptions: {
					show: {
						resource: [
							'timeEntry',
						],
					},
				},
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: [
							'timeEntry',
						],
					},
				},
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: [
							'timeEntry',
						],
					},
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: '',
				displayOptions: {
					show: {
						resource: [
							'timeEntry',
						],
					},
				},
			},

		]
	};

	methods = {
		loadOptions: {
			async listWorkspaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rtv: INodePropertyOptions[] = [];
				const workspaces: IWorkspaceDto[] = await clockifyApiRequest.call(this, 'GET', 'workspaces');
				if (undefined !== workspaces) {
					workspaces.forEach(value => {
						rtv.push(
							{
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
						users.forEach(value => {
							rtv.push(
								{
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
						clients.forEach(value => {
							rtv.push(
								{
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
						users.forEach(value => {
							rtv.push(
								{
									name: value.name,
									value: value.name,
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
					const users: ITagDto[] = await clockifyApiRequest.call(this, 'GET', resource);
					if (undefined !== users) {
						users.forEach(value => {
							rtv.push(
								{
									name: value.name,
									value: value.id,
								});
						});
					}
				}
				return rtv;
			},
			async loadTasksForProject(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const rtv: INodePropertyOptions[] = [];
				const workspaceId = this.getCurrentNodeParameter('workspaceId') as number;
				const projectName = this.getCurrentNodeParameter('project') as string;
				const clientId = this.getCurrentNodeParameter('clientId') as string;

				const project = await findProjectByName.call(this, workspaceId, projectName, clientId);
				if (undefined !== project) {
					const resource = `workspaces/${workspaceId}/projects/${(project as IProjectDto).id}/tasks`;
					const tasks: ITaskDto[] = await clockifyApiRequest.call(this, 'GET', resource);
					if (undefined !== tasks) {
						tasks.forEach(value => {
							rtv.push(
								{
									name: value.name,
									value: value.id,
								});
						});
					}
				}
				return rtv;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {

		const items = this.getInputData();
		const result: any[] = []
		// Itterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		//  (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const currWorkspaceId = this.getNodeParameter('workspaceId', itemIndex) as number;
			const currClientId = this.getNodeParameter('clientId', itemIndex) as string;
			const operation = this.getNodeParameter('operation', itemIndex) as string;
			const resource = this.getNodeParameter('resource', itemIndex) as string;
			if ( resource === 'project' ) {
				const isBillable = this.getNodeParameter('billable', itemIndex) as boolean;
				const projectName = this.getNodeParameter('projectName', itemIndex) as string;
				const isPublic = this.getNodeParameter('isPublic', itemIndex) as boolean;
				const projectNote = this.getNodeParameter('projectNote', itemIndex) as string;
				let project = await findProjectByName.call(this, currWorkspaceId, projectName, currClientId);

				if ( operation === 'create' && !project) {
					project = {
						clientName: "",
						color: this.getNodeParameter('color', itemIndex) as string,
						duration: "",
						estimate: undefined,
						hourlyRate: undefined,
						id: "",
						memberships: undefined,
						name: projectName,
						isPublic: isPublic,
						archived: false,
						billable: isBillable,
						clientId: currClientId,
						workspaceId: currWorkspaceId.toString(),
						note: projectNote,
					};

					result.push(await createProject.call(this, project));
				}else if ( operation === 'update' ) {

				}else if ( operation === 'delete' ) {

				}else {
					result.push(project);
				}
			} else if( resource === 'tag'){
				const tagName = this.getNodeParameter('tagName', itemIndex) as [];
				let tagsArr : ITagDto[] = [];
				if (!tagName){
					continue;
				}else if(!isArray(tagName)){
					let tag = {
						id: "",
						name: tagName,
						workspaceId: currWorkspaceId.toString(),
						archived: false
					}
					tagsArr.push(tag);
				}else{
					tagsArr = tagName;
				}

				for(let index = 0; index < tagsArr.length; index++){
					let tag = await findTagByName.call(this, currWorkspaceId, tagsArr[index].name);
	
					if ( operation === 'create' && !tag) {
						tag = {
							id: "",
							name: tagsArr[index].name,
							workspaceId: currWorkspaceId.toString(),
							archived: false
						}

						result.push(await createTag.call(this, tag));
					}else if ( operation === 'update' ) {

					}else if ( operation === 'delete' ) {

					}else{
						result.push(tag);
					}
				}
			} else if( resource === 'timeEntry'){
				const isBillable = this.getNodeParameter('billable', itemIndex) as boolean;
				const currProject = this.getNodeParameter('project', itemIndex) as string;
				let project = await findProjectByName.call(this, currWorkspaceId, currProject, currClientId);
				let timeEntryRequest : ITimeEntryRequest;

				if ( operation === 'create' ) {
					const currProjectId = (project as IProjectDto).id;

					timeEntryRequest = {
						id: '',
						description: this.getNodeParameter('description', itemIndex) as string,
						billable: isBillable,
						projectId: currProjectId,
						isLocked: false,
						userId: this.getNodeParameter('userId', itemIndex) as string,
						tagIds: [],
						workspaceId: this.getNodeParameter('workspaceId', itemIndex) as string,
						start: this.getNodeParameter('start', itemIndex) as string,
						end: this.getNodeParameter('end', itemIndex) as string,
						timeInterval: {
							start: this.getNodeParameter('start', itemIndex) as string,
							end: this.getNodeParameter('end', itemIndex) as string,
						},
					};

					const currTagIds :ITagDto[] = this.getNodeParameter('tagIds', itemIndex, []) as ITagDto[];
					const currTaskId = this.getNodeParameter('taskId', itemIndex, undefined) as string;
					if ( currTagIds && currTagIds.length !== 0){
						for(let index = 0; index < currTagIds.length; index++){
							let tag = await findTagByName.call(this, currWorkspaceId, currTagIds[index].name);
							if( tag ) {
								timeEntryRequest.tagIds?.push(tag.id);
							}
						}
					}
					if( currTaskId ) {
						timeEntryRequest.taskId = currTaskId as string;
					}
					result.push(await createTimeEntry.call(this, timeEntryRequest));
				}else if ( operation === 'update' ) {

				}else if ( operation === 'delete' ) {

				}
			}
		}
		return [this.helpers.returnJsonArray(result)];
	}
}
