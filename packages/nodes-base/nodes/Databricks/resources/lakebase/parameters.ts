import type { INodeProperties } from 'n8n-workflow';

const showForLakebase = { resource: ['lakebase'] };

export const lakebaseParameters: INodeProperties[] = [
	{
		displayName: 'Project',
		name: 'lakebaseProject',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Lakebase project',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseProjects',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. my-project',
			},
		],
	},
	{
		displayName: 'Branch',
		name: 'lakebaseBranch',
		type: 'resourceLocator',
		typeOptions: {
			loadOptionsDependsOn: ['lakebaseProject.value'],
		},
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The branch of the project',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseBranches',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. production',
			},
		],
	},
	{
		displayName: 'Database',
		name: 'lakebaseDatabase',
		type: 'resourceLocator',
		typeOptions: {
			loadOptionsDependsOn: ['lakebaseProject.value', 'lakebaseBranch.value'],
		},
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The Postgres database on the branch',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. databricks_postgres',
			},
		],
	},
	{
		displayName: 'Schema',
		name: 'lakebaseSchema',
		type: 'resourceLocator',
		typeOptions: {
			loadOptionsDependsOn: [
				'lakebaseProject.value',
				'lakebaseBranch.value',
				'lakebaseDatabase.value',
			],
		},
		default: { mode: 'list', value: 'public', cachedResultName: 'public' },
		required: true,
		description:
			'The Postgres schema. To use a schema other than public, select By ID and enter its name.',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseSchemas',
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. public',
			},
		],
	},
	{
		displayName: 'Table',
		name: 'lakebaseTable',
		type: 'resourceLocator',
		typeOptions: {
			loadOptionsDependsOn: [
				'lakebaseProject.value',
				'lakebaseBranch.value',
				'lakebaseDatabase.value',
				'lakebaseSchema.value',
			],
		},
		default: { mode: 'list', value: '' },
		required: true,
		description: 'The table in the schema',
		displayOptions: {
			show: showForLakebase,
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'getLakebaseTables',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. orders',
			},
		],
	},
];
