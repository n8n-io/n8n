import type { ResourceMapperField } from 'n8n-workflow';
import { isResourceMapperFieldListStale, parseResourceMapperFieldName } from './nodeTypesUtils';

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
