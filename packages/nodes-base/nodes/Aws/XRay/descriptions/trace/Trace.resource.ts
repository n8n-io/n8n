import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'getTraceSummaries',
		displayOptions: {
			show: {
				resource: ['trace'],
			},
		},
		options: [
			{
				name: 'Batch Get Traces',
				value: 'batchGetTraces',
				description: 'Get trace segments for specified trace IDs',
				action: 'Batch get traces',
				routing: {
					request: {
						method: 'POST',
						url: '/Traces',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							TraceIds: '={{ $parameter["traceIds"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get Service Graph',
				value: 'getServiceGraph',
				description: 'Get service graph for a time range',
				action: 'Get service graph',
				routing: {
					request: {
						method: 'POST',
						url: '/ServiceGraph',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							StartTime: '={{ $parameter["startTime"] }}',
							EndTime: '={{ $parameter["endTime"] }}',
							GroupName: '={{ $parameter["groupName"] }}',
							GroupARN: '={{ $parameter["groupARN"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get Trace Graph',
				value: 'getTraceGraph',
				description: 'Get trace graph for specified trace IDs',
				action: 'Get trace graph',
				routing: {
					request: {
						method: 'POST',
						url: '/TraceGraph',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							TraceIds: '={{ $parameter["traceIds"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Get Trace Summaries',
				value: 'getTraceSummaries',
				description: 'Get summaries of traces matching filter',
				action: 'Get trace summaries',
				routing: {
					request: {
						method: 'POST',
						url: '/TraceSummaries',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							StartTime: '={{ $parameter["startTime"] }}',
							EndTime: '={{ $parameter["endTime"] }}',
							FilterExpression: '={{ $parameter["filterExpression"] }}',
							Sampling: '={{ $parameter["sampling"] }}',
							SamplingStrategy: '={{ $parameter["samplingStrategy"] }}',
							NextToken: '={{ $parameter["nextToken"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Put Telemetry Records',
				value: 'putTelemetryRecords',
				description: 'Send telemetry data',
				action: 'Put telemetry records',
				routing: {
					request: {
						method: 'POST',
						url: '/TelemetryRecords',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							TelemetryRecords: '={{ $parameter["telemetryRecords"] }}',
							EC2InstanceId: '={{ $parameter["ec2InstanceId"] }}',
							Hostname: '={{ $parameter["hostname"] }}',
							ResourceARN: '={{ $parameter["resourceARN"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Put Trace Segments',
				value: 'putTraceSegments',
				description: 'Upload trace segment documents',
				action: 'Put trace segments',
				routing: {
					request: {
						method: 'POST',
						url: '/TraceSegments',
						headers: {
							'Content-Type': 'application/json',
						},
						body: {
							TraceSegmentDocuments: '={{ $parameter["traceSegmentDocuments"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},
	// Batch Get Traces / Get Trace Graph
	{
		displayName: 'Trace IDs',
		name: 'traceIds',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['batchGetTraces', 'getTraceGraph'],
			},
		},
		default: '[]',
		description: 'Array of trace IDs',
	},
	// Get Service Graph / Get Trace Summaries
	{
		displayName: 'Start Time',
		name: 'startTime',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['getServiceGraph', 'getTraceSummaries'],
			},
		},
		default: '',
		description: 'Start time (Unix timestamp)',
	},
	{
		displayName: 'End Time',
		name: 'endTime',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['getServiceGraph', 'getTraceSummaries'],
			},
		},
		default: '',
		description: 'End time (Unix timestamp)',
	},
	// Get Service Graph
	{
		displayName: 'Group Name',
		name: 'groupName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['getServiceGraph'],
			},
		},
		default: '',
		description: 'Group name filter',
	},
	{
		displayName: 'Group ARN',
		name: 'groupARN',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['getServiceGraph'],
			},
		},
		default: '',
		description: 'Group ARN filter',
	},
	// Get Trace Summaries
	{
		displayName: 'Filter Expression',
		name: 'filterExpression',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['getTraceSummaries'],
			},
		},
		default: '',
		description: 'Filter expression for traces',
	},
	{
		displayName: 'Sampling',
		name: 'sampling',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['getTraceSummaries'],
			},
		},
		default: false,
		description: 'Whether to sample traces',
	},
	{
		displayName: 'Sampling Strategy',
		name: 'samplingStrategy',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['getTraceSummaries'],
				sampling: [true],
			},
		},
		default: '{"Name": "PartialScan"}',
		description: 'Sampling strategy configuration',
	},
	// Put Telemetry Records
	{
		displayName: 'Telemetry Records',
		name: 'telemetryRecords',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['putTelemetryRecords'],
			},
		},
		default: '[]',
		description: 'Array of telemetry records',
	},
	{
		displayName: 'EC2 Instance ID',
		name: 'ec2InstanceId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['putTelemetryRecords'],
			},
		},
		default: '',
		description: 'EC2 instance ID',
	},
	{
		displayName: 'Hostname',
		name: 'hostname',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['putTelemetryRecords'],
			},
		},
		default: '',
		description: 'Hostname',
	},
	{
		displayName: 'Resource ARN',
		name: 'resourceARN',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['putTelemetryRecords'],
			},
		},
		default: '',
		description: 'Resource ARN',
	},
	// Put Trace Segments
	{
		displayName: 'Trace Segment Documents',
		name: 'traceSegmentDocuments',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['putTraceSegments'],
			},
		},
		default: '[]',
		description: 'Array of trace segment documents (JSON strings)',
	},
	// Common pagination
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['trace'],
				operation: ['batchGetTraces', 'getServiceGraph', 'getTraceGraph', 'getTraceSummaries'],
			},
		},
		default: '',
		description: 'Pagination token',
	},
];
