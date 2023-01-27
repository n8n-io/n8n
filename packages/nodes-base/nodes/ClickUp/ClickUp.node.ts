import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { clickupApiRequest, clickupApiRequestAllItems, validateJSON } from './GenericFunctions';

import { checklistFields, checklistOperations } from './ChecklistDescription';

import { checklistItemFields, checklistItemOperations } from './ChecklistItemDescription';

import { commentFields, commentOperations } from './CommentDescription';

import { folderFields, folderOperations } from './FolderDescription';

import { goalFields, goalOperations } from './GoalDescription';

import { goalKeyResultFields, goalKeyResultOperations } from './GoalKeyResultDescription';

// import {
// 	guestFields,
// 	guestOperations,
// } from './guestDescription';

import { taskFields, taskOperations } from './TaskDescription';

import { taskListFields, taskListOperations } from './TaskListDescription';

import { taskTagFields, taskTagOperations } from './TaskTagDescription';

import { spaceTagFields, spaceTagOperations } from './SpaceTagDescription';

import { taskDependencyFields, taskDependencyOperations } from './TaskDependencyDescription';

import { timeEntryFields, timeEntryOperations } from './TimeEntryDescription';

import { timeEntryTagFields, timeEntryTagOperations } from './TimeEntryTagDescription';

import { listFields, listOperations } from './ListDescription';

import type { ITask } from './TaskInterface';

import type { IList } from './ListInterface';

import moment from 'moment-timezone';

