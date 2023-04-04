import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { deepCopy, NodeOperationError } from 'n8n-workflow';

import moment from 'moment-timezone';

function parseDateByFormat(this: IExecuteFunctions, value: string, fromFormat: string) {
	const date = moment(value, fromFormat, true);
	if (moment(date).isValid()) return date;

	throw new NodeOperationError(
		this.getNode(),
		'Date input cannot be parsed. Please recheck the value and the "From Format" field.',
	);
}

function getIsoValue(this: IExecuteFunctions, value: string) {
	try {
		return new Date(value).toISOString(); // may throw due to unpredictable input
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			'Unrecognized date input. Please specify a format in the "From Format" field.',
		);
	}
}

function parseDateByDefault(this: IExecuteFunctions, value: string) {
	const isoValue = getIsoValue.call(this, value);
	if (moment(isoValue).isValid()) return moment(isoValue);

	throw new NodeOperationError(
		this.getNode(),
		'Unrecognized date input. Please specify a format in the "From Format" field.',
	);
}

export class DateTimeV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
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
							name: 'Add to a Date',
							value: 'addToDate',
						},
						{
							name: 'Extract Part of a Date',
							value: 'extractDate',
						},
						{
							name: 'Format a Date',
							value: 'formatDate',
						},
						{
							name: 'Get Current Date',
							value: 'getCurrentDate',
						},
						{
							name: 'Get Time Between Dates',
							value: 'getTimeBetweenDates',
						},
						{
							name: 'Round a Date',
							value: 'roundDate',
						},
						{
							name: 'Subtract From a Date',
							value: 'subtractFromDate',
						},
					],
					default: 'getCurrentDate',
				},
			],
		};
	}

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
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {}
}
