import type { VectorStore } from '@langchain/core/vectorstores';
import type { INodeProperties } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { DEFAULT_OPERATION_MODES } from '../constants';
import type { VectorStoreNodeConstructorArgs, NodeOperationMode } from '../types';
import {
	transformDescriptionForOperationMode,
	isUpdateSupported,
	getOperationModeOptions,
} from '../utils';

describe('Vector Store Utilities', () => {
	describe('transformDescriptionForOperationMode', () => {
		const testFields: INodeProperties[] = [
			{
				displayName: 'Test Field 1',
				name: 'testField1',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Test Field 2',
				name: 'testField2',
				type: 'number',
				default: 0,
			},
		];

		it('should add displayOptions for a single mode', () => {
			const result = transformDescriptionForOperationMode(testFields, 'load');

			expect(result).toHaveLength(2);
			expect(result[0].displayOptions).toEqual({ show: { mode: ['load'] } });
			expect(result[1].displayOptions).toEqual({ show: { mode: ['load'] } });
		});

		it('should add displayOptions for multiple modes', () => {
			const result = transformDescriptionForOperationMode(testFields, ['load', 'insert']);

			expect(result).toHaveLength(2);
			expect(result[0].displayOptions).toEqual({ show: { mode: ['load', 'insert'] } });
			expect(result[1].displayOptions).toEqual({ show: { mode: ['load', 'insert'] } });
		});

		it('should preserve other properties of the fields', () => {
			const result = transformDescriptionForOperationMode(testFields, 'load');

			expect(result[0].displayName).toBe('Test Field 1');
			expect(result[0].name).toBe('testField1');
			expect(result[0].type).toBe('string');
			expect(result[0].default).toBe('');

			expect(result[1].displayName).toBe('Test Field 2');
			expect(result[1].name).toBe('testField2');
			expect(result[1].type).toBe('number');
			expect(result[1].default).toBe(0);
		});
	});

	describe('isUpdateSupported', () => {
		it('should return true when update is in operationModes', () => {
			const args = {
				meta: {
					displayName: 'Test Vector Store',
					name: 'testVectorStore',
					description: 'Test description',
					docsUrl: 'https://example.com',
					icon: 'file:test.svg',
					operationModes: ['load', 'insert', 'update'] as NodeOperationMode[],
				},
				sharedFields: [],
				getVectorStoreClient: jest.fn(),
				populateVectorStore: jest.fn(),
			} as unknown as VectorStoreNodeConstructorArgs<VectorStore>;

			expect(isUpdateSupported(args)).toBe(true);
		});

		it('should return false when update is not in operationModes', () => {
			const args = {
				meta: {
					displayName: 'Test Vector Store',
					name: 'testVectorStore',
					description: 'Test description',
					docsUrl: 'https://example.com',
					icon: 'file:test.svg',
					operationModes: ['load', 'insert'] as NodeOperationMode[],
				},
				sharedFields: [],
				getVectorStoreClient: jest.fn(),
				populateVectorStore: jest.fn(),
			} as unknown as VectorStoreNodeConstructorArgs<VectorStore>;

			expect(isUpdateSupported(args)).toBe(false);
		});

		it('should return false when operationModes is undefined', () => {
			const args = {
				meta: {
					displayName: 'Test Vector Store',
					name: 'testVectorStore',
					description: 'Test description',
					docsUrl: 'https://example.com',
					icon: 'file:test.svg',
				},
				sharedFields: [],
				getVectorStoreClient: jest.fn(),
				populateVectorStore: jest.fn(),
			} as unknown as VectorStoreNodeConstructorArgs<VectorStore>;

			expect(isUpdateSupported(args)).toBe(false);
		});
	});

	describe('getOperationModeOptions', () => {
		it('should return options for specified operation modes', () => {
			const args = {
				meta: {
					displayName: 'Test Vector Store',
					name: 'testVectorStore',
					description: 'Test description',
					docsUrl: 'https://example.com',
					icon: 'file:test.svg',
					operationModes: ['load', 'insert'] as NodeOperationMode[],
				},
				sharedFields: [],
				getVectorStoreClient: jest.fn(),
				populateVectorStore: jest.fn(),
			} as unknown as VectorStoreNodeConstructorArgs<VectorStore>;

			const result = getOperationModeOptions(args);

			expect(result).toHaveLength(2);
			expect(result[0].value).toBe('load');
			expect(result[1].value).toBe('insert');
		});

		it('should return default operation modes when not specified', () => {
			const args = {
				meta: {
					displayName: 'Test Vector Store',
					name: 'testVectorStore',
					description: 'Test description',
					docsUrl: 'https://example.com',
					icon: 'file:test.svg',
				},
				sharedFields: [],
				getVectorStoreClient: jest.fn(),
				populateVectorStore: jest.fn(),
			} as unknown as VectorStoreNodeConstructorArgs<VectorStore>;

			const result = getOperationModeOptions(args);

			expect(result).toHaveLength(DEFAULT_OPERATION_MODES.length);
			DEFAULT_OPERATION_MODES.forEach((mode) => {
				expect(result.some((option) => option.value === mode)).toBe(true);
			});
		});

		it('should include output connection type properties from OPERATION_MODE_DESCRIPTIONS', () => {
			const args = {
				meta: {
					displayName: 'Test Vector Store',
					name: 'testVectorStore',
					description: 'Test description',
					docsUrl: 'https://example.com',
					icon: 'file:test.svg',
					operationModes: ['retrieve', 'retrieve-as-tool'] as NodeOperationMode[],
				},
				sharedFields: [],
				getVectorStoreClient: jest.fn(),
				populateVectorStore: jest.fn(),
			} as unknown as VectorStoreNodeConstructorArgs<VectorStore>;

			const result = getOperationModeOptions(args);

			const retrieveOption = result.find((option) => option.value === 'retrieve');
			const retrieveAsToolOption = result.find((option) => option.value === 'retrieve-as-tool');

			expect(retrieveOption?.outputConnectionType).toBe(NodeConnectionTypes.AiVectorStore);
			expect(retrieveAsToolOption?.outputConnectionType).toBe(NodeConnectionTypes.AiTool);
		});
	});
});
