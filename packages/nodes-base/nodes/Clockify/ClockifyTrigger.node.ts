import moment from 'moment-timezone';

import type { IPollFunctions } from 'n8n-core';
import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { clockifyApiRequest } from './GenericFunctions';

import { EntryTypeEnum } from './EntryTypeEnum';
import type { IUserDto } from './UserDtos';
import type { IWorkspaceDto } from './WorkpaceInterfaces';

export class ClockifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clockify Trigger',
		icon: 'file:clockify.svg',
		name: 'clockifyTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Listens to Clockify events',
		defaults: {
			name: 'Clockify Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'clockifyApi',
				required: true,
			},
		],
		polling: true,
		properties: [
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
				default: '',
			},
			// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
			{
				displayName: 'Trigger',
				name: 'watchField',
				type: 'options',
				options: [
					{
						name: 'New Time Entry',
						value: EntryTypeEnum.NEW_TIME_ENTRY,
					},
				],
				required: true,
				default: EntryTypeEnum.NEW_TIME_ENTRY,
			},
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
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const triggerField = this.getNodeParameter('watchField') as EntryTypeEnum;
		const workspaceId = this.getNodeParameter('workspaceId');

		if (!webhookData.userId) {
			// Cache the user-id that we do not have to request it every time
			const userInfo: IUserDto = await clockifyApiRequest.call(this, 'GET', 'user');
			webhookData.userId = userInfo.id;
		}

		const qs: IDataObject = {};
		let resource: string;
		let result = null;

		switch (triggerField) {
			case EntryTypeEnum.NEW_TIME_ENTRY:
			default:
				const workflowTimezone = this.getTimezone();
				resource = `workspaces/${workspaceId}/user/${webhookData.userId}/time-entries`;
				qs.start = webhookData.lastTimeChecked;
				qs.end = moment().tz(workflowTimezone).format('YYYY-MM-DDTHH:mm:ss') + 'Z';
				qs.hydrated = true;
				qs['in-progress'] = false;
				break;
		}

		result = await clockifyApiRequest.call(this, 'GET', resource, {}, qs);
		webhookData.lastTimeChecked = qs.end;

		if (Array.isArray(result) && result.length !== 0) {
			return [this.helpers.returnJsonArray(result)];
		}
		return null;
	}
}
