import type { INodeProperties } from 'n8n-workflow';

export const repoOwnerSelect: INodeProperties = {
	displayName: 'Repository Owner',
	name: 'owner',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'Repository Owner',
			name: 'list',
			type: 'list',
			placeholder: 'Select an owner...',
			typeOptions: {
				searchListMethod: 'getUsers',
				searchable: true,
				searchFilterRequired: false,
			},
		},
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://github.com/n8n-io',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/github.com\\/([-_0-9a-zA-Z]+)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https:\\/\\/github.com\\/([-_0-9a-zA-Z]+)(?:.*)',
						errorMessage: 'Not a valid GitHub URL',
					},
				},
			],
		},
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. n8n-io',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[-_a-zA-Z0-9]+',
						errorMessage: 'Not a valid GitHub Owner Name',
					},
				},
			],
			url: '=https://github.com/{{$value}}',
		},
	],
};

export const repoNameSelect: INodeProperties = {
	displayName: 'Repository Name',
	name: 'repository',
	type: 'resourceLocator',
	default: {
		mode: 'list',
		value: '',
	},
	required: true,
	modes: [
		{
			displayName: 'Repository Name',
			name: 'list',
			type: 'list',
			placeholder: 'Select an Repository...',
			typeOptions: {
				searchListMethod: 'getRepositories',
				searchable: true,
			},
		},
		{
			displayName: 'Link',
			name: 'url',
			type: 'string',
			placeholder: 'e.g. https://github.com/n8n-io/n8n',
			extractValue: {
				type: 'regex',
				regex: 'https:\\/\\/github.com\\/(?:[-_0-9a-zA-Z]+)\\/([-_.0-9a-zA-Z]+)',
			},
			validation: [
				{
					type: 'regex',
					properties: {
						regex: 'https:\\/\\/github.com\\/(?:[-_0-9a-zA-Z]+)\\/([-_.0-9a-zA-Z]+)(?:.*)',
						errorMessage: 'Not a valid GitHub Repository URL',
					},
				},
			],
		},
		{
			displayName: 'By Name',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. n8n',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '[-_.0-9a-zA-Z]+',
						errorMessage: 'Not a valid GitHub Repository Name',
					},
				},
			],
			url: '=https://github.com/{{$parameter["owner"]}}/{{$value}}',
		},
	],
	displayOptions: {
		hide: {
			resource: ['user', 'organization'],
			operation: ['getRepositories'],
		},
	},
};

export const issueSelect: INodeProperties = {
	displayName: 'Issue',
	name: 'issue',
	type: 'resourceLocator',
	default: {
		mode: 'list',
		value: '',
	},
	required: true,
	modes: [
		{
			displayName: 'Issue',
			name: 'list',
			type: 'list',
			placeholder: 'Select an Issue...',
			typeOptions: {
				searchListMethod: 'getIssues',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'name',
			type: 'string',
			placeholder: 'e.g. 123',
			url: '=https://github.com/{{$parameter.owner}}/{{$parameter.repository}}/issues/{{$value}}',
		},
	],
};
