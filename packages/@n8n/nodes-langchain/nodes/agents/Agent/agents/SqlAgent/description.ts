import type { INodeProperties } from 'n8n-workflow';
import { SQL_PREFIX, SQL_SUFFIX } from './other/prompts';

export const sqlAgentAgentProperties: INodeProperties[] = [
	{
		displayName: 'Data Source',
		name: 'dataSource',
		type: 'options',
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
			},
		},
		default: 'sqlite',
		description: 'SQL database to connect to',
		options: [
			{
				name: 'MySQL',
				value: 'mysql',
				description: 'Connect to a MySQL database',
			},
			{
				name: 'Postgres',
				value: 'postgres',
				description: 'Connect to a Postgres database',
			},
			{
				name: 'SQLite',
				value: 'sqlite',
				description: 'Use SQLite by connecting a database file as binary input',
			},
		],
	},
	{
		displayName: 'Prompt',
		name: 'input',
		type: 'string',
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
			},
		},
		default: '',
		required: true,
		typeOptions: {
			rows: 5,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				agent: ['sqlAgent'],
			},
		},
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Ignored Tables',
				name: 'ignoredTables',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of tables to ignore from the database. If empty, no tables are ignored.',
			},
			{
				displayName: 'Include Sample Rows',
				name: 'includedSampleRows',
				type: 'number',
				description:
					'Number of sample rows to include in the prompt to the agent. It helps the agent to understand the schema of the database but it also increases the amount of tokens used.',
				default: 3,
			},
			{
				displayName: 'Included Tables',
				name: 'includedTables',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of tables to include in the database. If empty, all tables are included.',
			},
			{
				displayName: 'Prefix Prompt',
				name: 'prefixPrompt',
				type: 'string',
				default: SQL_PREFIX,
				description: 'Prefix prompt to use for the agent',
				typeOptions: {
					rows: 10,
				},
			},
			{
				displayName: 'Suffix Prompt',
				name: 'suffixPrompt',
				type: 'string',
				default: SQL_SUFFIX,
				description: 'Suffix prompt to use for the agent',
				typeOptions: {
					rows: 4,
				},
			},
			{
				displayName: 'Limit',
				name: 'topK',
				type: 'number',
				default: 10,
				description: 'The maximum number of results to return',
			},
		],
	},
];
