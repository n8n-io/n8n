import type { DateTimeUnit, DurationUnit } from 'luxon';
import { DateTime } from 'luxon';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';

import { AddToDateDescription } from './AddToDateDescription';
import { CurrentDateDescription } from './CurrentDateDescription';
import { ExtractDateDescription } from './ExtractDateDescription';
import { FormatDateDescription } from './FormatDateDescription';
import { parseDate } from './GenericFunctions';
import { GetTimeBetweenDatesDescription } from './GetTimeBetweenDates';
import { RoundDateDescription } from './RoundDateDescription';
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
			usableAsTool: true,
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			description: 'Manipulate date and time values',
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
		const operation = this.getNodeParameter('operation', 0);
		const workflowTimezone = this.getTimezone();
		const includeInputFields = this.getNodeParameter(
			'options.includeInputFields',
			0,
			false,
		) as boolean;

		const copyShallow = (item: INodeExecutionData) => ({
			json: { ...item.json },
			binary: item.binary,
		});

		for (let i = 0; i < items.length; i++) {
			try {
				const item: INodeExecutionData = includeInputFields ? copyShallow(items[i]) : { json: {} };
				item.pairedItem = {
					item: i,
				};

				if (operation === 'getCurrentDate') {
					const includeTime = this.getNodeParameter('includeTime', i) as boolean;
					const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
					const { timezone } = this.getNodeParameter('options', i) as {
						timezone: string;
					};

					const newLocal = timezone ? timezone : workflowTimezone;
					if (DateTime.now().setZone(newLocal).invalidReason === 'unsupported zone') {
						throw new NodeOperationError(
							this.getNode(),
							`The timezone ${newLocal} is not valid. Please check the timezone.`,
						);
					}

					if (includeTime) {
						item.json[outputFieldName] = DateTime.now().setZone(newLocal).toString();
					} else {
						item.json[outputFieldName] = DateTime.now().setZone(newLocal).startOf('day').toString();
					}
					returnData.push(item);
				} else if (operation === 'addToDate') {
					const addToDate = this.getNodeParameter('magnitude', i) as string;
					const timeUnit = this.getNodeParameter('timeUnit', i) as string;
					const duration = this.getNodeParameter('duration', i) as number;
					const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;

					const dateToAdd = parseDate.call(this, addToDate, { timezone: workflowTimezone });
					const returnedDate = dateToAdd.plus({ [timeUnit]: duration });

					item.json[outputFieldName] = returnedDate.toString();
					returnData.push(item);
				} else if (operation === 'subtractFromDate') {
					const subtractFromDate = this.getNodeParameter('magnitude', i) as string;
					const timeUnit = this.getNodeParameter('timeUnit', i) as string;
					const duration = this.getNodeParameter('duration', i) as number;
					const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;

					const dateToAdd = parseDate.call(this, subtractFromDate, { timezone: workflowTimezone });
					const returnedDate = dateToAdd.minus({ [timeUnit]: duration });

					item.json[outputFieldName] = returnedDate.toString();
					returnData.push(item);
				} else if (operation === 'formatDate') {
					const date = this.getNodeParameter('date', i) as string;
					const format = this.getNodeParameter('format', i) as string;
					const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
					const { timezone, fromFormat } = this.getNodeParameter('options', i) as {
						timezone: boolean;
						fromFormat: string;
					};

					if (date === null || date === undefined) {
						item.json[outputFieldName] = date;
					} else {
						const dateLuxon = parseDate.call(this, date, {
							timezone: timezone ? workflowTimezone : undefined,
							fromFormat,
						});
						if (format === 'custom') {
							const customFormat = this.getNodeParameter('customFormat', i) as string;
							item.json[outputFieldName] = dateLuxon.toFormat(customFormat);
						} else {
							item.json[outputFieldName] = dateLuxon.toFormat(format);
						}
					}
					returnData.push(item);
				} else if (operation === 'roundDate') {
					const date = this.getNodeParameter('date', i) as string;
					const mode = this.getNodeParameter('mode', i) as string;
					const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;

					const dateLuxon = parseDate.call(this, date, { timezone: workflowTimezone });

					if (mode === 'roundDown') {
						const toNearest = this.getNodeParameter('toNearest', i) as string;
						item.json[outputFieldName] = dateLuxon.startOf(toNearest as DateTimeUnit).toString();
					} else if (mode === 'roundUp') {
						const to = this.getNodeParameter('to', i) as string;
						item.json[outputFieldName] = dateLuxon
							.plus({ [to]: 1 })
							.startOf(to as DateTimeUnit)
							.toString();
					}
					returnData.push(item);
				} else if (operation === 'getTimeBetweenDates') {
					const startDate = this.getNodeParameter('startDate', i) as string;
					const endDate = this.getNodeParameter('endDate', i) as string;
					const unit = this.getNodeParameter('units', i) as DurationUnit[];
					const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
					const { isoString } = this.getNodeParameter('options', i) as {
						isoString: boolean;
					};

					const luxonStartDate = parseDate.call(this, startDate, { timezone: workflowTimezone });
					const luxonEndDate = parseDate.call(this, endDate, { timezone: workflowTimezone });
					const duration = luxonEndDate.diff(luxonStartDate, unit);
					if (isoString) {
						item.json[outputFieldName] = duration.toString();
					} else {
						item.json[outputFieldName] = duration.toObject();
					}
					returnData.push(item);
				} else if (operation === 'extractDate') {
					const date = this.getNodeParameter('date', i) as string | DateTime;
					const outputFieldName = this.getNodeParameter('outputFieldName', i) as string;
					const part = this.getNodeParameter('part', i) as keyof DateTime | 'week';

					const parsedDate = parseDate.call(this, date, { timezone: workflowTimezone });
					const selectedPart = part === 'week' ? parsedDate.weekNumber : parsedDate.get(part);
					item.json[outputFieldName] = selectedPart;
					returnData.push(item);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
			}
		}
		return [returnData];
	}
}
