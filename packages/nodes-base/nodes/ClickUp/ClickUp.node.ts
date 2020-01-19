import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	clickupApiRequest,
} from './GenericFunctions';
import {
	taskFields,
	taskOperations
} from './TaskDescription';
import {
	ITask,
 } from './TaskInterface';

export class ClickUp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ClickUp',
		name: 'clickUp',
		icon: 'file:clickup.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Consume ClickUp API (Beta)',
		defaults: {
			name: 'ClickUp',
			color: '#7B68EE',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'clickUpApi',
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
				],
				default: 'task',
				description: 'Resource to consume.',
			},
			...taskOperations,
			...taskFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available teams to display them to user so that he can
			// select them easily
			async getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { teams } = await clickupApiRequest.call(this, 'GET', '/team');
				for (const team of teams) {
					const teamName = team.name;
					const teamId = team.id;
					returnData.push({
						name: teamName,
						value: teamId,
					});
				}
				return returnData;
			},
			// Get all the available spaces to display them to user so that he can
			// select them easily
			async getSpaces(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const teamId = this.getCurrentNodeParameter('team') as string;
				const returnData: INodePropertyOptions[] = [];
				const { spaces } = await clickupApiRequest.call(this, 'GET', `/team/${teamId}/space`);
				for (const space of spaces) {
					const spaceName = space.name;
					const spaceId = space.id;
					returnData.push({
						name: spaceName,
						value: spaceId,
					});
				}
				return returnData;
			},
			// Get all the available folders to display them to user so that he can
			// select them easily
			async getFolders(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spaceId = this.getCurrentNodeParameter('space') as string;
				const returnData: INodePropertyOptions[] = [];
				const { folders } = await clickupApiRequest.call(this, 'GET', `/space/${spaceId}/folder`);
				for (const folder of folders) {
					const folderName = folder.name;
					const folderId = folder.id;
					returnData.push({
						name: folderName,
						value: folderId,
					});
				}
				return returnData;
			},
			// Get all the available lists to display them to user so that he can
			// select them easily
			async getLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const folderId = this.getCurrentNodeParameter('folder') as string;
				const returnData: INodePropertyOptions[] = [];
				const { lists } = await clickupApiRequest.call(this, 'GET', `/folder/${folderId}/list`);
				for (const list of lists) {
					const listName = list.name;
					const listId = list.id;
					returnData.push({
						name: listName,
						value: listId,
					});
				}
				return returnData;
			},
			// Get all the available assignees to display them to user so that he can
			// select them easily
			async getAssignees(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const listId = this.getCurrentNodeParameter('list') as string;
				const returnData: INodePropertyOptions[] = [];
				const { members } = await clickupApiRequest.call(this, 'GET', `/list/${listId}/member`);
				for (const member of members) {
					const memberName = member.username;
					const menberId = member.id;
					returnData.push({
						name: memberName,
						value: menberId,
					});
				}
				return returnData;
			},
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spaceId = this.getCurrentNodeParameter('space') as string;
				const returnData: INodePropertyOptions[] = [];
				const { tags } = await clickupApiRequest.call(this, 'GET', `/space/${spaceId}/tag`);
				for (const tag of tags) {
					const tagName = tag.name;
					const tagId = tag.id;
					returnData.push({
						name: tagName,
						value: tagId,
					});
				}
				return returnData;
			},
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const listId = this.getCurrentNodeParameter('list') as string;
				const returnData: INodePropertyOptions[] = [];
				const { statuses } = await clickupApiRequest.call(this, 'GET', `/list/${listId}`);
				for (const status of statuses) {
					const statusName = status.status;
					const statusId = status.status;
					returnData.push({
						name: statusName,
						value: statusId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'task') {
				if (operation === 'create') {
					const listId = this.getNodeParameter('list', i) as string;
					const name = this.getNodeParameter('name', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					const body: ITask = {
							name,
					};
					if (additionalFields.content) {
						body.content = additionalFields.content as string;
					}
					if (additionalFields.assignees) {
						body.assignees = additionalFields.assignees as string[];
					}
					if (additionalFields.tags) {
						body.tags = additionalFields.tags as string[];
					}
					if (additionalFields.status) {
						body.status = additionalFields.status as string;
					}
					if (additionalFields.priority) {
						body.priority = additionalFields.priority as number;
					}
					if (additionalFields.dueDate) {
						body.due_date = new Date(additionalFields.dueDate as string).getTime();
					}
					if (additionalFields.dueDateTime) {
						body.due_date_time = additionalFields.dueDateTime as boolean;
					}
					if (additionalFields.timeEstimate) {
						body.time_estimate = (additionalFields.timeEstimate as number) * 6000;
					}
					if (additionalFields.startDate) {
						body.start_date = new Date(additionalFields.startDate as string).getTime();
					}
					if (additionalFields.startDateTime) {
						body.start_date_time = additionalFields.startDateTime as boolean;
					}
					if (additionalFields.notifyAll) {
						body.notify_all = additionalFields.notifyAll as boolean;
					}
					if (additionalFields.parentId) {
						body.parent = additionalFields.parentId as string;
					}
					if (additionalFields.markdownContent) {
						delete body.content;
						body.markdown_content = additionalFields.content as string;
					}

					responseData = await clickupApiRequest.call(this, 'POST', `/list/${listId}/task`, body);
				}
				if (operation === 'update') {
					const taskId = this.getNodeParameter('id', i) as string;
					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;
					const body: ITask = {};
					if (updateFields.content) {
						body.content = updateFields.content as string;
					}
					if (updateFields.priority) {
						body.priority = updateFields.priority as number;
					}
					if (updateFields.dueDate) {
						body.due_date = new Date(updateFields.dueDate as string).getTime();
					}
					if (updateFields.dueDateTime) {
						body.due_date_time = updateFields.dueDateTime as boolean;
					}
					if (updateFields.timeEstimate) {
						body.time_estimate = (updateFields.timeEstimate as number) * 6000;
					}
					if (updateFields.startDate) {
						body.start_date = new Date(updateFields.startDate as string).getTime();
					}
					if (updateFields.startDateTime) {
						body.start_date_time = updateFields.startDateTime as boolean;
					}
					if (updateFields.notifyAll) {
						body.notify_all = updateFields.notifyAll as boolean;
					}
					if (updateFields.name) {
						body.name = updateFields.name as string;
					}
					if (updateFields.parentId) {
						body.parent = updateFields.parentId as string;
					}
					if (updateFields.markdownContent) {
						delete body.content;
						body.markdown_content = updateFields.content as string;
					}
					responseData = await clickupApiRequest.call(this, 'PUT', `/task/${taskId}`, body);
				}
				if (operation === 'get') {
					const taskId = this.getNodeParameter('id', i) as string;
					responseData = await clickupApiRequest.call(this, 'GET', `/task/${taskId}`);
				}
				if (operation === 'delete') {
					const taskId = this.getNodeParameter('id', i) as string;
					responseData = await clickupApiRequest.call(this, 'DELETE', `/task/${taskId}`, {});
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
