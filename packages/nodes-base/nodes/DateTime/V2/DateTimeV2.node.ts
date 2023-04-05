import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import moment from 'moment-timezone';
import { CurrentDateDescription } from './CurrentDateDescription';
import { AddToDateDescription } from './AddToDateDescription';
import { SubtractFromDateDescription } from './SubtractFromDateDescription';

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
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
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
				...CurrentDateDescription,
				...AddToDateDescription,
				...SubtractFromDateDescription,
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const responseData = [];
		const operation = this.getNodeParameter('operation', 0);
		const workflowTimezone = this.getTimezone();

		for (let i = 0; i < items.length; i++) {
			if (operation === 'getCurrentDate') {
				const includeTime = this.getNodeParameter('includeTime', i) as boolean;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				responseData.push(
					includeTime
						? { [outputFieldName]: moment.tz(workflowTimezone) }
						: { [outputFieldName]: moment().startOf('day').tz(workflowTimezone) },
				);
			} else if (operation === 'addToDate') {
				const addToDate = this.getNodeParameter('addToDate', i) as string;
				const timeUnit = this.getNodeParameter('timeUnit', i) as string;
				const duration = this.getNodeParameter('duration', i) as number;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				try {
					const dateToAdd = moment.tz(addToDate, workflowTimezone);
					const returnedDate = moment(dateToAdd).add(
						duration,
						timeUnit as moment.unitOfTime.DurationConstructor,
					);
					responseData.push({ [outputFieldName]: returnedDate });
				} catch {
					throw new NodeOperationError(this.getNode(), 'Invalid date format');
				}
			} else if (operation === 'subtractFromDate') {
				const subtractFromDate = this.getNodeParameter('subtractFromDate', i) as string;
				const timeUnit = this.getNodeParameter('timeUnit', i) as string;
				const duration = this.getNodeParameter('duration', i) as number;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				try {
					const dateToAdd = moment.tz(subtractFromDate, workflowTimezone);
					const returnedDate = moment(dateToAdd).subtract(
						duration,
						timeUnit as moment.unitOfTime.DurationConstructor,
					);
					responseData.push({ [outputFieldName]: returnedDate });
				} catch {
					throw new NodeOperationError(this.getNode(), 'Invalid date format');
				}
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{
					itemData: { item: i },
				},
			);
			returnData.push(...executionData);
		}
		return this.prepareOutputData(returnData);
	}
}
