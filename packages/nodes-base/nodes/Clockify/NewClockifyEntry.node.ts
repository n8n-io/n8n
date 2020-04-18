import {IExecuteFunctions, IExecuteSingleFunctions} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData, INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	clockifyApiRequest, createProject, findProjectByName,
} from './GenericFunctions';

import {IClientDto, IWorkspaceDto} from "./WorkpaceInterfaces";
import {IUserDto} from "./UserDtos";
import {runInThisContext} from "vm";
import {IProjectDto, ITaskDto} from "./ProjectInterfaces";
import {ITagDto} from "./CommonDtos";
import {ITimeEntryDto, ITimeEntryRequest} from "./TimeEntryInterfaces";
import {stringify} from "querystring";
import {callbackify} from "util";

export class NewClockifyEntry implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'New Clockify Entry',
		name: 'newClockifyEntry',
		icon: 'file:clockify.png',
		group: ['transform'],
		version: 1,
		description: 'Adds a new clockify time entry',
		defaults: {
			name: 'New Clockify Entry',
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
				name: 'projectName',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadProjectsForWorkspace',
				},
				required: true,
				default: [],
				description: 'Project to associate with, leaving blank will use the project associated with the task',
			},
			{
				displayName: 'Project Color',
				name: 'color',
				type: "string",
				required: false,
				default: '#0000FF'
			},
			{
				displayName: "Task",
				name: 'taskId',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: ['projectName'],
					loadOptionsMethod: 'loadTasksForProject',
				},
				required: false,
				default: [],
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
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				required: true,
				default: '',
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				required: true,
				default: '',
			},
			{
				displayName: 'Billable?',
				name: 'billable',
				type: 'boolean',
				required: true,
				default: false,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				required: false,
				default: ''
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
				const projectName = this.getCurrentNodeParameter('projectName') as string;
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const timeEntries : INodeExecutionData[] = [];
		let timeEntryRequest : ITimeEntryRequest;
		// Itterates over all input items and add the key "myString" with the
		// value the parameter "myString" resolves to.
		//  (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const currWorkspaceId = this.getNodeParameter('workspaceId', itemIndex) as number;
			const isBillable = this.getNodeParameter('billable', itemIndex) as boolean;
			const projectName = this.getNodeParameter('projectName', itemIndex) as string;
			const currClientId = this.getNodeParameter('clientId', itemIndex) as string;
			let project = await findProjectByName.call(this, currWorkspaceId, projectName, currClientId);
			if ( project === undefined ||  (project as IProjectDto).id === undefined) {
				project = {
					clientName: "",
					color: this.getNodeParameter('color', itemIndex, '#FFFFFF') as string,
					duration: "",
					estimate: undefined,
					hourlyRate: undefined,
					id: "",
					memberships: undefined,
					name: projectName,
					public: false,
					archived: false,
					billable: isBillable,
					clientId: currClientId,
					workspaceId: currWorkspaceId.toString(),
				};
				project = await createProject.call(this, project);
				console.log(`Project Created: ${project}`);
			}

			const currProjectId = (project as IProjectDto).id;

			timeEntryRequest = {
				id: '',
				description: this.getNodeParameter('description', itemIndex) as string,
				billable: isBillable,
				projectId: currProjectId,
				isLocked: false,
				userId: this.getNodeParameter('userId', itemIndex) as string,
				workspaceId: this.getNodeParameter('workspaceId', itemIndex) as string,
				start: this.getNodeParameter('start', itemIndex) as string,
				end: this.getNodeParameter('end', itemIndex) as string,
				timeInterval: {
					start: this.getNodeParameter('start', itemIndex) as string,
					end: this.getNodeParameter('end', itemIndex) as string,
				},
			};

			const currTagIds = this.getNodeParameter('tagIds', itemIndex, []) as string[];
			const currTaskId = this.getNodeParameter('taskId', itemIndex, undefined) as string;
			if (currTagIds.length !== 0){
				timeEntryRequest.tagIds = currTagIds;
			}
			if( currTaskId.length !== 0) {
				timeEntryRequest.taskId = currTaskId as string;
			}
			const timeEntry : INodeExecutionData = await clockifyApiRequest.call(this, 'POST', `workspaces/${currWorkspaceId}/time-entries`, timeEntryRequest);
			timeEntries.push(timeEntry);
		}
		return this.prepareOutputData(timeEntries);
	}
}
