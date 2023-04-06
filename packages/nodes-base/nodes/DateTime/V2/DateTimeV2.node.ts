import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { CurrentDateDescription } from './CurrentDateDescription';
import { AddToDateDescription } from './AddToDateDescription';
import { SubtractFromDateDescription } from './SubtractFromDateDescription';
import { FormatDateDescription } from './FormatDateDescription';
import { RoundDateDescription } from './RoundDateDescription';
import { GetTimeBetweenDatesDescription } from './GetTimeBetweenDates';
import type { DateTimeUnit, DurationUnit } from 'luxon';
import { DateTime } from 'luxon';
import { ExtractDateDescription } from './ExtractDateDescription';
import { parseDate } from './GenericFunctions';

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
				...FormatDateDescription,
				...RoundDateDescription,
				...GetTimeBetweenDatesDescription,
				...ExtractDateDescription,
			],
		};
	}

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
						? { [outputFieldName]: DateTime.now().setZone(workflowTimezone) }
						: {
								[outputFieldName]: DateTime.now().setZone(workflowTimezone).startOf('day'),
						  },
				);
			} else if (operation === 'addToDate') {
				const addToDate = this.getNodeParameter('addToDate', i) as string;
				const timeUnit = this.getNodeParameter('timeUnit', i) as string;
				const duration = this.getNodeParameter('duration', i) as number;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				const dateToAdd = parseDate.call(this, addToDate, workflowTimezone);
				const returnedDate = dateToAdd.plus({ [timeUnit]: duration });
				responseData.push({ [outputFieldName]: returnedDate });
			} else if (operation === 'subtractFromDate') {
				const subtractFromDate = this.getNodeParameter('subtractFromDate', i) as string;
				const timeUnit = this.getNodeParameter('timeUnit', i) as string;
				const duration = this.getNodeParameter('duration', i) as number;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				const dateToAdd = parseDate.call(this, subtractFromDate, workflowTimezone);
				const returnedDate = dateToAdd.minus({ [timeUnit]: duration });
				responseData.push({ [outputFieldName]: returnedDate });
			} else if (operation === 'formatDate') {
				const date = this.getNodeParameter('date', i) as string;
				const format = this.getNodeParameter('format', i) as string;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				const dateLuxon = parseDate.call(this, date, workflowTimezone);
				if (format === 'custom') {
					const customFormat = this.getNodeParameter('customFormat', i) as string;
					responseData.push({
						[outputFieldName]: dateLuxon.toFormat(customFormat),
					});
				} else {
					responseData.push({
						[outputFieldName]: dateLuxon.toFormat(format),
					});
				}
			} else if (operation === 'roundDate') {
				const date = this.getNodeParameter('date', i) as string;
				const mode = this.getNodeParameter('mode', i) as string;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				const dateLuxon = parseDate.call(this, date, workflowTimezone);
				if (mode === 'roundDown') {
					const toNearest = this.getNodeParameter('toNearest', i) as string;
					responseData.push({
						[outputFieldName]: dateLuxon.startOf(toNearest as DateTimeUnit),
					});
				} else if (mode === 'roundUp') {
					const to = this.getNodeParameter('to', i) as string;
					responseData.push({
						[outputFieldName]: dateLuxon.plus({ [to]: 1 }).startOf(to as DateTimeUnit),
					});
				}
			} else if (operation === 'getTimeBetweenDates') {
				const startDate = this.getNodeParameter('startDate', i) as string;
				const endDate = this.getNodeParameter('endDate', i) as string;
				const unit = this.getNodeParameter('units', i) as DurationUnit[];
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				const luxonStartDate = parseDate.call(this, startDate, workflowTimezone);
				const luxonEndDate = parseDate.call(this, endDate, workflowTimezone);
				const duration = luxonEndDate.diff(luxonStartDate, unit);
				responseData.push({ [outputFieldName]: duration.toObject() });
			} else if (operation === 'extractDate') {
				const date = this.getNodeParameter('date', i) as string | DateTime;
				const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
				const part = this.getNodeParameter('part', i) as keyof DateTime;
				const parsedDate = parseDate.call(this, date, workflowTimezone);
				const selectedPart = parsedDate.get(part);
				responseData.push({ [outputFieldName]: selectedPart });
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
