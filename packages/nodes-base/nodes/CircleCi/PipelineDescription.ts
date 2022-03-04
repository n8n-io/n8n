import {
	INodeProperties,
} from 'n8n-workflow';

export const pipelineOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'pipeline',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a pipeline',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all pipelines',
			},
			{
				name: 'Trigger',
				value: 'trigger',
				description: 'Trigger a pipeline',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const pipelineFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                               pipeline:shared                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Provider',
		name: 'vcs',
		type: 'options',
		options: [
			{
				name: 'Bitbucket',
				value: 'bitbucket',
			},
			{
				name: 'GitHub',
				value: 'github',
			},
		],
		displayOptions: {
			show: {
				operation: [
					'get',
					'getAll',
					'trigger',
				],
				resource: [
					'pipeline',
				],
			},
		},
		default: '',
		description: 'Version control system',
	},
	{
		displayName: 'Project Slug',
		name: 'projectSlug',
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'get',
					'getAll',
					'trigger',
				],
				resource: [
					'pipeline',
				],
			},
		},
		default: '',
		placeholder: 'n8n-io/n8n',
		description: 'Project slug in the form org-name/repo-name',
	},

/* -------------------------------------------------------------------------- */
/*                                 pipeline:get                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Pipeline Number',
		name: 'pipelineNumber',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'pipeline',
				],
			},
		},
		default: 1,
		description: 'The number of the pipeline',
	},

/* -------------------------------------------------------------------------- */
/*                                 pipeline:getAll                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'pipeline',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'pipeline',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'pipeline',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: '',
				description: 'The name of a vcs branch.',
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                                 pipeline:trigger                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'pipeline',
				],
				operation: [
					'trigger',
				],
			},
		},
		options: [
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: '',
				description: `The branch where the pipeline ran. The HEAD commit on this branch was used for the pipeline. Note that branch and tag are mutually exclusive.`,
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description: `The tag used by the pipeline. The commit that this tag points to was used for the pipeline. Note that branch and tag are mutually exclusive`,
			},
		],
	},
];
