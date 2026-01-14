import type { INodeTypeDescription, INodeProperties, Logger } from 'n8n-workflow';

import {
	extractResourceOperations,
	formatResourceOperationsForPrompt,
} from '../resource-operation-extractor';

// Helper to create mock node type descriptions
function createMockNodeType(
	properties: INodeProperties[],
	overrides: Partial<INodeTypeDescription> = {},
): INodeTypeDescription {
	return {
		displayName: 'Test Node',
		name: 'n8n-nodes-base.testNode',
		group: ['transform'],
		version: 1,
		description: 'Test node for unit tests',
		defaults: { name: 'Test Node' },
		inputs: ['main'] as INodeTypeDescription['inputs'],
		outputs: ['main'] as INodeTypeDescription['outputs'],
		properties,
		...overrides,
	};
}

// Mock logger for testing
function createMockLogger(): Logger & {
	logs: Array<{ level: string; message: string; meta?: unknown }>;
} {
	const logs: Array<{ level: string; message: string; meta?: unknown }> = [];
	return {
		logs,
		debug: (message: string, meta?: unknown) => logs.push({ level: 'debug', message, meta }),
		warn: (message: string, meta?: unknown) => logs.push({ level: 'warn', message, meta }),
		info: (message: string, meta?: unknown) => logs.push({ level: 'info', message, meta }),
		error: (message: string, meta?: unknown) => logs.push({ level: 'error', message, meta }),
	} as unknown as Logger & { logs: Array<{ level: string; message: string; meta?: unknown }> };
}

