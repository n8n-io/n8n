/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
/* eslint-disable n8n-nodes-base/node-param-description-missing-from-dynamic-options */
/* eslint-disable n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options */
import type { INodeProperties } from 'n8n-workflow';

export function withActionShowFilter(
	action: string,
	properties: INodeProperties[],
): INodeProperties[] {
	return properties.map((property) => {
		return {
			displayOptions: {
				show: {
					action: [action],
				},
			},
			...property,
		};
	});
}

export const sendEmailProperties: INodeProperties[] = [
	{
		displayName: 'Email template',
		name: 'emailTemplateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEmailTemplates',
		},
		default: '',
		noDataExpression: true,
	},
];

export const sendFilesProperties: INodeProperties[] = [
	{
		displayName: 'File template',
		name: 'fileTemplateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getFileTemplates',
		},
		default: '',
		noDataExpression: true,
	},
	{
		displayName: 'Send via email',
		name: 'emailTemplateId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getEmailTemplates',
		},
		default: '',
		noDataExpression: true,
	},
];

export const createTaskProperties: INodeProperties[] = [
	{
		displayName: 'Task',
		name: 'description',
		type: 'string',
		placeholder: 'Type a task',
		typeOptions: {
			rows: 5,
		},
		default: '',
	},
	{
		displayName: 'Assign to',
		name: 'assigneeId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTeamMembers',
		},
		default: '',
		noDataExpression: true,
	},
];

export const movePipelineStageProperties: INodeProperties[] = [
	{
		displayName: 'Destination stage',
		name: 'stageId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getPipelineStages',
		},
		default: '',
		noDataExpression: true,
	},
];
