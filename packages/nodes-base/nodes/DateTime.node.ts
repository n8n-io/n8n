import * as moment from 'moment-timezone';
import { get, set } from 'lodash';

import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
} from 'n8n-workflow';


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
						description: 'Convert a date to a different format',
						value: 'format'
					},
				],
				default: 'format',
			},
			{
				displayName: 'Key Name',
				name: 'keyName',
				displayOptions: {
					show: {
						action:[
							'format',
						],
					},
				},
				type: 'string',
				default: '',
				description: 'The name of the key of which the value should be converted.',
				required: true,
			},
			{
				displayName: 'Custom Format',
				name: 'custom',
				displayOptions: {
					show: {
						action:[
							'format',
						],
					},
				},
				type: 'boolean',
				default: false,
				description: 'If a predefined format should be selected or custom format entered.',
			},
			{
				displayName: 'To Format',
				name: 'toFormat',
				displayOptions: {
					show: {
						action:[
							'format',
						],
						custom: [
							true,
						],
					},
				},
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The format to convert the date to.',
			},
			{
				displayName: 'To Format',
				name: 'toFormat',
				type: 'options',
				displayOptions: {
					show: {
						action:[
							'format',
						],
						custom:[
							false,
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
				description: 'The format to convert the date to.',
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
						description: 'The timezone to convert from.',
					},
					{
						displayName: 'From Format',
						name: 'fromFormat',
						type: 'string',
						default: '',
						description: 'In case the input format is not recognized you can provide the format ',
					},
					{
						displayName: 'New Key Name',
						name: 'newKeyName',
						type: 'string',
						default: 'newDate',
						description: 'If set will the new date be added under the new key name and the existing one will not be touched.',
					},
					{
						displayName: 'To Timezone',
						name: 'toTimezone',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTimezones',
						},
						default: 'UTC',
						description: 'The timezone to convert to.',
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
		const length = items.length as unknown as number;
		const returnData: INodeExecutionData[] = [];

		const workflowTimezone = this.getTimezone();
		let item: INodeExecutionData;

		for (let i = 0; i < length; i++) {
			const action = this.getNodeParameter('action', 0) as string;
			item = items[i];

			if (action === 'format') {
				const keyName = this.getNodeParameter('keyName', i) as string;
				const toFormat = this.getNodeParameter('toFormat', i) as string;
				const options = this.getNodeParameter('options', i) as IDataObject;
				let newDate;
				const currentDate = get(item.json, keyName);

				if (currentDate === undefined) {
					throw new Error(`The key ${keyName} does not exist on the input data`);
				}
				if (!moment(currentDate as string | number).isValid()) {
					throw new Error('The date input format could not be recognized. Please set the "From Format" field');
				}
				if (Number.isInteger(currentDate as number)) {
					newDate = moment.unix(currentDate as number);
				} else {
					if (options.fromTimezone || options.toTimezone) {
						const fromTimezone = options.fromTimezone || workflowTimezone;
						if (options.fromFormat) {
							newDate = moment.tz(currentDate as string, options.fromFormat as string, fromTimezone as string);
						} else {
							newDate = moment.tz(currentDate as string, fromTimezone as string);
						}
					} else {
						if (options.fromFormat) {
							newDate = moment(currentDate as string, options.fromFormat as string);
						} else {
							newDate = moment(currentDate as string);
						}
					}
				}

				if (options.toTimezone || options.fromTimezone) {
					// If either a source or a target timezone got defined the
					// timezone of the date has to be changed. If a target-timezone
					// is set use it else fall back to workflow timezone.
					newDate = newDate.tz(options.toTimezone as string || workflowTimezone);
				}

				newDate = newDate.format(toFormat);

				let newItem: INodeExecutionData;
				if (keyName.includes('.')) {
					// Uses dot notation so copy all data
					newItem = {
						json: JSON.parse(JSON.stringify(items[i].json)),
					};
				} else {
					// Does not use dot notation so shallow copy is enough
					newItem = {
						json: { ...items[i].json },
					};
				}

				if (item.binary !== undefined) {
					newItem.binary = item.binary;
				}

				if (options.newKeyName) {
					set(newItem, `json.${options.newKeyName}`, newDate);
				} else {
					set(newItem, `json.${keyName}`, newDate);
				}

				returnData.push(newItem);
			}
		}

		return this.prepareOutputData(returnData);
	}
}
