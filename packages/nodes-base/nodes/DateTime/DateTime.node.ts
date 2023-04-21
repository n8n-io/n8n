import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { deepCopy, NodeOperationError } from 'n8n-workflow';

import set from 'lodash.set';

import moment from 'moment-timezone';

import { DateTime as LuxonDateTime } from 'luxon';

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

export class DateTime implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Date & Time',
		name: 'dateTime',
		icon: 'fa:clock',
		group: ['transform'],
		version: 1,
		description: 'Allows you to manipulate date and time values',
		subtitle: '={{$parameter["action"]}}',
		defaults: {
			name: 'Date & Time',
			color: '#408000',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName:
					"More powerful date functionality is available in <a href='https://docs.n8n.io/code-examples/expressions/luxon/' target='_blank'>expressions</a>,</br> e.g. <code>{{ $now.plus(1, 'week') }}</code>",
				name: 'noticeDateTime',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Calculate a Date',
						description: 'Add or subtract time from a date',
						value: 'calculate',
						action: 'Add or subtract time from a date',
					},
					{
						name: 'Format a Date',
						description: 'Convert a date to a different format',
						value: 'format',
						action: 'Convert a date to a different format',
					},
				],
				default: 'format',
			},
			{
				displayName: 'Value',
				name: 'value',
				displayOptions: {
					show: {
						action: ['format'],
					},
				},
				type: 'string',
				default: '',
				description: 'The value that should be converted',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						action: ['format'],
					},
				},
				description: 'Name of the property to which to write the converted date',
			},
			{
				displayName: 'Custom Format',
				name: 'custom',
				displayOptions: {
					show: {
						action: ['format'],
					},
				},
				type: 'boolean',
				default: false,
				description: 'Whether a predefined format should be selected or custom format entered',
			},
			{
				displayName: 'To Format',
				name: 'toFormat',
				displayOptions: {
					show: {
						action: ['format'],
						custom: [true],
					},
				},
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'The format to convert the date to',
			},
			{
				displayName: 'To Format',
				name: 'toFormat',
				type: 'options',
				displayOptions: {
					show: {
						action: ['format'],
						custom: [false],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
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
				description: 'The format to convert the date to',
			},
			{
				displayName: 'Options',
				name: 'options',
				displayOptions: {
					show: {
						action: ['format'],
					},
				},
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'From Format',
						name: 'fromFormat',
						type: 'string',
						default: '',
						description: 'In case the input format is not recognized you can provide the format',
					},
					{
						displayName: 'From Timezone Name or ID',
						name: 'fromTimezone',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTimezones',
						},
						default: 'UTC',
						description:
							'The timezone to convert from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'To Timezone Name or ID',
						name: 'toTimezone',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTimezones',
						},
						default: 'UTC',
						description:
							'The timezone to convert to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
				],
			},
			{
				displayName: 'Date Value',
				name: 'value',
				displayOptions: {
					show: {
						action: ['calculate'],
					},
				},
				type: 'string',
				default: '',
				description: 'The date string or timestamp from which you want to add/subtract time',
				required: true,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				displayOptions: {
					show: {
						action: ['calculate'],
					},
				},
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add time to Date Value',
						action: 'Add time to Date Value',
					},
					{
						name: 'Subtract',
						value: 'subtract',
						description: 'Subtract time from Date Value',
						action: 'Subtract time from Date Value',
					},
				],
				default: 'add',
				required: true,
			},
			{
				displayName: 'Duration',
				name: 'duration',
				displayOptions: {
					show: {
						action: ['calculate'],
					},
				},
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
				required: true,
				description: 'E.g. enter “10” then select “Days” if you want to add 10 days to Date Value.',
			},
			{
				displayName: 'Time Unit',
				name: 'timeUnit',
				description: 'Time unit for Duration parameter above',
				displayOptions: {
					show: {
						action: ['calculate'],
					},
				},
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Quarters',
						value: 'quarters',
					},
					{
						name: 'Years',
						value: 'years',
					},
					{
						name: 'Months',
						value: 'months',
					},
					{
						name: 'Weeks',
						value: 'weeks',
					},
					{
						name: 'Days',
						value: 'days',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Milliseconds',
						value: 'milliseconds',
					},
				],
				default: 'days',
				required: true,
			},
			{
				displayName: 'Property Name',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						action: ['calculate'],
					},
				},
				description: 'Name of the output property to which to write the converted date',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						action: ['calculate'],
					},
				},
				options: [
					{
						displayName: 'From Format',
						name: 'fromFormat',
						type: 'string',
						default: '',
						description:
							'Format for parsing the value as a date. If unrecognized, specify the <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.datetime/#faqs">format</a> for the value.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the timezones to display them to user so that they can
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
		const length = items.length;
		const returnData: INodeExecutionData[] = [];

		const workflowTimezone = this.getTimezone();
		let item: INodeExecutionData;

		for (let i = 0; i < length; i++) {
			try {
				const action = this.getNodeParameter('action', 0) as string;
				item = items[i];

				if (action === 'format') {
					let currentDate = this.getNodeParameter('value', i) as string;
					const dataPropertyName = this.getNodeParameter('dataPropertyName', i);
					const toFormat = this.getNodeParameter('toFormat', i) as string;
					const options = this.getNodeParameter('options', i);
					let newDate;

					if ((currentDate as unknown as IDataObject) instanceof LuxonDateTime) {
						currentDate = (currentDate as unknown as LuxonDateTime).toISO();
					}

					if (currentDate === undefined) {
						continue;
					}
					if (
						options.fromFormat === undefined &&
						!moment(currentDate as string | number).isValid()
					) {
						throw new NodeOperationError(
							this.getNode(),
							'The date input format could not be recognized. Please set the "From Format" field',
							{ itemIndex: i },
						);
					}

					if (Number.isInteger(currentDate as unknown as number)) {
						newDate = moment.unix(currentDate as unknown as number);
					} else {
						if (options.fromTimezone || options.toTimezone) {
							const fromTimezone = options.fromTimezone || workflowTimezone;
							if (options.fromFormat) {
								newDate = moment.tz(
									currentDate,
									options.fromFormat as string,
									fromTimezone as string,
								);
							} else {
								newDate = moment.tz(currentDate, fromTimezone as string);
							}
						} else {
							if (options.fromFormat) {
								newDate = moment(currentDate, options.fromFormat as string);
							} else {
								newDate = moment(currentDate);
							}
						}
					}

					if (options.toTimezone || options.fromTimezone) {
						// If either a source or a target timezone got defined the
						// timezone of the date has to be changed. If a target-timezone
						// is set use it else fall back to workflow timezone.
						newDate = newDate.tz((options.toTimezone as string) || workflowTimezone);
					}

					newDate = newDate.format(toFormat);

					let newItem: INodeExecutionData;
					if (dataPropertyName.includes('.')) {
						// Uses dot notation so copy all data
						newItem = {
							json: deepCopy(item.json),
							pairedItem: {
								item: i,
							},
						};
					} else {
						// Does not use dot notation so shallow copy is enough
						newItem = {
							json: { ...item.json },
							pairedItem: {
								item: i,
							},
						};
					}

					if (item.binary !== undefined) {
						newItem.binary = item.binary;
					}

					set(newItem, `json.${dataPropertyName}`, newDate);

					returnData.push(newItem);
				}

				if (action === 'calculate') {
					const dateValue = this.getNodeParameter('value', i) as string;
					const operation = this.getNodeParameter('operation', i) as 'add' | 'subtract';
					const duration = this.getNodeParameter('duration', i) as number;
					const timeUnit = this.getNodeParameter('timeUnit', i) as moment.DurationInputArg2;
					const { fromFormat } = this.getNodeParameter('options', i) as { fromFormat?: string };
					const dataPropertyName = this.getNodeParameter('dataPropertyName', i);

					const newDate = fromFormat
						? parseDateByFormat.call(this, dateValue, fromFormat)
						: parseDateByDefault.call(this, dateValue);

					operation === 'add'
						? newDate.add(duration, timeUnit).utc().format()
						: newDate.subtract(duration, timeUnit).utc().format();

					let newItem: INodeExecutionData;
					if (dataPropertyName.includes('.')) {
						// Uses dot notation so copy all data
						newItem = {
							json: deepCopy(item.json),
							pairedItem: {
								item: i,
							},
						};
					} else {
						// Does not use dot notation so shallow copy is enough
						newItem = {
							json: { ...item.json },
							pairedItem: {
								item: i,
							},
						};
					}

					if (item.binary !== undefined) {
						newItem.binary = item.binary;
					}

					set(newItem, `json.${dataPropertyName}`, newDate.toISOString());

					returnData.push(newItem);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
