import type { ResourceMapperField } from 'n8n-workflow';
import {
	isCommunityPackageName,
	isResourceMapperFieldListStale,
	parseResourceMapperFieldName,
} from './nodeTypesUtils';

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

describe('isCommunityPackageName', () => {
	// Standard community package names
	it('should identify standard community node package names', () => {
		expect(isCommunityPackageName('n8n-nodes-example')).toBe(true);
		expect(isCommunityPackageName('n8n-nodes-custom')).toBe(true);
		expect(isCommunityPackageName('n8n-nodes-test')).toBe(true);
	});

	// Scoped package names
	it('should identify scoped community node package names', () => {
		expect(isCommunityPackageName('@username/n8n-nodes-example')).toBe(true);
		expect(isCommunityPackageName('@org/n8n-nodes-custom')).toBe(true);
		expect(isCommunityPackageName('@test-scope/n8n-nodes-test-name')).toBe(true);
	});

	it('should identify scoped packages with other characters', () => {
		expect(isCommunityPackageName('n8n-nodes-my_package')).toBe(true);
		expect(isCommunityPackageName('@user/n8n-nodes-with_underscore')).toBe(true);
		expect(isCommunityPackageName('@user_name/n8n-nodes-example')).toBe(true);
		expect(isCommunityPackageName('@n8n-io/n8n-nodes-test')).toBe(true);
		expect(isCommunityPackageName('@n8n.io/n8n-nodes-test')).toBe(true);
	});

	it('should handle mixed cases', () => {
		expect(isCommunityPackageName('@user-name_org/n8n-nodes-mixed-case_example')).toBe(true);
		expect(isCommunityPackageName('@mixed_style-org/n8n-nodes-complex_name-format')).toBe(true);
		expect(isCommunityPackageName('@my.mixed_style-org/n8n-nodes-complex_name-format')).toBe(true);
	});

	// Official n8n packages that should not be identified as community packages
	it('should not identify official n8n packages as community nodes', () => {
		expect(isCommunityPackageName('@n8n/n8n-nodes-example')).toBe(false);
		expect(isCommunityPackageName('n8n-nodes-base')).toBe(false);
	});

	// Additional edge cases
	it('should handle edge cases correctly', () => {
		// Non-matching patterns
		expect(isCommunityPackageName('not-n8n-nodes')).toBe(false);
		expect(isCommunityPackageName('n8n-core')).toBe(false);

		// With node name after package
		expect(isCommunityPackageName('n8n-nodes-example.NodeName')).toBe(true);
		expect(isCommunityPackageName('@user/n8n-nodes-example.NodeName')).toBe(true);
	});

	// Multiple executions to test regex state
	it('should work correctly with multiple consecutive calls', () => {
		expect(isCommunityPackageName('@user/n8n-nodes-example')).toBe(true);
		expect(isCommunityPackageName('n8n-nodes-base')).toBe(false);
		expect(isCommunityPackageName('@test-scope/n8n-nodes-test')).toBe(true);
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
