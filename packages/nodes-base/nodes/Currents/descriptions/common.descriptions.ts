import type { INodeProperties } from 'n8n-workflow';

export const projectRLC: INodeProperties = {
	displayName: 'Project',
	name: 'projectId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The Currents project',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a project...',
			typeOptions: {
				searchListMethod: 'getProjects',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. abc123',
		},
	],
};

/** Expression: comma-separated string → array for brackets[] query serialization */
const COMMA_TO_ARRAY_VALUE =
	"={{ $value && String($value).trim() ? String($value).split(',').map(v => v.trim()).filter(Boolean) : undefined }}";

export const filterAuthorsOption: INodeProperties = {
	displayName: 'Git Authors',
	name: 'authors',
	type: 'string',
	default: '',
	routing: {
		send: {
			type: 'query',
			property: 'authors',
			value: COMMA_TO_ARRAY_VALUE,
		},
	},
	description: 'Filter by git authors (comma-separated for multiple)',
};

export const filterBranchesOption: INodeProperties = {
	displayName: 'Branches',
	name: 'branches',
	type: 'string',
	default: '',
	routing: {
		send: {
			type: 'query',
			property: 'branches',
			value: COMMA_TO_ARRAY_VALUE,
		},
	},
	description: 'Filter by branches (comma-separated for multiple)',
};

export const filterGroupsOption: INodeProperties = {
	displayName: 'Groups',
	name: 'groups',
	type: 'string',
	default: '',
	routing: {
		send: {
			type: 'query',
			property: 'groups',
			value: COMMA_TO_ARRAY_VALUE,
		},
	},
	description: 'Filter by groups (comma-separated for multiple)',
};

export const filterTagsOption: INodeProperties = {
	displayName: 'Tags',
	name: 'tags',
	type: 'string',
	default: '',
	routing: {
		send: {
			type: 'query',
			property: 'tags',
			value: COMMA_TO_ARRAY_VALUE,
		},
	},
	description: 'Filter by tags (comma-separated for multiple)',
};
