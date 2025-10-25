import type { INodeProperties } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';
import { getOptionParameterData } from './utils';

describe('getOptionParameterData', () => {
	describe('when option has multipleValues enabled', () => {
		it('should return array with default value for non-fixedCollection types', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: ['defaultValue'],
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: ['defaultValue'],
			});
		});

		it('should return array with default value string with string default value', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: 'defaultValue',
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: ['defaultValue'],
			});
		});

		it('should return array with default array for array default values', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
				},
				default: [{ name: 'item1' }, { name: 'item2' }],
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: [{ name: 'item1' }, { name: 'item2' }],
			});
		});

		it('should handle object with array property as default value', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: { option1: [{ name: 'singleItem' }] },
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: { option1: [{ name: 'singleItem' }] },
			});
		});

		it('should return empty array when no default value is provided for collection type', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
				},
				default: undefined,
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: [],
			});
		});

		it('should return empty object when no default value is provided for fixedCollection type', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: undefined,
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: {},
			});
		});

		it('should return deep copy of default for fixedCollection types', () => {
			const defaultCollection = {
				property1: [{ name: 'item1' }, { name: 'item2' }],
				property2: [{ name: 'item3' }, { name: 'item4' }],
			};
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: defaultCollection,
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: defaultCollection,
			});
			// Ensure it's a deep copy, not a reference
			expect(result.value).not.toBe(defaultCollection);
		});
	});

	describe('when option does not have multipleValues enabled', () => {
		it('should return single value with default when default is provided', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'string',
				default: 'defaultValue',
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: 'defaultValue',
			});
		});

		it('should return undefined when no default is provided', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'string',
				default: undefined,
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: undefined,
			});
		});

		it('should return deep copy of fixedCollection default', () => {
			const defaultObject = { key: 'value', nested: { prop: 'nestedValue' } };
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'fixedCollection',
				default: defaultObject,
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: defaultObject,
			});
			// Ensure it's a deep copy, not a reference
			expect(result.value).not.toBe(defaultObject);
		});

		it('should return deep copy of array default', () => {
			const defaultArray = [{ nested: 'value' }];
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'collection',
				default: defaultArray,
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: defaultArray,
			});
			// Ensure it's a deep copy, not a reference
			expect(result.value).not.toBe(defaultArray);
		});
	});

	describe('edge cases', () => {
		it('should handle empty string default values', () => {
			const option: INodeProperties = {
				name: 'testOption',
				displayName: 'Test Option',
				type: 'fixedCollection',
				default: '',
			};

			const result = getOptionParameterData('testParam', option);

			expect(result).toEqual({
				name: 'testParam',
				value: '',
			});
		});
	});
});