export class ClickUp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ClickUp',
		name: 'clickUp',
		icon: 'file:clickup.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ":" + $parameter["resource"]}}',
		description: 'Consume ClickUp API (Beta)',
		defaults: {
			name: 'ClickUp',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'clickUpApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'clickUpOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Checklist',
						value: 'checklist',
					},
					{
						name: 'Checklist Item',
						value: 'checklistItem',
					},
					{
						name: 'Comment',
						value: 'comment',
					},
					{
						name: 'Folder',
						value: 'folder',
					},
					{
						name: 'Goal',
						value: 'goal',
					},
					{
						name: 'Goal Key Result',
						value: 'goalKeyResult',
					},
					// {
					// 	name: 'Guest',
					// 	value: 'guest',
					// },
					{
						name: 'List',
						value: 'list',
					},
					{
						name: 'Space Tag',
						value: 'spaceTag',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'Task Dependency',
						value: 'taskDependency',
					},
					{
						name: 'Task List',
						value: 'taskList',
					},
					{
						name: 'Task Tag',
						value: 'taskTag',
					},
					{
						name: 'Time Entry',
						value: 'timeEntry',
					},
					{
						name: 'Time Entry Tag',
						value: 'timeEntryTag',
					},
				],
				default: 'task',
			},
			// CHECKLIST
			...checklistOperations,
			...checklistFields,
			// CHECKLIST ITEM
			...checklistItemOperations,
			...checklistItemFields,
			// COMMENT
			...commentOperations,
			...commentFields,
			// FOLDER
			...folderOperations,
			...folderFields,
			// GOAL
			...goalOperations,
			...goalFields,
			// GOAL kEY RESULT
			...goalKeyResultOperations,
			...goalKeyResultFields,
			// GUEST
			// ...guestOperations,
			// ...guestFields,
			// TASK TAG
			...taskTagOperations,
			...taskTagFields,
			// TASK LIST
			...taskListOperations,
			...taskListFields,
			// SPACE TAG
			...spaceTagOperations,
			...spaceTagFields,
			// TASK
			...taskOperations,
			...taskFields,
			// TASK DEPENDENCY
			...taskDependencyOperations,
			...taskDependencyFields,
			// TIME ENTRY
			...timeEntryOperations,
			...timeEntryFields,
			...taskDependencyFields,
			// TIME ENTRY TAG
			...timeEntryTagOperations,
			...timeEntryTagFields,
			// LIST
			...listOperations,
			...listFields,
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
			// Get all the available lists without a folder to display them to user so that he can
			// select them easily
			async getFolderlessLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const spaceId = this.getCurrentNodeParameter('space') as string;
				const returnData: INodePropertyOptions[] = [];
				const { lists } = await clickupApiRequest.call(this, 'GET', `/space/${spaceId}/list`);
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
				const taskId = this.getCurrentNodeParameter('task') as string;
				const returnData: INodePropertyOptions[] = [];
				let url: string;
				if (listId) {
					url = `/list/${listId}/member`;
				} else if (taskId) {
					url = `/task/${taskId}/member`;
				} else {
					return returnData;
				}

				const { members } = await clickupApiRequest.call(this, 'GET', url);
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
					const tagId = tag.name;
					returnData.push({
						name: tagName,
						value: tagId,
					});
				}
				return returnData;
			},
			// Get all the available tags to display them to user so that he can
			// select them easily
			async getTimeEntryTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const teamId = this.getCurrentNodeParameter('team') as string;
				const returnData: INodePropertyOptions[] = [];
				const { data: tags } = await clickupApiRequest.call(
					this,
					'GET',
					`/team/${teamId}/time_entries/tags`,
				);
				for (const tag of tags) {
					const tagName = tag.name;
					const tagId = JSON.stringify(tag);
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

			// Get all the custom fields to display them to user so that he can
			// select them easily
			async getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const listId = this.getCurrentNodeParameter('list') as string;
				const returnData: INodePropertyOptions[] = [];
				const { fields } = await clickupApiRequest.call(this, 'GET', `/list/${listId}/field`);
				for (const field of fields) {
					const fieldName = field.name;
					const fieldId = field.id;
					returnData.push({
						name: fieldName,
						value: fieldId,
					});
				}
				return returnData;
			},

			// Get all the available lists to display them to user so that he can
			// select them easily
			async getTasks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const listId = this.getCurrentNodeParameter('list') as string;
				const archived = this.getCurrentNodeParameter('archived') as string;
				const returnData: INodePropertyOptions[] = [];
				const { tasks } = await clickupApiRequest.call(
					this,
					'GET',
					`/list/${listId}/task?archived=${archived}`,
				);
				for (const task of tasks) {
					const taskName = task.name;
					const taskId = task.id;
					returnData.push({
						name: taskName,
						value: taskId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'checklist') {
					if (operation === 'create') {
						const taskId = this.getNodeParameter('task', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const body: IDataObject = {
							name,
						};
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/task/${taskId}/checklist`,
							body,
						);
						responseData = responseData.checklist;
					}
					if (operation === 'delete') {
						const checklistId = this.getNodeParameter('checklist', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/checklist/${checklistId}`,
						);
						responseData = { success: true };
					}
					if (operation === 'update') {
						const checklistId = this.getNodeParameter('checklist', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						if (updateFields.position) {
							body.position = updateFields.position as number;
						}
						responseData = await clickupApiRequest.call(
							this,
							'PUT',
							`/checklist/${checklistId}`,
							body,
						);
						responseData = responseData.checklist;
					}
				}
				if (resource === 'checklistItem') {
					if (operation === 'create') {
						const checklistId = this.getNodeParameter('checklist', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							name,
						};
						if (additionalFields.assignee) {
							body.assignee = parseInt(additionalFields.assignee as string, 10);
						}
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/checklist/${checklistId}/checklist_item`,
							body,
						);
						responseData = responseData.checklist;
					}
					if (operation === 'delete') {
						const checklistId = this.getNodeParameter('checklist', i) as string;
						const checklistItemId = this.getNodeParameter('checklistItem', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/checklist/${checklistId}/checklist_item/${checklistItemId}`,
						);
						responseData = { success: true };
					}
					if (operation === 'update') {
						const checklistId = this.getNodeParameter('checklist', i) as string;
						const checklistItemId = this.getNodeParameter('checklistItem', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						if (updateFields.parent) {
							body.parent = updateFields.parent as string;
						}
						if (updateFields.assignee) {
							body.assignee = parseInt(updateFields.assignee as string, 10);
						}
						if (updateFields.resolved) {
							body.resolved = updateFields.resolved as boolean;
						}
						responseData = await clickupApiRequest.call(
							this,
							'PUT',
							`/checklist/${checklistId}/checklist_item/${checklistItemId}`,
							body,
						);
						responseData = responseData.checklist;
					}
				}
				if (resource === 'comment') {
					if (operation === 'create') {
						const commentOn = this.getNodeParameter('commentOn', i) as string;
						const id = this.getNodeParameter('id', i) as string;
						const commentText = this.getNodeParameter('commentText', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							comment_text: commentText,
						};
						if (additionalFields.assignee) {
							body.assignee = parseInt(additionalFields.assignee as string, 10);
						}
						if (additionalFields.notifyAll) {
							body.notify_all = additionalFields.notifyAll as boolean;
						}
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/${commentOn}/${id}/comment`,
							body,
						);
					}
					if (operation === 'delete') {
						const commentId = this.getNodeParameter('comment', i) as string;
						responseData = await clickupApiRequest.call(this, 'DELETE', `/comment/${commentId}`);
						responseData = { success: true };
					}
					if (operation === 'getAll') {
						const commentsOn = this.getNodeParameter('commentsOn', i) as string;
						const id = this.getNodeParameter('id', i) as string;
						qs.limit = this.getNodeParameter('limit', i);
						responseData = await clickupApiRequest.call(
							this,
							'GET',
							`/${commentsOn}/${id}/comment`,
							{},
							qs,
						);
						responseData = responseData.comments;
						responseData = responseData.splice(0, qs.limit);
					}
					if (operation === 'update') {
						const commentId = this.getNodeParameter('comment', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.commentText) {
							body.comment_text = updateFields.commentText as string;
						}
						if (updateFields.assignee) {
							body.assignee = parseInt(updateFields.assignee as string, 10);
						}
						if (updateFields.resolved) {
							body.resolved = updateFields.resolved as boolean;
						}
						responseData = await clickupApiRequest.call(this, 'PUT', `/comment/${commentId}`, body);
						responseData = { success: true };
					}
				}
				if (resource === 'folder') {
					if (operation === 'create') {
						const spaceId = this.getNodeParameter('space', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const body: IDataObject = {
							name,
						};
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/space/${spaceId}/folder`,
							body,
						);
					}
					if (operation === 'delete') {
						const folderId = this.getNodeParameter('folder', i) as string;
						responseData = await clickupApiRequest.call(this, 'DELETE', `/folder/${folderId}`);
						responseData = { success: true };
					}
					if (operation === 'get') {
						const folderId = this.getNodeParameter('folder', i) as string;
						responseData = await clickupApiRequest.call(this, 'GET', `/folder/${folderId}`);
					}
					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i);
						const spaceId = this.getNodeParameter('space', i) as string;
						if (filters.archived) {
							qs.archived = filters.archived as boolean;
						}
						qs.limit = this.getNodeParameter('limit', i);
						responseData = await clickupApiRequest.call(
							this,
							'GET',
							`/space/${spaceId}/folder`,
							{},
							qs,
						);
						responseData = responseData.folders;
						responseData = responseData.splice(0, qs.limit);
					}
					if (operation === 'update') {
						const folderId = this.getNodeParameter('folder', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						responseData = await clickupApiRequest.call(this, 'PUT', `/folder/${folderId}`, body);
					}
				}
				if (resource === 'goal') {
					if (operation === 'create') {
						const teamId = this.getNodeParameter('team', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							name,
						};
						if (additionalFields.dueDate) {
							body.due_date = new Date(additionalFields.dueDate as string).getTime();
						}
						if (additionalFields.description) {
							body.description = additionalFields.description as string;
						}
						if (additionalFields.multipleOwners) {
							body.multiple_owners = additionalFields.multipleOwners as boolean;
						}
						if (additionalFields.color) {
							body.color = additionalFields.color as string;
						}
						if (additionalFields.owners) {
							body.owners = (additionalFields.owners as string)
								.split(',')
								.map((e: string) => parseInt(e, 10));
						}
						responseData = await clickupApiRequest.call(this, 'POST', `/team/${teamId}/goal`, body);
						responseData = responseData.goal;
					}
					if (operation === 'delete') {
						const goalId = this.getNodeParameter('goal', i) as string;
						responseData = await clickupApiRequest.call(this, 'DELETE', `/goal/${goalId}`);
						responseData = { success: true };
					}
					if (operation === 'get') {
						const goalId = this.getNodeParameter('goal', i) as string;
						responseData = await clickupApiRequest.call(this, 'GET', `/goal/${goalId}`);
						responseData = responseData.goal;
					}
					if (operation === 'getAll') {
						const teamId = this.getNodeParameter('team', i) as string;
						qs.limit = this.getNodeParameter('limit', i);
						responseData = await clickupApiRequest.call(
							this,
							'GET',
							`/team/${teamId}/goal`,
							{},
							qs,
						);
						responseData = responseData.goals;
						responseData = responseData.splice(0, qs.limit);
					}
					if (operation === 'update') {
						const goalId = this.getNodeParameter('goal', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						if (updateFields.dueDate) {
							body.due_date = new Date(updateFields.dueDate as string).getTime();
						}
						if (updateFields.description) {
							body.description = updateFields.description as string;
						}
						if (updateFields.color) {
							body.color = updateFields.color as string;
						}
						if (updateFields.addOwners) {
							body.add_owners = (updateFields.addOwners as string)
								.split(',')
								.map((e: string) => parseInt(e, 10));
						}
						if (updateFields.removeOwners) {
							body.rem_owners = (updateFields.removeOwners as string)
								.split(',')
								.map((e: string) => parseInt(e, 10));
						}
						responseData = await clickupApiRequest.call(this, 'PUT', `/goal/${goalId}`, body);
						responseData = responseData.goal;
					}
				}
				if (resource === 'goalKeyResult') {
					if (operation === 'create') {
						const goalId = this.getNodeParameter('goal', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const type = this.getNodeParameter('type', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							name,
							type,
						};
						if (type === 'number' || type === 'currency') {
							if (!additionalFields.unit) {
								throw new NodeOperationError(this.getNode(), 'Unit field must be set', {
									itemIndex: i,
								});
							}
						}
						if (
							type === 'number' ||
							type === 'percentaje' ||
							type === 'automatic' ||
							type === 'currency'
						) {
							if (
								additionalFields.stepsStart === undefined ||
								!additionalFields.stepsEnd === undefined
							) {
								throw new NodeOperationError(
									this.getNode(),
									'Steps start and steps end fields must be set',
									{ itemIndex: i },
								);
							}
						}
						if (additionalFields.unit) {
							body.unit = additionalFields.unit as string;
						}
						if (additionalFields.stepsStart) {
							body.steps_start = additionalFields.stepsStart as number;
						}
						if (additionalFields.stepsEnd) {
							body.steps_end = additionalFields.stepsEnd as number;
						}
						if (additionalFields.taskIds) {
							body.task_ids = (additionalFields.taskIds as string).split(',');
						}
						if (additionalFields.listIds) {
							body.list_ids = (additionalFields.listIds as string).split(',');
						}
						if (additionalFields.owners) {
							body.owners = (additionalFields.owners as string)
								.split(',')
								.map((e: string) => parseInt(e, 10));
						}
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/goal/${goalId}/key_result`,
							body,
						);
						responseData = responseData.key_result;
					}
					if (operation === 'delete') {
						const keyResultId = this.getNodeParameter('keyResult', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/key_result/${keyResultId}`,
						);
						responseData = { success: true };
					}
					if (operation === 'update') {
						const keyResultId = this.getNodeParameter('keyResult', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						if (updateFields.note) {
							body.note = updateFields.note as string;
						}
						if (updateFields.stepsCurrent) {
							body.steps_current = updateFields.stepsCurrent as number;
						}
						if (updateFields.stepsStart) {
							body.steps_start = updateFields.stepsStart as number;
						}
						if (updateFields.stepsEnd) {
							body.steps_end = updateFields.stepsEnd as number;
						}
						if (updateFields.unit) {
							body.unit = updateFields.unit as string;
						}
						responseData = await clickupApiRequest.call(
							this,
							'PUT',
							`/key_result/${keyResultId}`,
							body,
						);
						responseData = responseData.key_result;
					}
				}
				if (resource === 'guest') {
					if (operation === 'create') {
						const teamId = this.getNodeParameter('team', i) as string;
						const email = this.getNodeParameter('email', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IDataObject = {
							email,
						};
						if (additionalFields.canEditTags) {
							body.can_edit_tags = additionalFields.canEditTags as boolean;
						}
						if (additionalFields.canSeeTimeSpend) {
							body.can_see_time_spend = additionalFields.canSeeTimeSpend as boolean;
						}
						if (additionalFields.canSeeTimeEstimated) {
							body.can_see_time_estimated = additionalFields.canSeeTimeEstimated as boolean;
						}
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/team/${teamId}/guest`,
							body,
						);
						responseData = responseData.team;
					}
					if (operation === 'delete') {
						const teamId = this.getNodeParameter('team', i) as string;
						const guestId = this.getNodeParameter('guest', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/team/${teamId}/guest/${guestId}`,
						);
						responseData = { success: true };
					}
					if (operation === 'get') {
						const teamId = this.getNodeParameter('team', i) as string;
						const guestId = this.getNodeParameter('guest', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'GET',
							`/team/${teamId}/guest/${guestId}`,
						);
						responseData = responseData.team;
					}
					if (operation === 'update') {
						const teamId = this.getNodeParameter('team', i) as string;
						const guestId = this.getNodeParameter('guest', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IDataObject = {};
						if (updateFields.username) {
							body.username = updateFields.username as string;
						}
						if (updateFields.canEditTags) {
							body.can_edit_tags = updateFields.canEditTags as boolean;
						}
						if (updateFields.canSeeTimeSpend) {
							body.can_see_time_spend = updateFields.canSeeTimeSpend as boolean;
						}
						if (updateFields.canSeeTimeEstimated) {
							body.can_see_time_estimated = updateFields.canSeeTimeEstimated as boolean;
						}
						responseData = await clickupApiRequest.call(
							this,
							'PUT',
							`/team/${teamId}/guest/${guestId}`,
							body,
						);
						responseData = responseData.team;
					}
				}
				if (resource === 'task') {
					if (operation === 'create') {
						const listId = this.getNodeParameter('list', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: ITask = {
							name,
						};
						if (additionalFields.customFieldsJson) {
							const customFields = validateJSON(additionalFields.customFieldsJson as string);
							if (customFields === undefined) {
								throw new NodeOperationError(this.getNode(), 'Custom Fields: Invalid JSON', {
									itemIndex: i,
								});
							}
							body.custom_fields = customFields;
						}
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
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: ITask = {
							assignees: {
								add: [],
								rem: [],
							},
						};
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
						if (updateFields.addAssignees) {
							//@ts-ignore
							body.assignees.add = (updateFields.addAssignees as string)
								.split(',')
								.map((e: string) => parseInt(e, 10));
						}
						if (updateFields.removeAssignees) {
							//@ts-ignore
							body.assignees.rem = (updateFields.removeAssignees as string)
								.split(',')
								.map((e: string) => parseInt(e, 10));
						}
						if (updateFields.status) {
							body.status = updateFields.status as string;
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
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						if (filters.archived) {
							qs.archived = filters.archived as boolean;
						}
						if (filters.subtasks) {
							qs.subtasks = filters.subtasks as boolean;
						}
						if (filters.includeClosed) {
							qs.include_closed = filters.includeClosed as boolean;
						}
						if (filters.orderBy) {
							qs.order_by = filters.orderBy as string;
						}
						if (filters.statuses) {
							qs.statuses = filters.statuses as string[];
						}
						if (filters.assignees) {
							qs.assignees = filters.assignees as string[];
						}
						if (filters.tags) {
							qs.tags = filters.tags as string[];
						}
						if (filters.dueDateGt) {
							qs.due_date_gt = new Date(filters.dueDateGt as string).getTime();
						}
						if (filters.dueDateLt) {
							qs.due_date_lt = new Date(filters.dueDateLt as string).getTime();
						}
						if (filters.dateCreatedGt) {
							qs.date_created_gt = new Date(filters.dateCreatedGt as string).getTime();
						}
						if (filters.dateCreatedLt) {
							qs.date_created_lt = new Date(filters.dateCreatedLt as string).getTime();
						}
						if (filters.dateUpdatedGt) {
							qs.date_updated_gt = new Date(filters.dateUpdatedGt as string).getTime();
						}
						if (filters.dateUpdatedLt) {
							qs.date_updated_lt = new Date(filters.dateUpdatedLt as string).getTime();
						}
						if (filters.customFieldsUi) {
							const customFieldsValues = (filters.customFieldsUi as IDataObject)
								.customFieldsValues as IDataObject[];
							if (customFieldsValues) {
								const customFields: IDataObject[] = [];
								for (const customFieldValue of customFieldsValues) {
									customFields.push({
										field_id: customFieldValue.fieldId,
										operator:
											customFieldValue.operator === 'equal' ? '=' : customFieldValue.operator,
										value: customFieldValue.value as string,
									});
								}

								qs.custom_fields = JSON.stringify(customFields);
							}
						}

						const listId = this.getNodeParameter('list', i) as string;
						if (returnAll) {
							responseData = await clickupApiRequestAllItems.call(
								this,
								'tasks',
								'GET',
								`/list/${listId}/task`,
								{},
								qs,
							);
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await clickupApiRequestAllItems.call(
								this,
								'tasks',
								'GET',
								`/list/${listId}/task`,
								{},
								qs,
							);
							responseData = responseData.splice(0, qs.limit);
						}
					}
					if (operation === 'member') {
						const taskId = this.getNodeParameter('id', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await clickupApiRequest.call(
								this,
								'GET',
								`/task/${taskId}/member`,
								{},
								qs,
							);
							responseData = responseData.members;
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await clickupApiRequest.call(
								this,
								'GET',
								`/task/${taskId}/member`,
								{},
								qs,
							);
							responseData = responseData.members;
							responseData = responseData.splice(0, qs.limit);
						}
					}
					if (operation === 'setCustomField') {
						const taskId = this.getNodeParameter('task', i) as string;
						const fieldId = this.getNodeParameter('field', i) as string;
						const value = this.getNodeParameter('value', i) as string;
						const jsonParse = this.getNodeParameter('jsonParse', i) as boolean;

						const body: IDataObject = {};
						body.value = value;
						if (jsonParse) {
							body.value = validateJSON(body.value);
							if (body.value === undefined) {
								throw new NodeOperationError(this.getNode(), 'Value is invalid JSON!', {
									itemIndex: i,
								});
							}
						} else {
							//@ts-ignore
							if (!isNaN(body.value)) {
								body.value = parseInt(body.value, 10);
							}
						}
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/task/${taskId}/field/${fieldId}`,
							body,
						);
					}
					if (operation === 'delete') {
						const taskId = this.getNodeParameter('id', i) as string;
						responseData = await clickupApiRequest.call(this, 'DELETE', `/task/${taskId}`, {});
						responseData = { success: true };
					}
				}
				if (resource === 'taskTag') {
					if (operation === 'add') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const name = this.getNodeParameter('tagName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/task/${taskId}/tag/${name}`,
							{},
							additionalFields,
						);
						responseData = { success: true };
					}
					if (operation === 'remove') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const name = this.getNodeParameter('tagName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/task/${taskId}/tag/${name}`,
							{},
							additionalFields,
						);
						responseData = { success: true };
					}
				}
				if (resource === 'taskList') {
					if (operation === 'add') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const listId = this.getNodeParameter('listId', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/list/${listId}/task/${taskId}`,
						);
						responseData = { success: true };
					}
					if (operation === 'remove') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const listId = this.getNodeParameter('listId', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/list/${listId}/task/${taskId}`,
						);
						responseData = { success: true };
					}
				}
				if (resource === 'taskDependency') {
					if (operation === 'create') {
						const taskId = this.getNodeParameter('task', i) as string;
						const dependsOnTaskId = this.getNodeParameter('dependsOnTask', i) as string;
						const body: IDataObject = {};

						body.depends_on = dependsOnTaskId;

						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/task/${taskId}/dependency`,
							body,
						);
						responseData = { success: true };
					}
					if (operation === 'delete') {
						const taskId = this.getNodeParameter('task', i) as string;
						const dependsOnTaskId = this.getNodeParameter('dependsOnTask', i) as string;

						qs.depends_on = dependsOnTaskId;

						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/task/${taskId}/dependency`,
							{},
							qs,
						);
						responseData = { success: true };
					}
				}
				if (resource === 'timeEntry') {
					if (operation === 'update') {
						const teamId = this.getNodeParameter('team', i) as string;
						const timeEntryId = this.getNodeParameter('timeEntry', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const timezone = this.getTimezone();
						const body: IDataObject = {};
						Object.assign(body, updateFields);

						if (body.start) {
							body.start = moment.tz(body.start, timezone).valueOf();
						}

						if (body.duration) {
							body.duration = (body.duration as number) * 60000;
						}

						if (body.task) {
							body.tid = body.task;
							body.custom_task_ids = true;
						}

						responseData = await clickupApiRequest.call(
							this,
							'PUT',
							`/team/${teamId}/time_entries/${timeEntryId}`,
							body,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const teamId = this.getNodeParameter('team', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const filters = this.getNodeParameter('filters', i);
						const timezone = this.getTimezone();
						Object.assign(qs, filters);

						if (filters.start_date) {
							qs.start_date = moment.tz(qs.start_date, timezone).valueOf();
						}
						if (filters.end_date) {
							qs.end_date = moment.tz(qs.end_date, timezone).valueOf();
						}
						responseData = await clickupApiRequest.call(
							this,
							'GET',
							`/team/${teamId}/time_entries`,
							{},
							qs,
						);

						responseData = responseData.data;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'get') {
						const teamId = this.getNodeParameter('team', i) as string;
						const running = this.getNodeParameter('running', i) as boolean;

						let endpoint = `/team/${teamId}/time_entries/current`;

						if (!running) {
							const timeEntryId = this.getNodeParameter('timeEntry', i) as string;
							endpoint = `/team/${teamId}/time_entries/${timeEntryId}`;
						}

						responseData = await clickupApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.data;
					}
					if (operation === 'create') {
						const teamId = this.getNodeParameter('team', i) as string;
						const taskId = this.getNodeParameter('task', i) as string;
						const start = this.getNodeParameter('start', i) as string;
						const duration = this.getNodeParameter('duration', i) as number;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const timezone = this.getTimezone();
						const body: IDataObject = {
							start: moment.tz(start, timezone).valueOf(),
							duration: duration * 60000,
							tid: taskId,
						};
						Object.assign(body, additionalFields);

						if (body.tags) {
							body.tags = (body.tags as string[]).map((tag) => JSON.parse(tag));
						}

						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/team/${teamId}/time_entries`,
							body,
						);
						responseData = responseData.data;
					}
					if (operation === 'start') {
						const teamId = this.getNodeParameter('team', i) as string;
						const taskId = this.getNodeParameter('task', i) as string;
						const body: IDataObject = {};
						body.tid = taskId;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(body, additionalFields);
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/team/${teamId}/time_entries/start`,
							body,
						);
						responseData = responseData.data;
					}
					if (operation === 'stop') {
						const teamId = this.getNodeParameter('team', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/team/${teamId}/time_entries/stop`,
						);

						if (responseData.data) {
							responseData = responseData.data;
						} else {
							throw new NodeOperationError(this.getNode(), 'There seems to be nothing to stop.', {
								itemIndex: i,
							});
						}
					}
					if (operation === 'delete') {
						const teamId = this.getNodeParameter('team', i) as string;
						const timeEntryId = this.getNodeParameter('timeEntry', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/team/${teamId}/time_entries/${timeEntryId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'timeEntryTag') {
					if (operation === 'add') {
						const teamId = this.getNodeParameter('team', i) as string;
						const timeEntryIds = this.getNodeParameter('timeEntryIds', i) as string;
						const tagsUi = this.getNodeParameter('tagsUi', i) as IDataObject;
						const body: IDataObject = {};
						body.time_entry_ids = timeEntryIds.split(',');
						if (tagsUi) {
							const tags = tagsUi.tagsValues as IDataObject[];
							if (tags === undefined) {
								throw new NodeOperationError(this.getNode(), 'At least one tag must be set', {
									itemIndex: i,
								});
							}
							body.tags = tags;
						}
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/team/${teamId}/time_entries/tags`,
							body,
						);
						responseData = { success: true };
					}
					if (operation === 'getAll') {
						const teamId = this.getNodeParameter('team', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						responseData = await clickupApiRequest.call(
							this,
							'GET',
							`/team/${teamId}/time_entries/tags`,
						);

						responseData = responseData.data;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'remove') {
						const teamId = this.getNodeParameter('team', i) as string;
						const timeEntryIds = this.getNodeParameter('timeEntryIds', i) as string;
						const tagNames = this.getNodeParameter('tagNames', i) as string[];
						const body: IDataObject = {};
						body.time_entry_ids = timeEntryIds.split(',');
						body.tags = tagNames.map((tag) => JSON.parse(tag).name);
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/team/${teamId}/time_entries/tags`,
							body,
						);
						responseData = { success: true };
					}
				}
				if (resource === 'spaceTag') {
					if (operation === 'create') {
						const spaceId = this.getNodeParameter('space', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const foregroundColor = this.getNodeParameter('foregroundColor', i) as string;
						const backgroundColor = this.getNodeParameter('backgroundColor', i) as string;
						const body: IDataObject = {
							tag: {
								name,
								tag_bg: backgroundColor,
								tag_fg: foregroundColor,
							},
						};
						responseData = await clickupApiRequest.call(
							this,
							'POST',
							`/space/${spaceId}/tag`,
							body,
						);
						responseData = { success: true };
					}
					if (operation === 'delete') {
						const spaceId = this.getNodeParameter('space', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						responseData = await clickupApiRequest.call(
							this,
							'DELETE',
							`/space/${spaceId}/tag/${name}`,
						);
						responseData = { success: true };
					}
					if (operation === 'getAll') {
						const spaceId = this.getNodeParameter('space', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						responseData = await clickupApiRequest.call(this, 'GET', `/space/${spaceId}/tag`);
						responseData = responseData.tags;
						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);
							responseData = responseData.splice(0, limit);
						}
					}
					if (operation === 'update') {
						const spaceId = this.getNodeParameter('space', i) as string;
						const tagName = this.getNodeParameter('name', i) as string;
						const newTagName = this.getNodeParameter('newName', i) as string;
						const foregroundColor = this.getNodeParameter('foregroundColor', i) as string;
						const backgroundColor = this.getNodeParameter('backgroundColor', i) as string;
						const body: IDataObject = {
							tag: {
								name: newTagName,
								tag_bg: backgroundColor,
								tag_fg: foregroundColor,
							},
						};
						await clickupApiRequest.call(this, 'PUT', `/space/${spaceId}/tag/${tagName}`, body);
						responseData = { success: true };
					}
				}
				if (resource === 'list') {
					if (operation === 'create') {
						const spaceId = this.getNodeParameter('space', i) as string;
						const folderless = this.getNodeParameter('folderless', i) as string;
						const name = this.getNodeParameter('name', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IList = {
							name,
						};
						if (additionalFields.content) {
							body.content = additionalFields.content as string;
						}
						if (additionalFields.dueDate) {
							body.due_date = new Date(additionalFields.dueDate as string).getTime();
						}
						if (additionalFields.dueDateTime) {
							body.due_date_time = additionalFields.dueDateTime as boolean;
						}
						if (additionalFields.priority) {
							body.priority = additionalFields.priority as number;
						}
						if (additionalFields.assignee) {
							body.assignee = parseInt(additionalFields.assignee as string, 10);
						}
						if (additionalFields.status) {
							body.status = additionalFields.status as string;
						}
						if (folderless) {
							responseData = await clickupApiRequest.call(
								this,
								'POST',
								`/space/${spaceId}/list`,
								body,
							);
						} else {
							const folderId = this.getNodeParameter('folder', i) as string;
							responseData = await clickupApiRequest.call(
								this,
								'POST',
								`/folder/${folderId}/list`,
								body,
							);
						}
					}
					if (operation === 'member') {
						const listId = this.getNodeParameter('id', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						if (returnAll) {
							responseData = await clickupApiRequest.call(
								this,
								'GET',
								`/list/${listId}/member`,
								{},
								qs,
							);
							responseData = responseData.members;
						} else {
							qs.limit = this.getNodeParameter('limit', i);
							responseData = await clickupApiRequest.call(
								this,
								'GET',
								`/list/${listId}/member`,
								{},
								qs,
							);
							responseData = responseData.members;
							responseData = responseData.splice(0, qs.limit);
						}
					}
					if (operation === 'customFields') {
						const listId = this.getNodeParameter('list', i) as string;
						responseData = await clickupApiRequest.call(this, 'GET', `/list/${listId}/field`);
						responseData = responseData.fields;
					}
					if (operation === 'delete') {
						const listId = this.getNodeParameter('list', i) as string;
						responseData = await clickupApiRequest.call(this, 'DELETE', `/list/${listId}`);
						responseData = { success: true };
					}
					if (operation === 'get') {
						const listId = this.getNodeParameter('list', i) as string;
						responseData = await clickupApiRequest.call(this, 'GET', `/list/${listId}`);
					}
					if (operation === 'getAll') {
						const filters = this.getNodeParameter('filters', i);
						const spaceId = this.getNodeParameter('space', i) as string;
						const folderless = this.getNodeParameter('folderless', i) as boolean;
						if (filters.archived) {
							qs.archived = filters.archived as boolean;
						}
						let endpoint = `/space/${spaceId}/list`;
						if (!folderless) {
							const folderId = this.getNodeParameter('folder', i) as string;
							endpoint = `/folder/${folderId}/list`;
						}

						qs.limit = this.getNodeParameter('limit', i);
						responseData = await clickupApiRequest.call(this, 'GET', endpoint, {}, qs);
						responseData = responseData.lists;
						responseData = responseData.splice(0, qs.limit);
					}
					if (operation === 'update') {
						const listId = this.getNodeParameter('list', i) as string;
						const updateFields = this.getNodeParameter('updateFields', i);
						const body: IList = {};
						if (updateFields.name) {
							body.name = updateFields.name as string;
						}
						if (updateFields.content) {
							body.content = updateFields.content as string;
						}
						if (updateFields.dueDate) {
							body.due_date = new Date(updateFields.dueDate as string).getTime();
						}
						if (updateFields.dueDateTime) {
							body.due_date_time = updateFields.dueDateTime as boolean;
						}
						if (updateFields.priority) {
							body.priority = updateFields.priority as number;
						}
						if (updateFields.assignee) {
							body.assignee = parseInt(updateFields.assignee as string, 10);
						}
						if (updateFields.unsetStatus) {
							body.unset_status = updateFields.unsetStatus as boolean;
						}
						responseData = await clickupApiRequest.call(this, 'PUT', `/list/${listId}`, body);
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
