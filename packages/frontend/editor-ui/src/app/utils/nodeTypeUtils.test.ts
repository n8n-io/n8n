import type {
	INodeCredentialDescription,
	INodeProperties,
	ResourceMapperField,
} from 'n8n-workflow';
import {
	getMainAuthField,
	getThemedValue,
	isResourceMapperFieldListStale,
	parseResourceMapperFieldName,
} from './nodeTypesUtils';
import { mockNodeTypeDescription } from '@/__tests__/mocks';

describe('isResourceMapperFieldListStale', () => {
	const baseField: ResourceMapperField = {
		id: 'test',
		displayName: 'test',
		required: false,
		defaultMatch: false,
		display: true,
		canBeUsedToMatch: true,
		type: 'string',
	};

	// Test property changes
	test.each([
		[
			'displayName',
			{ ...baseField },
			{ ...baseField, displayName: 'changed' } as ResourceMapperField,
		],
		['required', { ...baseField }, { ...baseField, required: true } as ResourceMapperField],
		['defaultMatch', { ...baseField }, { ...baseField, defaultMatch: true } as ResourceMapperField],
		['display', { ...baseField }, { ...baseField, display: false }],
		[
			'canBeUsedToMatch',
			{ ...baseField },
			{ ...baseField, canBeUsedToMatch: false } as ResourceMapperField,
		],
		['type', { ...baseField }, { ...baseField, type: 'number' } as ResourceMapperField],
	])('returns true when %s changes', (_property, oldField, newField) => {
		expect(isResourceMapperFieldListStale([oldField], [newField])).toBe(true);
	});

	// Test different array lengths
	test.each([
		['empty vs non-empty', [], [baseField]],
		['non-empty vs empty', [baseField], []],
		['one vs two fields', [baseField], [baseField, { ...baseField, id: 'test2' }]],
	])('returns true for different lengths: %s', (_scenario, oldFields, newFields) => {
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});

	// Test identical cases
	test.each([
		['empty arrays', [], []],
		['single field', [baseField], [{ ...baseField }]],
		[
			'multiple fields',
			[
				{ ...baseField, id: 'test1' },
				{ ...baseField, id: 'test2' },
			],
			[
				{ ...baseField, id: 'test1' },
				{ ...baseField, id: 'test2' },
			],
		],
	])('returns false for identical lists: %s', (_scenario, oldFields, newFields) => {
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(false);
	});

	// This test case is complex enough to keep separate
	test('returns true when field is removed/replaced', () => {
		const oldFields = [
			{ ...baseField, id: 'test1' },
			{ ...baseField, id: 'test2' },
		];
		const newFields = [
			{ ...baseField, id: 'test1' },
			{ ...baseField, id: 'test3' }, // different id
		];
		expect(isResourceMapperFieldListStale(oldFields, newFields)).toBe(true);
	});
});

describe('parseResourceMapperFieldName', () => {
	test.each([
		{ input: 'value["fieldName"]', expected: 'fieldName', desc: 'basic field name' },
		{
			input: 'value["field with spaces"]',
			expected: 'field with spaces',
			desc: 'field with spaces',
		},
		{
			input: 'value["field\nwith\nactual\nnewlines"]',
			expected: 'field\nwith\nactual\nnewlines',
			desc: 'field with newlines',
		},
		{
			input: 'value["field\\"with\\"quotes"]',
			expected: 'field\\"with\\"quotes',
			desc: 'field with escaped quotes',
		},
		{ input: 'fieldName', expected: 'fieldName', desc: 'no value wrapper' },
	])('should parse $desc', ({ input, expected }) => {
		expect(parseResourceMapperFieldName(input)).toBe(expected);
	});
});

describe('getThemedValue', () => {
	it('should return the value if it is a string', () => {
		expect(getThemedValue('test', 'light')).toBe('test');
	});
	it('should return the value if it is undefined', () => {
		expect(getThemedValue(undefined, 'light')).toBe(null);
	});
	it('should return the light value if it is an object', () => {
		expect(getThemedValue({ light: 'test', dark: 'test2' }, 'light')).toBe('test');
	});
	it('should return the dark value if it is an object', () => {
		expect(getThemedValue({ light: 'test', dark: 'test2' }, 'dark')).toBe('test2');
	});
	it('should return the value if it is an object', () => {
		expect(getThemedValue({ light: 'test', dark: 'test2' }, 'light')).toBe('test');
	});
});

describe('getMainAuthField', () => {
	const booleanToggle: INodeProperties = {
		displayName: 'Use Schema Registry',
		name: 'useSchemaRegistry',
		type: 'boolean',
		default: false,
	};

	const optionsAuth: INodeProperties = {
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		default: 'accessToken',
		options: [
			{ name: 'Access Token', value: 'accessToken' },
			{ name: 'OAuth2', value: 'oAuth2' },
		],
	};

	const optionsVersion: INodeProperties = {
		displayName: 'Jira Version',
		name: 'jiraVersion',
		type: 'options',
		default: 'cloud',
		options: [
			{ name: 'Cloud', value: 'cloud' },
			{ name: 'Server', value: 'server' },
		],
	};

	it('returns null when the only credential dependency is a boolean toggle (not an auth selector)', () => {
		// A node with an optional credential gated on a boolean toggle and no
		// `authentication` parameter (e.g. the Kafka nodes). The boolean must not
		// be mistaken for the node's main auth field.
		const credentials: INodeCredentialDescription[] = [
			{ name: 'kafka', required: true },
			{
				name: 'schemaRegistryApi',
				required: false,
				displayOptions: { show: { useSchemaRegistry: [true] } },
			},
		];
		const node = mockNodeTypeDescription({
			name: 'n8n-nodes-base.kafka',
			credentials,
			properties: [booleanToggle],
		});

		expect(getMainAuthField(node)).toBeNull();
	});

	it('returns the `authentication` options field when present', () => {
		const credentials: INodeCredentialDescription[] = [
			{ name: 'accessTokenApi', displayOptions: { show: { authentication: ['accessToken'] } } },
			{ name: 'oAuth2Api', displayOptions: { show: { authentication: ['oAuth2'] } } },
		];
		const node = mockNodeTypeDescription({ credentials, properties: [optionsAuth] });

		expect(getMainAuthField(node)?.name).toBe('authentication');
	});

	it('returns an alternative options field whose values all map to credentials', () => {
		const credentials: INodeCredentialDescription[] = [
			{ name: 'cloudApi', displayOptions: { show: { jiraVersion: ['cloud'] } } },
			{ name: 'serverApi', displayOptions: { show: { jiraVersion: ['server'] } } },
		];
		const node = mockNodeTypeDescription({ credentials, properties: [optionsVersion] });

		expect(getMainAuthField(node)?.name).toBe('jiraVersion');
	});
});
