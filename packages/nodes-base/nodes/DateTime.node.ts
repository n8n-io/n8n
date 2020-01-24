import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	ILoadOptionsFunctions,
	IDataObject,
} from 'n8n-workflow';

import * as moment from 'moment-timezone';

export class DateTime implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Date & Time',
		name: 'dateTime',
		icon: 'fa:calendar',
		group: ['transform'],
		version: 1,
		description: 'Allows you to manipulate date and time values',
		defaults: {
			name: 'Date & Time',
			color: '#408000',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Format a Date',
						description: 'Apply to a date a diferent format',
						value: 'format'
					},
				],
				default: 'format',
			},
			{
				displayName: 'Field Name',
				name: 'fieldName',
				displayOptions: {
					show: {
						action:[
							'format'
						],
					},
				},
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'To Format',
				name: 'toFormat',
				type: 'options',
				displayOptions: {
					show: {
						action:[
							'format'
						],
					},
				},
				options: [
					{
						name: 'MM/DD/YYYY',
						value: 'MM/DD/YYYY',
						description: 'Example: 09/04/1986',
					},
					{
						name: 'YYYY/MM/DD',
						value: 'YYYY/MM/DD',
						description: 'Example: 1986/04/09',
					},
					{
						name: 'MMMM DD YYYY',
						value: 'MMMM DD YYYY',
						description: 'Example: April 09 1986',
					},
					{
						name: 'MM-DD-YYYY',
						value: 'MM-DD-YYYY',
						description: 'Example: 09-04-1986',
					},
					{
						name: 'YYYY-MM-DD',
						value: 'YYYY-MM-DD',
						description: 'Example: 1986-04-09',
					},
					{
						name: 'Unix Timestamp',
						value: 'X',
						description: 'Example: 513388800.879',
					},
					{
						name: 'Unix Ms Timestamp',
						value: 'x',
						description: 'Example: 513388800',
					},
				],
				default: 'MM/DD/YYYY',
			},
			{
				displayName: 'To Timezone',
				name: 'toTimezone',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTimezones',
				},
				displayOptions: {
					show: {
						action:[
							'format'
						],
					},
				},
				default: 'UTC',
			},
			{
				displayName: 'Options',
				name: 'options',
				displayOptions: {
					show: {
						action:[
							'format'
						],
					},
				},
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'From Timezone',
						name: 'fromTimezone',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTimezones',
						},
						default: 'UTC',
					},
					{
						displayName: 'From Format',
						name: 'fromFormat',
						type: 'string',
						default: '',
						description: 'In case the input format is not recognized you can provide the format ',
					},
					{
						displayName: 'Keep Old Date',
						name: 'keepOldDate',
						type: 'boolean',
						default: false,
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the timezones to display them to user so that he can
			// select them easily
			async getTimezones(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (const timezone of moment.tz.names()) {
					const timezoneName = timezone;
					const timezoneId = timezone;
					returnData.push({
						name: timezoneName,
						value: timezoneId,
					});
				}
				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		for (let i = 0; i < length; i++) {
			const action = this.getNodeParameter('action', 0) as string;
			if (action === 'format') {
				const fieldName = this.getNodeParameter('fieldName', i) as string;
				const toTimezone = this.getNodeParameter('toTimezone', i) as string;
				const toFormat = this.getNodeParameter('toFormat', i) as string;
				const options = this.getNodeParameter('options', i) as IDataObject;
				let newDate;
				let clone = { ...items[i].json };
				if (clone[fieldName] === undefined) {
					throw new Error(`The field ${fieldName} does not exist on the input data`);
				}
				if (!moment(clone[fieldName] as string | number).isValid()) {
					throw new Error('The date input format is not recognized, please set the "From Format" field');
				}
				if (Number.isInteger(clone[fieldName] as number)) {
					newDate  = moment.unix(clone[fieldName] as number).tz(toTimezone).format(toFormat);
				} else {
					newDate  = moment(clone[fieldName] as string).tz(toTimezone).format(toFormat);
					if (options.fromTimezone) {
						newDate = moment.tz(clone[fieldName] as string, options.fromTimezone as string).tz(toTimezone).format(toFormat);
					}
					if (options.fromFormat) {
						newDate = moment(clone[fieldName] as string, options.fromFormat as string).tz(toTimezone).format(toFormat);
					}
				}
				if (!options.keepOldDate) {
					clone[fieldName] = newDate;
				} else {
					clone['newDate'] = newDate;
				}
				responseData = clone;
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
