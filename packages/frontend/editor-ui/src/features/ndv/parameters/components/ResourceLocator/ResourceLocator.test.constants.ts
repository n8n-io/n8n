import type { INode, INodeParameterResourceLocator, INodeProperties } from 'n8n-workflow';

export const TEST_MODEL_VALUE: INodeParameterResourceLocator = {
	__rl: true,
	value: 'test',
	mode: 'list',
	cachedResultName: 'table',
	cachedResultUrl: 'https://test.com/test',
};

export const TEST_PARAMETER_MULTI_MODE: INodeProperties = {
	displayName: 'Test Parameter',
	name: 'testParamMultiMode',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'testSearch', searchable: true },
		},
		{
			displayName: 'By URL',
			name: 'url',
			type: 'string',
			placeholder: 'https://test.com/test',
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'id',
		},
	],
};

export const TEST_PARAMETER_SINGLE_MODE: INodeProperties = {
	...TEST_PARAMETER_MULTI_MODE,
	name: 'testParameterSingleMode',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'testSearch', searchable: true },
		},
	],
};

export const TEST_PARAMETER_ADD_RESOURCE: INodeProperties = {
	...TEST_PARAMETER_MULTI_MODE,
	name: 'testParameterAddResource',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'testSearch',
				searchable: true,
				allowNewResource: {
					label: 'resourceLocator.mode.list.addNewResource.vectorStoreInMemory',
					method: 'testAddResource',
					defaultName: 'test',
				},
			},
		},
	],
};

export const TEST_NODE_MULTI_MODE: INode = {
	type: 'n8n-nodes-base.airtable',
	typeVersion: 2.1,
	position: [80, -260],
	id: '377e4287-b1e0-44cc-ba0f-7bb3d676d60c',
	name: 'Test Node - Multi Mode',
	parameters: {
		authentication: 'testAuth',
		resource: 'test',
		operation: 'get',
		testParamMultiMode: TEST_MODEL_VALUE,
		id: '',
		options: {},
	},
	credentials: {
		testAuth: {
			id: '1234',
			name: 'Test Account',
		},
	},
};

export const TEST_NODE_SINGLE_MODE: INode = {
	...TEST_NODE_MULTI_MODE,
	parameters: {
		authentication: 'testAuth',
		resource: 'test',
		operation: 'get',
		testParameterSingleMode: TEST_MODEL_VALUE,
		id: '',
		options: {},
	},
};

export const TEST_PARAMETER_SKIP_CREDENTIALS_CHECK: INodeProperties = {
	...TEST_PARAMETER_MULTI_MODE,
	name: 'testParameterSkipCredentialsCheck',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'testSearch',
				searchable: true,
				skipCredentialsCheckInRLC: true,
			},
		},
	],
};

export const TEST_NODE_NO_CREDENTIALS: INode = {
	...TEST_NODE_MULTI_MODE,
	name: 'Test Node - No Credentials',
	parameters: {
		authentication: undefined,
		resource: 'test',
		operation: 'get',
		testParameterSkipCredentialsCheck: TEST_MODEL_VALUE,
		id: '',
		options: {},
	},
	credentials: undefined,
};

export const TEST_PARAMETER_URL_REDIRECT: INodeProperties = {
	...TEST_PARAMETER_MULTI_MODE,
	name: 'testParameterUrlRedirect',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: {
				searchListMethod: 'testSearch',
				searchable: true,
				allowNewResource: {
					label: 'resourceLocator.dataTable.createNew',
					url: '/projects/{{$projectId}}/datatables/new',
				},
			},
		},
	],
};

export const TEST_NODE_URL_REDIRECT: INode = {
	...TEST_NODE_MULTI_MODE,
	name: 'Test Node - URL Redirect',
	parameters: {
		resource: 'test',
		operation: 'get',
		testParameterUrlRedirect: TEST_MODEL_VALUE,
		id: '',
		options: {},
	},
};
