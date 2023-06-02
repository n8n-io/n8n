import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';
import type { ResourceMapperFields } from 'n8n-workflow';

export const NODE_PARAMETER_VALUES = {
	authentication: 'oAuth2',
	resource: 'sheet',
	operation: 'appendOrUpdate',
	documentId: {
		__rl: true,
		value:
			'https://docs.google.com/spreadsheets/d/1BAjxEhlUu5tXDCMQcjqjguIZDFuct3FYkdo7flxl3yc/edit#gid=0',
		mode: 'url',
		__regex: 'https:\\/\\/(?:drive|docs)\\.google\\.com\\/\\w+\\/d\\/([0-9a-zA-Z\\-_]+)(?:\\/.*|)',
	},
	sheetName: {
		__rl: true,
		value: 'gid=0',
		mode: 'list',
		cachedResultName: 'Users',
		cachedResultUrl:
			'https://docs.google.com/spreadsheets/d/1BAjxEhlUu5tXDCMQcjqjguIZDFuct3FYkdo7flxl3yc/edit#gid=0',
	},
	columns: {
		mappingMode: 'defineBelow',
		value: null,
	},
	options: {},
};

export const UPDATED_SCHEMA = [
	{
		id: 'First name',
		displayName: 'First name',
		match: false,
		required: true,
		defaultMatch: false,
		display: true,
		type: 'string',
		canBeUsedToMatch: true,
		removed: false,
	},
	{
		id: 'Last name',
		displayName: 'Last name',
		match: false,
		required: true,
		defaultMatch: false,
		display: true,
		type: 'string',
		canBeUsedToMatch: true,
		removed: false,
	},
	{
		id: 'Username',
		displayName: 'Username',
		match: false,
		required: false,
		defaultMatch: false,
		display: true,
		type: 'string',
		canBeUsedToMatch: true,
		removed: false,
	},
	{
		id: 'Address',
		displayName: 'Address',
		match: false,
		required: false,
		defaultMatch: false,
		display: true,
		type: 'string',
		canBeUsedToMatch: true,
		removed: true,
	},
	{
		id: 'id',
		displayName: 'id',
		match: false,
		required: true,
		defaultMatch: true,
		display: true,
		type: 'string',
		canBeUsedToMatch: true,
		removed: false,
	},
];

export const DEFAULT_SETUP = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
			},
		},
	}),
	props: {
		path: 'parameters.columns',
		dependentParametersValues: 'gid=0',
		inputSize: 'small',
		labelSize: 'small',
		node: {
			parameters: NODE_PARAMETER_VALUES,
			id: 'f63efb2d-3cc5-4500-89f9-b39aab19baf5',
			name: 'Google Sheets',
			type: 'n8n-nodes-base.googleSheets',
			typeVersion: 4,
			position: [1120, 380],
			credentials: {},
			disabled: false,
		},
		parameter: {
			displayName: 'Columns',
			name: 'columns',
			type: 'resourceMapper',
			default: {
				mappingMode: 'defineBelow',
				value: {},
			},
			required: true,
			typeOptions: {
				loadOptionsDependsOn: ['sheetName.value'],
				resourceMapper: {
					resourceMapperMethod: 'getMappingColumns',
					mode: 'upsert',
					addAllFields: true,
					noFieldsError: 'No columns found in sheet.',
					multiKeyMatch: false,
					fieldWords: {
						singular: 'column',
						plural: 'columns',
					},
				},
			},
			displayOptions: {
				show: {
					resource: ['sheet'],
					operation: ['appendOrUpdate'],
					'@version': [4],
				},
				hide: {
					sheetName: [''],
				},
			},
		},
	},
};

export const MAPPING_COLUMNS_RESPONSE: ResourceMapperFields = {
	fields: [
		{
			id: 'First name',
			displayName: 'First name',
			match: false,
			required: true,
			defaultMatch: false,
			display: true,
			type: 'string',
			canBeUsedToMatch: true,
		},
		{
			id: 'Last name',
			displayName: 'Last name',
			match: false,
			required: true,
			defaultMatch: false,
			display: true,
			type: 'string',
			canBeUsedToMatch: true,
		},
		{
			id: 'Username',
			displayName: 'Username',
			match: false,
			required: false,
			defaultMatch: false,
			display: true,
			type: 'string',
			canBeUsedToMatch: true,
		},
		{
			id: 'Address',
			displayName: 'Address',
			match: false,
			required: false,
			defaultMatch: false,
			display: true,
			type: 'string',
			canBeUsedToMatch: true,
		},
		{
			id: 'id',
			displayName: 'id',
			match: true,
			required: true,
			defaultMatch: true,
			display: true,
			type: 'string',
			canBeUsedToMatch: true,
		},
		{
			id: 'Last Name',
			displayName: 'Last Name',
			match: false,
			required: false,
			defaultMatch: false,
			display: true,
			type: 'string',
			canBeUsedToMatch: true,
		},
	],
};
