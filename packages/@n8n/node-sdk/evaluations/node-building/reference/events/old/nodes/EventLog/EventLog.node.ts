import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

const BASE_URL = 'http://127.0.0.1:18090/events/v1';

const getAll = { show: { resource: ['event'], operation: ['getAll'] } };

/** The offset of the zone at this UTC time, in milliseconds. */
function zoneOffset(utc: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(utc));
	const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);
	const wall = Date.UTC(
		part('year'),
		part('month') - 1,
		part('day'),
		part('hour'),
		part('minute'),
		part('second'),
	);
	return wall - utc;
}

/** The API form of a time: UTC, whole seconds. A value without an offset is local in `timeZone`. */
function toUtc(value: string, timeZone: string): string {
	const wall = Date.parse(`${value}Z`);
	const instant = /(Z|[+-]\d{2}:\d{2})$/i.test(value)
		? Date.parse(value)
		: wall - zoneOffset(wall - zoneOffset(wall, timeZone), timeZone);
	return new Date(instant).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const nextLink = (header: unknown) =>
	typeof header === 'string' ? /<([^>]+)>;\s*rel="next"/.exec(header)?.[1] : undefined;

export class EventLog implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Event Log',
		name: 'eventLog',
		icon: 'file:eventLog.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'List events of the Events API',
		defaults: { name: 'Event Log' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'eventLogApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Event', value: 'event' }],
				default: 'event',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['event'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many events',
						description: 'Get many events',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Since',
				name: 'since',
				type: 'string',
				required: true,
				displayOptions: getAll,
				default: '',
				description: 'ISO 8601 date-time, inclusive. Without an offset it is local in Time Zone.',
			},
			{
				displayName: 'Until',
				name: 'until',
				type: 'string',
				displayOptions: getAll,
				default: '',
				description: 'ISO 8601 date-time, exclusive. Without an offset it is local in Time Zone.',
			},
			{
				displayName: 'Time Zone',
				name: 'timeZone',
				type: 'string',
				displayOptions: getAll,
				default: 'UTC',
				description: 'IANA time zone name, such as Europe/Berlin',
			},
			{
				displayName: 'Include Deleted',
				name: 'includeDeleted',
				type: 'boolean',
				displayOptions: getAll,
				default: false,
				description: 'Whether to also return deleted events',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: getAll,
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { ...getAll.show, returnAll: [false] } },
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		for (const itemIndex of this.getInputData().keys()) {
			try {
				const timeZone = String(this.getNodeParameter('timeZone', itemIndex, 'UTC'));
				const until = String(this.getNodeParameter('until', itemIndex, ''));
				const includeDeleted = Boolean(this.getNodeParameter('includeDeleted', itemIndex, false));
				const returnAll = Boolean(this.getNodeParameter('returnAll', itemIndex, false));
				const limit = returnAll ? Infinity : Number(this.getNodeParameter('limit', itemIndex, 50));
				const readPage = async (
					request: IHttpRequestOptions,
					kept: readonly IDataObject[],
				): Promise<readonly IDataObject[]> => {
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'eventLogApi',
						{ ...request, json: true, returnFullResponse: true },
					);
					const data: IDataObject[] = Array.isArray(response.body?.data) ? response.body.data : [];
					const all = [
						...kept,
						...data.filter((entry) => includeDeleted || entry.deleted !== true),
					];
					const next = nextLink(response.headers?.link);
					return next && all.length < limit
						? await readPage({ method: 'GET', url: next }, all)
						: all.slice(0, limit);
				};
				const events = await readPage(
					{
						method: 'GET',
						url: `${BASE_URL}/events`,
						qs: {
							occurred_after: toUtc(String(this.getNodeParameter('since', itemIndex)), timeZone),
							...(until ? { occurred_before: toUtc(until, timeZone) } : {}),
							limit: 50,
						},
					},
					[],
				);
				for (const entry of events) returnData.push({ json: entry, pairedItem: itemIndex });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: itemIndex });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}
		return [returnData];
	}
}
