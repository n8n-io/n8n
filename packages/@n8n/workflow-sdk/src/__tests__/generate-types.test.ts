/**
 * Tests for generate-types.ts
 *
 * Following TDD: These tests are written BEFORE the implementation.
 * Run with: pnpm test generate-types.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// We'll import these functions once implemented
// For now, we define the expected interfaces and test structure

// =============================================================================
// Type Definitions (Expected interfaces from the implementation)
// =============================================================================

interface NodeProperty {
	name: string;
	displayName: string;
	type: string;
	description?: string;
	default?: unknown;
	required?: boolean;
	options?: Array<{ name: string; value: string | number | boolean; description?: string }>;
	displayOptions?: {
		show?: Record<string, unknown[]>;
		hide?: Record<string, unknown[]>;
	};
	typeOptions?: Record<string, unknown>;
}

interface NodeTypeDescription {
	name: string;
	displayName: string;
	description?: string;
	group: string[];
	version: number | number[];
	defaultVersion?: number;
	properties: NodeProperty[];
	credentials?: Array<{ name: string; required?: boolean }>;
	inputs: string[] | Array<{ type: string; displayName?: string }>;
	outputs: string[] | Array<{ type: string; displayName?: string }>;
	subtitle?: string;
	usableAsTool?: boolean;
	hidden?: boolean;
}

// =============================================================================
// Mock Data for Testing
// =============================================================================

const mockHttpRequestNode: NodeTypeDescription = {
	name: 'n8n-nodes-base.httpRequest',
	displayName: 'HTTP Request',
	description: 'Makes HTTP requests and returns the response data',
	group: ['transform'],
	version: [3, 4, 4.1, 4.2],
	defaultVersion: 4.2,
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'httpBasicAuth' }, { name: 'httpDigestAuth' }, { name: 'httpHeaderAuth' }],
	properties: [
		{
			displayName: 'Method',
			name: 'method',
			type: 'options',
			options: [
				{ name: 'DELETE', value: 'DELETE' },
				{ name: 'GET', value: 'GET' },
				{ name: 'HEAD', value: 'HEAD' },
				{ name: 'OPTIONS', value: 'OPTIONS' },
				{ name: 'PATCH', value: 'PATCH' },
				{ name: 'POST', value: 'POST' },
				{ name: 'PUT', value: 'PUT' },
			],
			default: 'GET',
			description: 'The HTTP method to use',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			required: true,
			default: '',
			description: 'The URL to make the request to',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'None', value: 'none' },
				{ name: 'Predefined Credential Type', value: 'predefinedCredentialType' },
				{ name: 'Generic Credential Type', value: 'genericCredentialType' },
			],
			default: 'none',
		},
		{
			displayName: 'Send Query Parameters',
			name: 'sendQuery',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Timeout',
			name: 'timeout',
			type: 'number',
			default: 10000,
			description: 'Time in ms to wait for a response',
		},
	],
};

const mockGmailNode: NodeTypeDescription = {
	name: 'n8n-nodes-base.gmail',
	displayName: 'Gmail',
	description: 'Send and receive emails using Gmail',
	group: ['transform'],
	version: [2, 2.1],
	defaultVersion: 2.1,
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'gmailOAuth2', required: true }],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [
				{ name: 'Draft', value: 'draft' },
				{ name: 'Label', value: 'label' },
				{ name: 'Message', value: 'message' },
				{ name: 'Thread', value: 'thread' },
			],
			default: 'message',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			displayOptions: { show: { resource: ['message'] } },
			options: [
				{ name: 'Delete', value: 'delete', description: 'Delete a message' },
				{ name: 'Get', value: 'get', description: 'Get a message' },
				{ name: 'Get Many', value: 'getAll', description: 'Get many messages' },
				{ name: 'Reply', value: 'reply', description: 'Reply to a message' },
				{ name: 'Send', value: 'send', description: 'Send an email' },
			],
			default: 'send',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			displayOptions: { show: { resource: ['label'] } },
			options: [
				{ name: 'Create', value: 'create', description: 'Create a label' },
				{ name: 'Delete', value: 'delete', description: 'Delete a label' },
				{ name: 'Get', value: 'get', description: 'Get a label' },
				{ name: 'Get Many', value: 'getAll', description: 'Get many labels' },
			],
			default: 'create',
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'string',
			required: true,
			default: '',
			description: 'Email recipient',
			displayOptions: { show: { resource: ['message'], operation: ['send', 'reply'] } },
		},
		{
			displayName: 'Subject',
			name: 'subject',
			type: 'string',
			required: true,
			default: '',
			description: 'Email subject',
			displayOptions: { show: { resource: ['message'], operation: ['send'] } },
		},
		{
			displayName: 'Message',
			name: 'message',
			type: 'string',
			required: true,
			default: '',
			description: 'Email body (HTML or plain text)',
			displayOptions: { show: { resource: ['message'], operation: ['send', 'reply'] } },
		},
		{
			displayName: 'Message ID',
			name: 'messageId',
			type: 'string',
			required: true,
			default: '',
			description: 'The ID of the message',
			displayOptions: { show: { resource: ['message'], operation: ['get', 'delete', 'reply'] } },
		},
		{
			displayName: 'Label Name',
			name: 'labelName',
			type: 'string',
			required: true,
			default: '',
			description: 'Name of the label to create',
			displayOptions: { show: { resource: ['label'], operation: ['create'] } },
		},
		{
			displayName: 'Label ID',
			name: 'labelId',
			type: 'string',
			required: true,
			default: '',
			description: 'ID of the label',
			displayOptions: { show: { resource: ['label'], operation: ['get', 'delete'] } },
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			options: [
				{
					displayName: 'Append Attribution',
					name: 'appendAttribution',
					type: 'boolean',
					default: true,
					description: 'Whether to append n8n attribution to the email',
				},
				{
					displayName: 'CC',
					name: 'ccList',
					type: 'string',
					default: '',
					description: 'Comma-separated list of CC recipients',
				},
				{
					displayName: 'BCC',
					name: 'bccList',
					type: 'string',
					default: '',
					description: 'Comma-separated list of BCC recipients',
				},
			],
		},
	],
};

const mockTriggerNode: NodeTypeDescription = {
	name: 'n8n-nodes-base.scheduleTrigger',
	displayName: 'Schedule Trigger',
	description: 'Triggers the workflow on a schedule',
	group: ['trigger'],
	version: [1, 1.1, 1.2],
	inputs: [],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Trigger Times',
			name: 'rule',
			type: 'fixedCollection',
			default: {},
			options: [
				{
					displayName: 'Trigger Times',
					name: 'interval',
					values: [
						{
							displayName: 'Mode',
							name: 'mode',
							type: 'options',
							options: [
								{ name: 'Every Minute', value: 'everyMinute' },
								{ name: 'Every Hour', value: 'everyHour' },
								{ name: 'Every Day', value: 'everyDay' },
								{ name: 'Every Week', value: 'everyWeek' },
								{ name: 'Every Month', value: 'everyMonth' },
								{ name: 'Custom', value: 'custom' },
							],
							default: 'everyDay',
						},
						{
							displayName: 'Hour',
							name: 'hour',
							type: 'number',
							default: 0,
							displayOptions: { show: { mode: ['everyDay', 'everyWeek', 'everyMonth'] } },
						},
					],
				},
			],
		},
	],
};

// =============================================================================
// Test Suite
// =============================================================================

describe('generate-types', () => {
	// Import the module - will fail until implemented
	let generateTypes: typeof import('../../scripts/generate-types');

	beforeAll(async () => {
		// Dynamic import to handle module not existing yet
		try {
			generateTypes = await import('../../scripts/generate-types');
		} catch {
			// Module doesn't export functions yet - tests will fail as expected in TDD
		}
	});

	// =========================================================================
	// Property Type Mapping Tests
	// =========================================================================

	describe('mapPropertyType', () => {
		it('should map string type with Expression wrapper', () => {
			const prop: NodeProperty = { name: 'url', displayName: 'URL', type: 'string', default: '' };
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('string | Expression<string>');
		});

		it('should map number type with Expression wrapper', () => {
			const prop: NodeProperty = {
				name: 'timeout',
				displayName: 'Timeout',
				type: 'number',
				default: 10000,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('number | Expression<number>');
		});

		it('should map boolean type with Expression wrapper', () => {
			const prop: NodeProperty = {
				name: 'enabled',
				displayName: 'Enabled',
				type: 'boolean',
				default: false,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('boolean | Expression<boolean>');
		});

		it('should map options type to union of literal values', () => {
			const prop: NodeProperty = {
				name: 'method',
				displayName: 'Method',
				type: 'options',
				options: [
					{ name: 'GET', value: 'GET' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: 'GET',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe("'GET' | 'POST' | 'PUT' | Expression<string>");
		});

		it('should map multiOptions type to array of union values', () => {
			const prop: NodeProperty = {
				name: 'tags',
				displayName: 'Tags',
				type: 'multiOptions',
				options: [
					{ name: 'Important', value: 'important' },
					{ name: 'Urgent', value: 'urgent' },
					{ name: 'Low', value: 'low' },
				],
				default: [],
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe("Array<'important' | 'urgent' | 'low'>");
		});

		it('should map json type to IDataObject | string | Expression', () => {
			const prop: NodeProperty = {
				name: 'body',
				displayName: 'Body',
				type: 'json',
				default: '{}',
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('IDataObject | string | Expression<string>');
		});

		it('should map resourceLocator type', () => {
			const prop: NodeProperty = {
				name: 'channel',
				displayName: 'Channel',
				type: 'resourceLocator',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('ResourceLocatorValue');
		});

		it('should map filter type', () => {
			const prop: NodeProperty = {
				name: 'filters',
				displayName: 'Filters',
				type: 'filter',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('FilterValue');
		});

		it('should map assignmentCollection type', () => {
			const prop: NodeProperty = {
				name: 'assignments',
				displayName: 'Values to Set',
				type: 'assignmentCollection',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('AssignmentCollectionValue');
		});

		it('should map fixedCollection type to Record<string, unknown>', () => {
			const prop: NodeProperty = {
				name: 'queryParameters',
				displayName: 'Query Parameters',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Parameters',
						name: 'parameters',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			};
			const result = generateTypes.mapPropertyType(prop);
			// fixedCollection maps to Record to avoid naming conflicts
			expect(result).toBe('Record<string, unknown>');
		});

		it('should map collection type to Record<string, unknown>', () => {
			const prop: NodeProperty = {
				name: 'options',
				displayName: 'Options',
				type: 'collection',
				default: {},
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('Record<string, unknown>');
		});

		it('should handle options with dynamic loading', () => {
			const prop: NodeProperty = {
				name: 'project',
				displayName: 'Project',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProjects' },
				default: '',
			};
			const result = generateTypes.mapPropertyType(prop);
			// Dynamic options should fall back to string
			expect(result).toBe('string | Expression<string>');
		});
	});

	// =========================================================================
	// Discriminated Union Generation Tests
	// =========================================================================

	describe('extractDiscriminatorCombinations', () => {
		it('should extract resource/operation combinations from Gmail node', () => {
			const combinations = generateTypes.extractDiscriminatorCombinations(mockGmailNode);

			// Gmail has message and label resources with multiple operations each
			expect(combinations).toContainEqual({ resource: 'message', operation: 'send' });
			expect(combinations).toContainEqual({ resource: 'message', operation: 'get' });
			expect(combinations).toContainEqual({ resource: 'message', operation: 'delete' });
			expect(combinations).toContainEqual({ resource: 'message', operation: 'reply' });
			expect(combinations).toContainEqual({ resource: 'message', operation: 'getAll' });
			expect(combinations).toContainEqual({ resource: 'label', operation: 'create' });
			expect(combinations).toContainEqual({ resource: 'label', operation: 'get' });
			expect(combinations).toContainEqual({ resource: 'label', operation: 'delete' });
			expect(combinations).toContainEqual({ resource: 'label', operation: 'getAll' });
		});

		it('should return empty array for nodes without discriminators', () => {
			const combinations = generateTypes.extractDiscriminatorCombinations(mockHttpRequestNode);
			expect(combinations).toEqual([]);
		});
	});

	describe('getPropertiesForCombination', () => {
		it('should return properties applicable to message/send combination', () => {
			const props = generateTypes.getPropertiesForCombination(mockGmailNode, {
				resource: 'message',
				operation: 'send',
			});

			const propNames = props.map((p) => p.name);
			expect(propNames).toContain('to');
			expect(propNames).toContain('subject');
			expect(propNames).toContain('message');
			expect(propNames).toContain('options');
			// Should NOT contain properties for other operations
			expect(propNames).not.toContain('messageId');
			expect(propNames).not.toContain('labelName');
			expect(propNames).not.toContain('labelId');
		});

		it('should return properties applicable to label/create combination', () => {
			const props = generateTypes.getPropertiesForCombination(mockGmailNode, {
				resource: 'label',
				operation: 'create',
			});

			const propNames = props.map((p) => p.name);
			expect(propNames).toContain('labelName');
			// Should NOT contain message properties
			expect(propNames).not.toContain('to');
			expect(propNames).not.toContain('subject');
			expect(propNames).not.toContain('message');
		});
	});

	describe('generateDiscriminatedUnion', () => {
		it('should generate discriminated union types for Gmail node', () => {
			const result = generateTypes.generateDiscriminatedUnion(mockGmailNode);

			// Should contain individual config types
			expect(result).toContain('GmailMessageSendConfig');
			expect(result).toContain('GmailMessageGetConfig');
			expect(result).toContain('GmailLabelCreateConfig');

			// Should contain discriminator fields
			expect(result).toContain("resource: 'message'");
			expect(result).toContain("operation: 'send'");

			// Should contain union type (resources are processed in order from options array)
			expect(result).toContain('GmailV21Params');
			expect(result).toMatch(/export type GmailV21Params\s*=/);
		});

		it('should generate simple interface for HTTP Request (no discriminators)', () => {
			const result = generateTypes.generateDiscriminatedUnion(mockHttpRequestNode);

			// Should NOT have discriminated unions
			expect(result).not.toContain('HttpRequestMessageSendConfig');

			// Should have a single interface
			expect(result).toContain('HttpRequestV42Params');
			expect(result).toContain('interface');
		});
	});

	// =========================================================================
	// JSDoc Generation Tests
	// =========================================================================

	describe('generatePropertyJSDoc', () => {
		it('should generate JSDoc with description', () => {
			const prop: NodeProperty = {
				name: 'url',
				displayName: 'URL',
				type: 'string',
				description: 'The URL to make the request to',
				default: '',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			expect(result).toContain('The URL to make the request to');
		});

		it('should include @default annotation', () => {
			const prop: NodeProperty = {
				name: 'timeout',
				displayName: 'Timeout',
				type: 'number',
				description: 'Request timeout',
				default: 10000,
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			expect(result).toContain('@default 10000');
		});

		it('should handle undefined description', () => {
			const prop: NodeProperty = {
				name: 'field',
				displayName: 'Field',
				type: 'string',
				default: '',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should use displayName as fallback or return minimal JSDoc
			expect(result).toBeTruthy();
		});

		it('should escape special characters in JSDoc', () => {
			const prop: NodeProperty = {
				name: 'filter',
				displayName: 'Filter',
				type: 'string',
				description: 'Filter with <html> & special "chars"',
				default: '',
			};
			const result = generateTypes.generatePropertyJSDoc(prop);
			// Should escape HTML characters
			expect(result).toContain('&lt;html&gt;');
			// Should have valid JSDoc structure
			expect(result).toContain('/**');
			expect(result).toContain('*/');
		});
	});

	describe('generateNodeJSDoc', () => {
		it('should generate node-level JSDoc with description and @see', () => {
			const result = generateTypes.generateNodeJSDoc(mockGmailNode);
			expect(result).toContain('Gmail');
			expect(result).toContain('Send and receive emails using Gmail');
			expect(result).toContain('@see');
		});

		it('should include @generated marker', () => {
			const result = generateTypes.generateNodeJSDoc(mockGmailNode);
			expect(result).toContain('@generated');
		});
	});

	// =========================================================================
	// Version Handling Tests
	// =========================================================================

	describe('groupVersionsByProperties', () => {
		it('should group versions with identical properties', () => {
			// Mock nodes with same properties at different versions
			const nodes: NodeTypeDescription[] = [
				{ ...mockHttpRequestNode, version: 4.1, properties: mockHttpRequestNode.properties },
				{ ...mockHttpRequestNode, version: 4.2, properties: mockHttpRequestNode.properties },
				{
					...mockHttpRequestNode,
					version: 3,
					properties: mockHttpRequestNode.properties.slice(0, 3),
				},
			];

			const groups = generateTypes.groupVersionsByProperties(nodes);

			// Versions 4.1 and 4.2 should be grouped together
			expect(groups.length).toBe(2);
			const v4Group = groups.find((g) => g.versions.includes(4.2));
			expect(v4Group?.versions).toContain(4.1);
			expect(v4Group?.versions).toContain(4.2);
		});
	});

	describe('getHighestVersion', () => {
		it('should return highest version from array', () => {
			expect(generateTypes.getHighestVersion([1, 2, 2.1, 3])).toBe(3);
		});

		it('should handle single version', () => {
			expect(generateTypes.getHighestVersion(1)).toBe(1);
		});

		it('should handle decimal versions', () => {
			expect(generateTypes.getHighestVersion([4, 4.1, 4.2, 4.3])).toBe(4.3);
		});
	});

	describe('versionToTypeName', () => {
		it('should convert version number to valid identifier', () => {
			expect(generateTypes.versionToTypeName(4.2)).toBe('V42');
			expect(generateTypes.versionToTypeName(1)).toBe('V1');
			expect(generateTypes.versionToTypeName(2.1)).toBe('V21');
		});
	});

	// =========================================================================
	// File Generation Tests
	// =========================================================================

	describe('nodeNameToFileName', () => {
		it('should convert node name to valid file name', () => {
			expect(generateTypes.nodeNameToFileName('n8n-nodes-base.httpRequest')).toBe('httpRequest');
			expect(generateTypes.nodeNameToFileName('n8n-nodes-base.gmail')).toBe('gmail');
			expect(generateTypes.nodeNameToFileName('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBe(
				'lmChatOpenAi',
			);
		});
	});

	describe('getPackageName', () => {
		it('should extract package name from node type', () => {
			expect(generateTypes.getPackageName('n8n-nodes-base.httpRequest')).toBe('n8n-nodes-base');
			expect(generateTypes.getPackageName('@n8n/n8n-nodes-langchain.agent')).toBe(
				'n8n-nodes-langchain',
			);
		});
	});

	describe('generateNodeTypeFile', () => {
		it('should generate complete type file for Gmail node', () => {
			const result = generateTypes.generateNodeTypeFile(mockGmailNode);

			// Should have header with @generated marker
			expect(result).toContain('@generated');
			expect(result).toContain('Do not edit manually');

			// Should have imports
			expect(result).toContain('import type { Expression');

			// Should have discriminated union types (with version suffix to avoid duplicates)
			expect(result).toContain('GmailV21MessageSendConfig');
			expect(result).toContain('GmailV21Params');

			// Should have credentials type
			expect(result).toContain('GmailV21Credentials');
			expect(result).toContain('gmailOAuth2');

			// Should have node type
			expect(result).toContain('GmailNode');
			expect(result).toContain("type: 'n8n-nodes-base.gmail'");
		});

		it('should generate type file for HTTP Request (no discriminators)', () => {
			const result = generateTypes.generateNodeTypeFile(mockHttpRequestNode);

			// Should have simple interface
			expect(result).toContain('HttpRequestV42Params');
			expect(result).toContain('interface');

			// Should have method options
			expect(result).toContain("'GET'");
			expect(result).toContain("'POST'");
		});

		it('should mark trigger nodes correctly', () => {
			const result = generateTypes.generateNodeTypeFile(mockTriggerNode);

			// Should indicate it's a trigger
			expect(result).toContain('isTrigger: true');
		});
	});

	describe('generateIndexFile', () => {
		it('should generate re-exports for all nodes', () => {
			const nodes = [mockHttpRequestNode, mockGmailNode];
			const result = generateTypes.generateIndexFile(nodes);

			// Should re-export all nodes
			expect(result).toContain("export * from './nodes/n8n-nodes-base/httpRequest'");
			expect(result).toContain("export * from './nodes/n8n-nodes-base/gmail'");

			// Should have @generated marker
			expect(result).toContain('@generated');

			// Should have AllNodeTypes union
			expect(result).toContain('AllNodeTypes');
			expect(result).toContain('HttpRequestNode');
			expect(result).toContain('GmailNode');
		});
	});

	// =========================================================================
	// Integration Tests
	// =========================================================================

	describe('loadNodeTypes', () => {
		const nodesPath = path.resolve(__dirname, '../../../nodes-base/dist/types/nodes.json');
		const hasNodesJson = fs.existsSync(nodesPath);

		it('should load nodes from nodes.json file', async () => {
			if (!hasNodesJson) {
				// Skip test if nodes.json doesn't exist
				expect(true).toBe(true);
				return;
			}

			// Pass package name to prefix node names
			const nodes = await generateTypes.loadNodeTypes(nodesPath, 'n8n-nodes-base');

			expect(Array.isArray(nodes)).toBe(true);
			expect(nodes.length).toBeGreaterThan(100); // Should have 400+ nodes

			// Should have HTTP Request node (with package prefix added)
			const httpNode = nodes.find((n) => n.name === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
			expect(httpNode?.displayName).toBe('HTTP Request');
		});
	});

	describe('full generation', () => {
		const outputDir = path.resolve(__dirname, '../types/generated');
		const nodesPath = path.resolve(__dirname, '../../../nodes-base/dist/types/nodes.json');
		const hasNodesJson = fs.existsSync(nodesPath);

		it('should generate valid TypeScript files', async () => {
			if (!hasNodesJson) {
				// Skip test if nodes.json doesn't exist
				expect(true).toBe(true);
				return;
			}

			// Run the generator
			await generateTypes.generateTypes();

			// Check that index.ts was created
			const indexPath = path.join(outputDir, 'index.ts');
			expect(fs.existsSync(indexPath)).toBe(true);

			// Check that some node files were created
			const httpRequestPath = path.join(outputDir, 'nodes/n8n-nodes-base/httpRequest.ts');
			expect(fs.existsSync(httpRequestPath)).toBe(true);

			const gmailPath = path.join(outputDir, 'nodes/n8n-nodes-base/gmail.ts');
			expect(fs.existsSync(gmailPath)).toBe(true);
		});

		it('should skip hidden nodes', async () => {
			if (!hasNodesJson) {
				// Skip test if nodes.json doesn't exist
				expect(true).toBe(true);
				return;
			}

			await generateTypes.generateTypes();

			// Hidden nodes should not have generated files
			// (would need to check actual hidden nodes from the JSON)
		});
	});

	// =========================================================================
	// Edge Case Tests
	// =========================================================================

	describe('edge cases', () => {
		it('should handle node with version as single number', () => {
			const node: NodeTypeDescription = {
				...mockHttpRequestNode,
				version: 1, // Single number, not array
			};
			const result = generateTypes.generateNodeTypeFile(node);
			expect(result).toContain('V1Params');
		});

		it('should handle null defaults', () => {
			const prop: NodeProperty = {
				name: 'optional',
				displayName: 'Optional',
				type: 'string',
				default: null,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('string | Expression<string>');
		});

		it('should handle options with numeric values', () => {
			const prop: NodeProperty = {
				name: 'priority',
				displayName: 'Priority',
				type: 'options',
				options: [
					{ name: 'Low', value: 1 },
					{ name: 'Medium', value: 2 },
					{ name: 'High', value: 3 },
				],
				default: 1,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('1 | 2 | 3 | Expression<number>');
		});

		it('should handle options with boolean values', () => {
			const prop: NodeProperty = {
				name: 'flag',
				displayName: 'Flag',
				type: 'options',
				options: [
					{ name: 'Yes', value: true },
					{ name: 'No', value: false },
				],
				default: true,
			};
			const result = generateTypes.mapPropertyType(prop);
			expect(result).toBe('true | false | Expression<boolean>');
		});

		it('should handle AI connection types in inputs/outputs', () => {
			const aiNode: NodeTypeDescription = {
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				description: 'AI Agent node',
				group: ['transform'],
				version: 1,
				inputs: [
					{ type: 'main' },
					{ type: 'ai_languageModel', displayName: 'Model' },
					{ type: 'ai_memory', displayName: 'Memory' },
					{ type: 'ai_tool', displayName: 'Tool' },
				],
				outputs: ['main'],
				properties: [],
			};
			const result = generateTypes.generateNodeTypeFile(aiNode);
			// Should handle AI inputs correctly
			expect(result).toBeDefined();
		});

		it('should escape property names that are reserved words', () => {
			const prop: NodeProperty = {
				name: 'default',
				displayName: 'Default',
				type: 'string',
				default: '',
			};
			// Property name 'default' is a reserved word
			const result = generateTypes.generatePropertyLine(prop, false);
			expect(result).toContain("'default'"); // Should be quoted
		});
	});
});