describe('resource-operation-extractor', () => {
	describe('extractResourceOperations', () => {
		it('should return null for nodes without resource property', () => {
			const nodeType = createMockNodeType([
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					default: '',
				},
			]);

			const result = extractResourceOperations(nodeType, 1);

			expect(result).toBeNull();
		});

		it('should return null for nodes with empty properties', () => {
			const nodeType = createMockNodeType([]);

			const result = extractResourceOperations(nodeType, 1);

			expect(result).toBeNull();
		});

		it('should return null for nodes with undefined properties', () => {
			const nodeType = createMockNodeType([]);
			nodeType.properties = undefined as unknown as INodeProperties[];

			const result = extractResourceOperations(nodeType, 1);

			expect(result).toBeNull();
		});

		it('should extract resources and operations for node with shared operations', () => {
			// Note: displayParameter filters out properties with show.resource conditions
			// when called with empty values, so operations apply to all resources
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'message',
					options: [
						{ name: 'Message', value: 'message' },
						{ name: 'Draft', value: 'draft' },
					],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'send',
					// No displayOptions - applies to all resources
					options: [
						{ name: 'Send', value: 'send' },
						{ name: 'Get All', value: 'getAll' },
						{ name: 'Create', value: 'create' },
						{ name: 'Delete', value: 'delete' },
					],
				},
			]);

			const result = extractResourceOperations(nodeType, 1);

			expect(result).not.toBeNull();
			expect(result?.resources).toHaveLength(2);

			const messageResource = result?.resources.find((r) => r.value === 'message');
			expect(messageResource).toBeDefined();
			expect(messageResource?.displayName).toBe('Message');
			expect(messageResource?.operations).toHaveLength(4);

			const draftResource = result?.resources.find((r) => r.value === 'draft');
			expect(draftResource).toBeDefined();
			expect(draftResource?.displayName).toBe('Draft');
			expect(draftResource?.operations).toHaveLength(4);
		});

		it('should handle operations with no resource condition (applies to all)', () => {
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'item',
					options: [
						{ name: 'Item', value: 'item' },
						{ name: 'List', value: 'list' },
					],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'get',
					// No displayOptions - applies to all resources
					options: [
						{ name: 'Get', value: 'get' },
						{ name: 'Create', value: 'create' },
					],
				},
			]);

			const result = extractResourceOperations(nodeType, 1);

			expect(result).not.toBeNull();
			expect(result?.resources).toHaveLength(2);

			// Both resources should have the same operations
			const itemResource = result?.resources.find((r) => r.value === 'item');
			const listResource = result?.resources.find((r) => r.value === 'list');

			expect(itemResource?.operations.map((o) => o.value)).toEqual(['get', 'create']);
			expect(listResource?.operations.map((o) => o.value)).toEqual(['get', 'create']);
		});

		it('should deduplicate operations when multiple properties define same op', () => {
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'item',
					options: [{ name: 'Item', value: 'item' }],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'get',
					// No displayOptions - applies to all
					options: [
						{ name: 'Get', value: 'get' },
						{ name: 'Create', value: 'create' },
					],
				},
				{
					displayName: 'Operation 2',
					name: 'operation',
					type: 'options',
					default: 'get',
					// No displayOptions - applies to all
					options: [
						{ name: 'Get', value: 'get' }, // Duplicate
						{ name: 'Delete', value: 'delete' },
					],
				},
			]);

			const result = extractResourceOperations(nodeType, 1);

			expect(result).not.toBeNull();
			const itemResource = result?.resources.find((r) => r.value === 'item');

			// Should have 3 unique operations, not 4
			expect(itemResource?.operations).toHaveLength(3);
			expect(itemResource?.operations.map((o) => o.value)).toEqual(['get', 'create', 'delete']);
		});

		it('should respect @version visibility conditions', () => {
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'item',
					options: [{ name: 'Item', value: 'item' }],
				},
				{
					displayName: 'Operation V1',
					name: 'operation',
					type: 'options',
					default: 'get',
					displayOptions: {
						show: {
							'@version': [1],
						},
					},
					options: [{ name: 'Get V1', value: 'getV1' }],
				},
				{
					displayName: 'Operation V2',
					name: 'operation',
					type: 'options',
					default: 'get',
					displayOptions: {
						show: {
							'@version': [2],
						},
					},
					options: [{ name: 'Get V2', value: 'getV2' }],
				},
			]);

			const resultV1 = extractResourceOperations(nodeType, 1);
			const resultV2 = extractResourceOperations(nodeType, 2);

			expect(resultV1?.resources[0].operations.map((o) => o.value)).toEqual(['getV1']);
			expect(resultV2?.resources[0].operations.map((o) => o.value)).toEqual(['getV2']);
		});

		it('should handle complex @version conditions with _cnd operators', () => {
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'item',
					options: [{ name: 'Item', value: 'item' }],
				},
				{
					displayName: 'Operation Old',
					name: 'operation',
					type: 'options',
					default: 'oldOp',
					displayOptions: {
						show: {
							'@version': [{ _cnd: { lt: 2 } }],
						},
					},
					options: [{ name: 'Old Operation', value: 'oldOp' }],
				},
				{
					displayName: 'Operation New',
					name: 'operation',
					type: 'options',
					default: 'newOp',
					displayOptions: {
						show: {
							'@version': [{ _cnd: { gte: 2 } }],
						},
					},
					options: [{ name: 'New Operation', value: 'newOp' }],
				},
				{
					displayName: 'Operation Range',
					name: 'operation',
					type: 'options',
					default: 'rangeOp',
					displayOptions: {
						show: {
							'@version': [{ _cnd: { between: { from: 1.5, to: 2.5 } } }],
						},
					},
					options: [{ name: 'Range Operation', value: 'rangeOp' }],
				},
			]);

			// Version 1: should have oldOp only (lt 2)
			const resultV1 = extractResourceOperations(nodeType, 1);
			expect(resultV1?.resources[0].operations.map((o) => o.value)).toEqual(['oldOp']);

			// Version 2: should have newOp (gte 2) and rangeOp (between 1.5-2.5)
			const resultV2 = extractResourceOperations(nodeType, 2);
			expect(resultV2?.resources[0].operations.map((o) => o.value)).toEqual(['newOp', 'rangeOp']);

			// Version 3: should have newOp only (gte 2, but not in range 1.5-2.5)
			const resultV3 = extractResourceOperations(nodeType, 3);
			expect(resultV3?.resources[0].operations.map((o) => o.value)).toEqual(['newOp']);
		});

		it('should handle non-string operation values gracefully', () => {
			const logger = createMockLogger();
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'item',
					options: [{ name: 'Item', value: 'item' }],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'get',
					options: [
						{ name: 'Get', value: 'get' },
						{ name: 'Boolean Op', value: true as unknown as string }, // Non-string
						{ name: 'Number Op', value: 123 as unknown as string }, // Non-string
					],
				},
			]);

			const result = extractResourceOperations(nodeType, 1, logger);

			expect(result).not.toBeNull();
			// Should only include the string operation
			expect(result?.resources[0].operations).toHaveLength(1);
			expect(result?.resources[0].operations[0].value).toBe('get');

			// Should have logged debug messages for non-string values
			const debugLogs = logger.logs.filter((l) => l.level === 'debug');
			expect(debugLogs.length).toBeGreaterThanOrEqual(2);
		});

		it('should return null and log warning when resource has no string options', () => {
			const logger = createMockLogger();
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 1,
					options: [
						{ name: 'One', value: 1 as unknown as string },
						{ name: 'Two', value: 2 as unknown as string },
					],
				},
			]);

			const result = extractResourceOperations(nodeType, 1, logger);

			expect(result).toBeNull();

			// Should have logged a warning
			const warnLogs = logger.logs.filter((l) => l.level === 'warn');
			expect(warnLogs).toHaveLength(1);
			expect(warnLogs[0].message).toContain('no string options');
		});

		it('should log debug when properties array is empty', () => {
			const logger = createMockLogger();
			const nodeType = createMockNodeType([]);

			extractResourceOperations(nodeType, 1, logger);

			const debugLogs = logger.logs.filter((l) => l.level === 'debug');
			expect(debugLogs).toHaveLength(1);
			expect(debugLogs[0].message).toContain('No properties found');
		});

		it('should handle resource property with non-options type', () => {
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'string', // Wrong type - should be 'options'
					default: 'item',
				},
			]);

			const result = extractResourceOperations(nodeType, 1);

			expect(result).toBeNull();
		});

		it('should handle resource with empty operations', () => {
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'item',
					options: [{ name: 'Item', value: 'item' }],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'get',
					displayOptions: {
						show: {
							resource: ['other'], // Doesn't match 'item'
						},
					},
					options: [{ name: 'Get', value: 'get' }],
				},
			]);

			const result = extractResourceOperations(nodeType, 1);

			expect(result).not.toBeNull();
			expect(result?.resources[0].operations).toHaveLength(0);
		});

		it('should extract operations with displayOptions.show.resource that matches', () => {
			// This tests the Gmail-like pattern where each resource has its own operation property
			// with displayOptions.show.resource condition
			const nodeType = createMockNodeType([
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'message',
					options: [
						{ name: 'Message', value: 'message' },
						{ name: 'Draft', value: 'draft' },
						{ name: 'Label', value: 'label' },
					],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'send',
					displayOptions: {
						show: {
							resource: ['message'],
						},
					},
					options: [
						{ name: 'Send', value: 'send' },
						{ name: 'Get All', value: 'getAll' },
						{ name: 'Delete', value: 'delete' },
					],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'create',
					displayOptions: {
						show: {
							resource: ['draft'],
						},
					},
					options: [
						{ name: 'Create', value: 'create' },
						{ name: 'Delete', value: 'delete' },
					],
				},
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'create',
					displayOptions: {
						show: {
							resource: ['label'],
						},
					},
					options: [
						{ name: 'Create', value: 'create' },
						{ name: 'Get All', value: 'getAll' },
					],
				},
			]);

			const result = extractResourceOperations(nodeType, 1);

			expect(result).not.toBeNull();
			expect(result?.resources).toHaveLength(3);

			// Message should have send, getAll, delete
			const messageResource = result?.resources.find((r) => r.value === 'message');
			expect(messageResource?.operations.map((o) => o.value)).toEqual(['send', 'getAll', 'delete']);

			// Draft should have create, delete
			const draftResource = result?.resources.find((r) => r.value === 'draft');
			expect(draftResource?.operations.map((o) => o.value)).toEqual(['create', 'delete']);

			// Label should have create, getAll
			const labelResource = result?.resources.find((r) => r.value === 'label');
			expect(labelResource?.operations.map((o) => o.value)).toEqual(['create', 'getAll']);
		});
	});

	describe('formatResourceOperationsForPrompt', () => {
		it('should format resource/operation info as expected XML structure', () => {
			const info = {
				resources: [
					{
						value: 'message',
						displayName: 'Message',
						operations: [
							{ value: 'send', displayName: 'Send' },
							{ value: 'getAll', displayName: 'Get All' },
						],
					},
					{
						value: 'draft',
						displayName: 'Draft',
						operations: [{ value: 'create', displayName: 'Create' }],
					},
				],
			};

			const result = formatResourceOperationsForPrompt(info);

			expect(result).toContain('<available_resources_and_operations>');
			expect(result).toContain('</available_resources_and_operations>');
			expect(result).toContain('Resource: Message (value: "message")');
			expect(result).toContain('Resource: Draft (value: "draft")');
			expect(result).toContain('- Send (value: "send")');
			expect(result).toContain('- Get All (value: "getAll")');
			expect(result).toContain('- Create (value: "create")');
		});

		it('should handle resource with no operations', () => {
			const info = {
				resources: [
					{
						value: 'empty',
						displayName: 'Empty Resource',
						operations: [],
					},
				],
			};

			const result = formatResourceOperationsForPrompt(info);

			expect(result).toContain('Resource: Empty Resource (value: "empty")');
			expect(result).toContain('Operations: none defined');
		});

		it('should handle empty resources array', () => {
			const info = { resources: [] };

			const result = formatResourceOperationsForPrompt(info);

			expect(result).toBe(
				'<available_resources_and_operations>\n</available_resources_and_operations>',
			);
		});
	});
});
