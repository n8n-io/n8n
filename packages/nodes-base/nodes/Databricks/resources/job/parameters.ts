import type { INodeProperties } from 'n8n-workflow';

import { JOB_RUN_DEFAULT_TIMEOUT_SECONDS } from '../../constants';

const showForRun = { resource: ['job'], operation: ['run'] };
const showForGetRunOutput = { resource: ['job'], operation: ['getRunOutput'] };

export const jobParameters: INodeProperties[] = [
	{
		displayName: 'Run',
		name: 'runId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The job run to read the output of',
		displayOptions: {
			show: showForGetRunOutput,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getRuns',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 41847992357943',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Must be a numeric run ID',
						},
					},
				],
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder:
					'e.g. https://adb-xxx.azuredatabricks.net/jobs/281874479417551/runs/41847992357943',
				extractValue: {
					type: 'regex',
					regex:
						'https://[^/]+/(?:jobs/[0-9]+/runs|\\?o=[0-9]+#job/[0-9]+/run|#job/[0-9]+/run)/([0-9]+)',
				},
			},
		],
	},
	{
		displayName: 'Job',
		name: 'jobId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The job to run',
		displayOptions: {
			show: showForRun,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getJobs',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 281874479417551',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: '^[0-9]+$',
							errorMessage: 'Must be a numeric job ID',
						},
					},
				],
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://adb-xxx.azuredatabricks.net/jobs/281874479417551',
				extractValue: {
					type: 'regex',
					regex: 'https://[^/]+/(?:jobs|\\?o=[0-9]+#job|#job)/([0-9]+)',
				},
			},
		],
	},
	{
		displayName: 'Job Parameters',
		name: 'jobParameters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Parameter',
		description:
			'Job-level parameters for this run. They override the default values defined on the job.',
		displayOptions: {
			show: showForRun,
		},
		options: [
			{
				name: 'parameters',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. environment',
						description: 'Name of a parameter defined on the job',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		default: false,
		description:
			'Whether to wait until the run finishes and return the final run. When off, the node returns the run ID right away and the job keeps running in Databricks.',
		displayOptions: {
			show: showForRun,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: { ...showForRun, waitForCompletion: [true] },
		},
		options: [
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: JOB_RUN_DEFAULT_TIMEOUT_SECONDS,
				typeOptions: { minValue: 1 },
				description:
					'Maximum time in seconds to wait for the run to finish. The node fails if the run is still going after this time.',
			},
		],
	},
];
