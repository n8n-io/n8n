import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';
import {
	summarizeNodeTypeProperties,
	summarizeOption,
	summarizeProperty,
} from '@/services/ai/utils/summarizeNodeTypeProperties';

describe('summarizeOption', () => {
	it('should return summarized option with value', () => {
		const option: INodePropertyOptions = {
			name: 'testOption',
			value: 'testValue',
		};

		const result = summarizeOption(option);

		expect(result).toEqual({
			name: 'testOption',
			value: 'testValue',
		});
	});

	it('should return summarized option with values', () => {
		const option: INodePropertyCollection = {
			name: 'testOption',
			displayName: 'testDisplayName',
			values: [
				{
					name: 'testName',
					default: '',
					displayName: 'testDisplayName',
					type: 'string',
				},
			],
		};

		const result = summarizeOption(option);

		expect(result).toEqual({
			name: 'testOption',
			values: [
				{
					name: 'testDisplayName',
					type: 'string',
				},
			],
		});
	});

	it('should return summarized property', () => {
		const option: INodeProperties = {
			name: 'testName',
			default: '',
			displayName: 'testDisplayName',
			type: 'string',
		};

		const result = summarizeOption(option);

		expect(result).toEqual({
			name: 'testDisplayName',
			type: 'string',
		});
	});
});

describe('summarizeProperty', () => {
	it('should return summarized property with displayOptions', () => {
		const property: INodeProperties = {
			default: '',
			name: 'testName',
			displayName: 'testDisplayName',
			type: 'string',
			displayOptions: {
				show: {
					testOption: ['testValue'],
				},
			},
		};

		const result = summarizeProperty(property);

		expect(result).toEqual({
			name: 'testDisplayName',
			type: 'string',
			displayOptions: {
				show: {
					testOption: ['testValue'],
				},
			},
		});
	});

	it('should return summarized property with options', () => {
		const property: INodeProperties = {
			name: 'testName',
			displayName: 'testDisplayName',
			default: '',
			type: 'string',
			options: [
				{
					name: 'testOption',
					value: 'testValue',
				},
			],
		};

		const result = summarizeProperty(property);

		expect(result).toEqual({
			name: 'testDisplayName',
			type: 'string',
			options: [
				{
					name: 'testOption',
					value: 'testValue',
				},
			],
		});
	});

	it('should return summarized property without displayOptions and options', () => {
		const property: INodeProperties = {
			name: 'testName',
			default: '',
			displayName: 'testDisplayName',
			type: 'string',
		};

		const result = summarizeProperty(property);

		expect(result).toEqual({
			name: 'testDisplayName',
			type: 'string',
		});
	});
});

describe('summarizeNodeTypeProperties', () => {
	it('should return summarized properties', () => {
		const properties: INodeProperties[] = [
			{
				name: 'testName1',
				default: '',
				displayName: 'testDisplayName1',
				type: 'string',
				options: [
					{
						name: 'testOption1',
						value: 'testValue1',
					},
				],
			},
			{
				name: 'testName2',
				default: '',
				displayName: 'testDisplayName2',
				type: 'number',
				options: [
					{
						name: 'testOption2',
						value: 'testValue2',
					},
				],
			},
		];

		const result = summarizeNodeTypeProperties(properties);

		expect(result).toEqual([
			{
				name: 'testDisplayName1',
				type: 'string',
				options: [
					{
						name: 'testOption1',
						value: 'testValue1',
					},
				],
			},
			{
				name: 'testDisplayName2',
				type: 'number',
				options: [
					{
						name: 'testOption2',
						value: 'testValue2',
					},
				],
			},
		]);
	});
});
