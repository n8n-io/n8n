import type { INode, INodeTypeDescription, INodeProperties } from 'n8n-workflow';

import {
	getVisibleParameters,
	validateParametersWithDisplayOptions,
	formatValidationIssuesForLLM,
} from '../parameter-validation.utils';

describe('parameter-validation.utils', () => {
	// Mock node type description with display options
	const mockNodeTypeDescription: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'Test node for validation',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
				],
				default: 'GET',
				required: true,
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						method: ['POST'],
					},
				},
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				options: [
					{ name: 'JSON', value: 'json' },
					{ name: 'Form', value: 'form' },
				],
				default: 'json',
				displayOptions: {
					show: {
						method: ['POST'],
					},
				},
			},
			{
				displayName: 'Optional Field',
				name: 'optionalField',
				type: 'string',
				default: '',
			},
		] as INodeProperties[],
	};

	const mockNode: INode = {
		id: 'test-node-1',
		name: 'Test Node',
		type: 'testNode',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	// Node type with hide display options
	const nodeWithHideOptions: INodeTypeDescription = {
		displayName: 'Test Node Hide',
		name: 'testNodeHide',
		group: ['transform'],
		version: 1,
		description: 'Test node with hide display options',
		defaults: { name: 'Test Node Hide' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'Simple', value: 'simple' },
					{ name: 'Advanced', value: 'advanced' },
				],
				default: 'simple',
			},
			{
				displayName: 'Simple Field',
				name: 'simpleField',
				type: 'string',
				default: '',
				displayOptions: {
					hide: {
						mode: ['advanced'],
					},
				},
			},
			{
				displayName: 'Advanced Field',
				name: 'advancedField',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						mode: ['advanced'],
					},
				},
			},
		] as INodeProperties[],
	};

	// Node type with no properties
	const emptyPropertiesNode: INodeTypeDescription = {
		displayName: 'Empty Node',
		name: 'emptyNode',
		group: ['transform'],
		version: 1,
		description: 'Node with no properties',
		defaults: { name: 'Empty Node' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};

	// Node type with collection
	const nodeWithCollection: INodeTypeDescription = {
		displayName: 'Collection Node',
		name: 'collectionNode',
		group: ['transform'],
		version: 1,
		description: 'Node with collection',
		defaults: { name: 'Collection Node' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 30,
					},
					{
						displayName: 'Retry',
						name: 'retry',
						type: 'boolean',
						default: false,
					},
				],
			},
		] as INodeProperties[],
	};

	describe('getVisibleParameters', () => {
		it('should return parameters visible when method is GET', () => {
			const params = { method: 'GET', url: 'https://api.com' };
			const visible = getVisibleParameters(mockNodeTypeDescription, params, mockNode);

			expect(visible).toContain('method');
			expect(visible).toContain('url');
			expect(visible).toContain('optionalField');
			expect(visible).not.toContain('body');
			expect(visible).not.toContain('contentType');
		});

		it('should return all parameters including conditional when method is POST', () => {
			const params = { method: 'POST', url: 'https://api.com' };
			const visible = getVisibleParameters(mockNodeTypeDescription, params, mockNode);

			expect(visible).toContain('method');
			expect(visible).toContain('url');
			expect(visible).toContain('body');
			expect(visible).toContain('contentType');
			expect(visible).toContain('optionalField');
		});

		// Edge cases
		it('should handle displayOptions.hide correctly', () => {
			const nodeHide: INode = {
				id: 'hide-node',
				name: 'Hide Node',
				type: 'testNodeHide',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			// In simple mode, simpleField should be visible (not hidden)
			const simpleVisible = getVisibleParameters(nodeWithHideOptions, { mode: 'simple' }, nodeHide);
			expect(simpleVisible).toContain('simpleField');
			expect(simpleVisible).not.toContain('advancedField');

			// In advanced mode, simpleField should be hidden
			const advancedVisible = getVisibleParameters(
				nodeWithHideOptions,
				{ mode: 'advanced' },
				nodeHide,
			);
			expect(advancedVisible).not.toContain('simpleField');
			expect(advancedVisible).toContain('advancedField');
		});

		it('should handle node with no properties', () => {
			const emptyNode: INode = {
				id: 'empty-node',
				name: 'Empty Node',
				type: 'emptyNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const visible = getVisibleParameters(emptyPropertiesNode, {}, emptyNode);
			expect(visible).toEqual([]);
		});

		it('should handle collection parameters', () => {
			const collectionNodeInstance: INode = {
				id: 'collection-node',
				name: 'Collection Node',
				type: 'collectionNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const visible = getVisibleParameters(
				nodeWithCollection,
				{ options: { timeout: 60 } },
				collectionNodeInstance,
			);
			expect(visible).toContain('options');
		});

		it('should handle empty parameters object', () => {
			const visible = getVisibleParameters(mockNodeTypeDescription, {}, mockNode);
			// All base parameters without show conditions should be visible
			expect(visible).toContain('method');
			expect(visible).toContain('url');
			expect(visible).toContain('optionalField');
		});
	});

	describe('validateParametersWithDisplayOptions', () => {
		it('should return valid for complete parameters', () => {
			const nodeWithParams: INode = {
				...mockNode,
				parameters: {
					method: 'GET',
					url: 'https://api.example.com',
				},
			};

			const result = validateParametersWithDisplayOptions(
				nodeWithParams,
				mockNodeTypeDescription,
				nodeWithParams.parameters,
			);

			expect(result.valid).toBe(true);
			expect(result.visibleParameters).toContain('method');
			expect(result.visibleParameters).toContain('url');
			expect(result.hiddenParameters).toContain('body');
		});

		it('should return visible and hidden parameter lists', () => {
			const nodeWithParams: INode = {
				...mockNode,
				parameters: { method: 'GET', url: 'https://api.com' },
			};

			const result = validateParametersWithDisplayOptions(
				nodeWithParams,
				mockNodeTypeDescription,
				nodeWithParams.parameters,
			);

			expect(result.visibleParameters).toEqual(
				expect.arrayContaining(['method', 'url', 'optionalField']),
			);
			expect(result.hiddenParameters).toEqual(expect.arrayContaining(['body', 'contentType']));
		});

		it('should show body and contentType as visible when method is POST', () => {
			const nodeWithParams: INode = {
				...mockNode,
				parameters: { method: 'POST', url: 'https://api.com', body: '{"data": true}' },
			};

			const result = validateParametersWithDisplayOptions(
				nodeWithParams,
				mockNodeTypeDescription,
				nodeWithParams.parameters,
			);

			expect(result.visibleParameters).toContain('body');
			expect(result.visibleParameters).toContain('contentType');
			expect(result.hiddenParameters).not.toContain('body');
		});

		// Edge cases
		it('should handle node with no properties', () => {
			const emptyNode: INode = {
				id: 'empty-node',
				name: 'Empty Node',
				type: 'emptyNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			};

			const result = validateParametersWithDisplayOptions(emptyNode, emptyPropertiesNode, {});

			expect(result.valid).toBe(true);
			expect(result.visibleParameters).toEqual([]);
			expect(result.hiddenParameters).toEqual([]);
			expect(result.missingRequired).toEqual([]);
		});

		it('should handle collection parameters', () => {
			const collectionNodeInstance: INode = {
				id: 'collection-node',
				name: 'Collection Node',
				type: 'collectionNode',
				typeVersion: 1,
				position: [0, 0],
				parameters: { options: { timeout: 60, retry: true } },
			};

			const result = validateParametersWithDisplayOptions(
				collectionNodeInstance,
				nodeWithCollection,
				collectionNodeInstance.parameters,
			);

			expect(result.visibleParameters).toContain('options');
		});

		it('should handle hide display options in validation', () => {
			const nodeHide: INode = {
				id: 'hide-node',
				name: 'Hide Node',
				type: 'testNodeHide',
				typeVersion: 1,
				position: [0, 0],
				parameters: { mode: 'advanced', advancedField: 'value' },
			};

			const result = validateParametersWithDisplayOptions(
				nodeHide,
				nodeWithHideOptions,
				nodeHide.parameters,
			);

			expect(result.visibleParameters).toContain('advancedField');
			expect(result.hiddenParameters).toContain('simpleField');
		});
	});

	describe('formatValidationIssuesForLLM', () => {
		it('should return success message for valid result', () => {
			const result = {
				valid: true,
				issues: null,
				visibleParameters: ['method', 'url'],
				hiddenParameters: ['body'],
				missingRequired: [],
			};

			expect(formatValidationIssuesForLLM(result)).toBe('All parameters are valid.');
		});

		it('should format missing required parameters', () => {
			const result = {
				valid: false,
				issues: {
					parameters: {
						url: ['Parameter "url" is required'],
					},
				},
				visibleParameters: ['method', 'url'],
				hiddenParameters: [],
				missingRequired: ['url'],
			};

			const formatted = formatValidationIssuesForLLM(result);
			expect(formatted).toContain('Missing required parameters: url');
		});

		it('should format multiple missing parameters', () => {
			const result = {
				valid: false,
				issues: {
					parameters: {
						url: ['Parameter "url" is required'],
						method: ['Parameter "method" is required'],
					},
				},
				visibleParameters: ['method', 'url'],
				hiddenParameters: [],
				missingRequired: ['url', 'method'],
			};

			const formatted = formatValidationIssuesForLLM(result);
			expect(formatted).toContain('Missing required parameters: url, method');
		});

		it('should format non-required validation issues', () => {
			const result = {
				valid: false,
				issues: {
					parameters: {
						timeout: ['Value must be a positive number'],
					},
				},
				visibleParameters: ['timeout'],
				hiddenParameters: [],
				missingRequired: [],
			};

			const formatted = formatValidationIssuesForLLM(result);
			expect(formatted).toContain('timeout: Value must be a positive number');
		});

		it('should handle result with no specific issues', () => {
			const result = {
				valid: false,
				issues: null,
				visibleParameters: [],
				hiddenParameters: [],
				missingRequired: [],
			};

			const formatted = formatValidationIssuesForLLM(result);
			expect(formatted).toBe('Unknown validation issues');
		});

		// Edge cases
		it('should handle empty issues.parameters object', () => {
			const result = {
				valid: false,
				issues: { parameters: {} },
				visibleParameters: ['method'],
				hiddenParameters: [],
				missingRequired: [],
			};

			const formatted = formatValidationIssuesForLLM(result);
			expect(formatted).toBe('Unknown validation issues');
		});

		it('should handle multiple issues per parameter', () => {
			const result = {
				valid: false,
				issues: {
					parameters: {
						timeout: ['Value must be a positive number', 'Value cannot exceed 60000'],
					},
				},
				visibleParameters: ['timeout'],
				hiddenParameters: [],
				missingRequired: [],
			};

			const formatted = formatValidationIssuesForLLM(result);
			expect(formatted).toContain('timeout: Value must be a positive number');
			expect(formatted).toContain('timeout: Value cannot exceed 60000');
		});

		it('should combine missing required and other issues', () => {
			const result = {
				valid: false,
				issues: {
					parameters: {
						url: ['Parameter "url" is required'],
						timeout: ['Invalid value'],
					},
				},
				visibleParameters: ['url', 'timeout'],
				hiddenParameters: [],
				missingRequired: ['url'],
			};

			const formatted = formatValidationIssuesForLLM(result);
			expect(formatted).toContain('Missing required parameters: url');
			expect(formatted).toContain('timeout: Invalid value');
			// Required message should not be duplicated
			expect(formatted).not.toContain('url: Parameter "url" is required');
		});

		it('should handle issues with only typeUnknown', () => {
			const result = {
				valid: false,
				issues: {
					typeUnknown: true,
				},
				visibleParameters: [],
				hiddenParameters: [],
				missingRequired: [],
			};

			const formatted = formatValidationIssuesForLLM(result);
			// typeUnknown is not currently handled in formatValidationIssuesForLLM
			// This documents current behavior
			expect(formatted).toBe('Unknown validation issues');
		});
	});
});
