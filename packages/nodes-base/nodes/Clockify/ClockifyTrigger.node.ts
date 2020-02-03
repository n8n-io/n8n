import {IPollFunctions} from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	clockifyApiRequest,
} from './GenericFunctions';

import {IWorkspaceDto} from "./WorkpaceInterfaces";
import {EntryTypeEnum} from "./EntryTypeEnum";
import {ICurrentUserDto} from "./UserDtos";
import * as moment from "moment";


export class ClockifyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clockify Event',
		icon: 'file:images/clockify-mark-blue.png',
		name: 'clockifyTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Watches Clockify For Events',
		defaults: {
			name: 'Clockify Event',
			color: '#00FF00',
		},
		inputs: [],
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
				default: '',
			},
			{
				displayName: 'Trigger',
				name: 'watchField',
				type: 'options',
				options: [
					{
						name: 'New Time Entry',
						value: EntryTypeEnum.NEW_TIME_ENTRY,
					}
				],
				required: true,
				default: '',
			},
		]
	};

	methods = {
		loadOptions: {
			async listWorkspaces(this: ILoadOptionsFunctions) : Promise<INodePropertyOptions[]> {
				const rtv : INodePropertyOptions[] = [];
				const  workspaces: IWorkspaceDto[] = await clockifyApiRequest.call(this,'GET', 'workspaces');
				if(undefined !== workspaces) {
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
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const triggerField = this.getNodeParameter('watchField') as EntryTypeEnum;
		const workspaceId  = this.getNodeParameter('workspaceId');

		const userInfo : ICurrentUserDto = await clockifyApiRequest.call(this,'GET', 'user');
		const qs : IDataObject = {};
		let resource: string;
		let result = null;

		switch (triggerField) {
			case EntryTypeEnum.NEW_TIME_ENTRY :
			default:
				resource = `workspaces/${workspaceId}/user/${userInfo.id}/time-entries`;
				qs.start = webhookData.lastTimeChecked;
				qs.end = moment().toISOString();
				qs.hydrated = true;
				qs['in-progress'] = false;
			break;
		}
		console.error(qs);
		try {
			result = await clockifyApiRequest.call(this, 'GET', resource, {}, qs );
			webhookData.lastTimeChecked = qs.end_date;
		}
		catch( e ) {
			throw new Error(`Clockify Exception: ${e}`);
		}
		if (Array.isArray(result) && result.length !== 0) {
			result = [this.helpers.returnJsonArray(result)];
		}
		return result;

	}
}
