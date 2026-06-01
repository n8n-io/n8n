import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { validateParameters } from '@/validation/checks/parameters';

function createNodeType(
	type: string,
	properties: INodeTypeDescription['properties'] = [],
	version: number | number[] = 1,
): INodeTypeDescription {
	return {
		name: type,
		displayName: type.split('.').pop() ?? type,
		group: ['transform'],
		version,
		description: 'Test node',
		defaults: { name: type.split('.').pop() ?? type },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties,
	} as INodeTypeDescription;
}

function createNode(
	type: string,
	parameters: Record<string, unknown> = {},
	options: { name?: string; id?: string; typeVersion?: number } = {},
): SimpleWorkflow['nodes'][0] {
	const { name = 'Test Node', id = '1', typeVersion = 1 } = options;
	return {
		id,
		name,
		type,
		parameters: parameters as INodeParameters,
		typeVersion,
		position: [0, 0],
	};
}

function createWorkflow(nodes: SimpleWorkflow['nodes']): SimpleWorkflow {
	return { name: 'Test Workflow', nodes, connections: {} };
}

describe('validateParameters', () => {
	describe('node-missing-required-parameter', () => {
		it.each([
			['empty string default', ''],
			['undefined default', undefined],
		])('should flag missing required parameter with %s', (_, defaultValue) => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					default: defaultValue as string,
					required: true,
				},
			]);
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					type: 'critical',
					pointsDeducted: 50,
					metadata: expect.objectContaining({
						nodeName: 'Test Node',
						nodeType: 'n8n-nodes-base.test',
						parameterName: 'apiKey',
					}),
				}),
			);
		});

		it('should NOT flag required parameter with meaningful default or when value is provided', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					required: true,
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					default: '',
					required: true,
				},
			]);
			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { apiKey: 'my-key' }), // method uses default, apiKey provided
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toHaveLength(0);
		});

		it('should respect displayOptions for resource/operation', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Resource',
					name: 'resource',
					type: 'options',
					default: 'user',
					options: [
						{ name: 'User', value: 'user' },
						{ name: 'Post', value: 'post' },
					],
				},
				{
					displayName: 'Post ID',
					name: 'postId',
					type: 'string',
					default: '',
					required: true,
					displayOptions: { show: { resource: ['post'] } },
				},
			]);

			// Resource is 'user', so postId should not be required
			const workflowUser = createWorkflow([
				createNode('n8n-nodes-base.test', { resource: 'user' }),
			]);
			expect(validateParameters(workflowUser, [nodeType])).toHaveLength(0);

			// Resource is 'post', so postId IS required
			const workflowPost = createWorkflow([
				createNode('n8n-nodes-base.test', { resource: 'post' }),
			]);
			expect(validateParameters(workflowPost, [nodeType])).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({ parameterName: 'postId' }),
				}),
			);
		});

		it.each(['collection', 'fixedCollection', 'credentialsSelect'] as const)(
			'should skip %s type parameters',
			(type) => {
				const nodeType = createNodeType('n8n-nodes-base.test', [
					{
						displayName: 'Options',
						name: 'options',
						type,
						default: {},
						required: true,
						options: [],
					},
				]);
				const workflow = createWorkflow([createNode('n8n-nodes-base.test', {})]);

				expect(validateParameters(workflow, [nodeType])).toHaveLength(0);
			},
		);
	});

	describe('node-invalid-options-value', () => {
		it('should flag invalid options value with metadata', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { method: 'INVALID' })]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
					type: 'critical',
					pointsDeducted: 50,
					metadata: expect.objectContaining({
						parameterName: 'method',
						invalidValue: 'INVALID',
					}),
				}),
			);
		});

		it('should NOT flag valid options value', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Method',
					name: 'method',
					type: 'options',
					default: 'GET',
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', { method: 'POST' })]);

			expect(validateParameters(workflow, [nodeType])).toHaveLength(0);
		});

		it.each([
			['dynamic loadOptionsMethod', { channel: 'any-value' }, { loadOptionsMethod: 'getChannels' }],
			['expression values', { method: '={{ $json.method }}' }, undefined],
			['undefined values', {}, undefined],
		])('should skip validation for %s', (_, params, typeOptions) => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Field',
					name: Object.keys(params)[0] ?? 'method',
					type: 'options',
					default: 'GET',
					typeOptions,
					options: [
						{ name: 'GET', value: 'GET' },
						{ name: 'POST', value: 'POST' },
					],
				},
			]);
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', params)]);

			expect(validateParameters(workflow, [nodeType])).toHaveLength(0);
		});

		it('should handle non-string option values (numeric, boolean)', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'Priority',
					name: 'priority',
					type: 'options',
					default: 1,
					options: [
						{ name: 'Low', value: 1 },
						{ name: 'High', value: 3 },
					],
				},
				{
					displayName: 'Enabled',
					name: 'enabled',
					type: 'options',
					default: true,
					options: [
						{ name: 'Yes', value: true },
						{ name: 'No', value: false },
					],
				},
			]);
			// Invalid numeric value
			const workflowNumeric = createWorkflow([
				createNode('n8n-nodes-base.test', { priority: 5 }, { id: '1', name: 'Node 1' }),
			]);
			expect(validateParameters(workflowNumeric, [nodeType])).toContainEqual(
				expect.objectContaining({ name: 'node-invalid-options-value' }),
			);

			// Invalid boolean value (string instead of boolean)
			const workflowBoolean = createWorkflow([
				createNode('n8n-nodes-base.test', { enabled: 'yes' }, { id: '2', name: 'Node 2' }),
			]);
			expect(validateParameters(workflowBoolean, [nodeType])).toContainEqual(
				expect.objectContaining({ name: 'node-invalid-options-value' }),
			);

			// Valid boolean value should pass
			const workflowValidBoolean = createWorkflow([
				createNode('n8n-nodes-base.test', { enabled: false }, { id: '3', name: 'Node 3' }),
			]);
			expect(validateParameters(workflowValidBoolean, [nodeType])).toHaveLength(0);
		});
	});

	describe('edge cases', () => {
		it('should validate multiple nodes independently', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{ displayName: 'Field', name: 'field', type: 'string', default: '', required: true },
			]);
			const workflow = createWorkflow([
				createNode('n8n-nodes-base.test', { field: 'valid' }, { id: '1', name: 'Node 1' }),
				createNode('n8n-nodes-base.test', {}, { id: '2', name: 'Node 2' }),
				createNode('n8n-nodes-base.test', { field: 'valid' }, { id: '3', name: 'Node 3' }),
			]);

			const violations = validateParameters(workflow, [nodeType]);

			expect(violations).toHaveLength(1);
			expect(violations[0].metadata?.nodeName).toBe('Node 2');
		});

		it('should respect displayOptions for boolean parameters (e.g., sshTunnel)', () => {
			const nodeType = createNodeType('n8n-nodes-base.test', [
				{
					displayName: 'SSH Tunnel',
					name: 'sshTunnel',
					type: 'boolean',
					default: false,
				},
				{
					displayName: 'SSH Host',
					name: 'sshHost',
					type: 'string',
					default: '',
					required: true,
					displayOptions: { show: { sshTunnel: [true] } },
				},
				{
					displayName: 'Regular Field',
					name: 'regularField',
					type: 'string',
					default: '',
					required: true,
					displayOptions: { hide: { sshTunnel: [true] } },
				},
			]);

			// sshTunnel is false, so sshHost should be hidden (not required)
			// but regularField is shown (required)
			const workflowTunnelOff = createWorkflow([
				createNode('n8n-nodes-base.test', { sshTunnel: false, regularField: 'value' }),
			]);
			expect(validateParameters(workflowTunnelOff, [nodeType])).toHaveLength(0);

			// sshTunnel is true, so sshHost is shown (required) and regularField is hidden
			// Missing sshHost should trigger violation
			const workflowTunnelOn = createWorkflow([
				createNode('n8n-nodes-base.test', { sshTunnel: true }),
			]);
			const violations = validateParameters(workflowTunnelOn, [nodeType]);
			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({ parameterName: 'sshHost' }),
				}),
			);
			// regularField should NOT be flagged since it's hidden when sshTunnel is true
			expect(violations).not.toContainEqual(
				expect.objectContaining({
					metadata: expect.objectContaining({ parameterName: 'regularField' }),
				}),
			);

			// sshTunnel is true and sshHost is provided - should pass
			const workflowTunnelOnValid = createWorkflow([
				createNode('n8n-nodes-base.test', { sshTunnel: true, sshHost: 'localhost' }),
			]);
			expect(validateParameters(workflowTunnelOnValid, [nodeType])).toHaveLength(0);
		});

		it('should handle node with different version via @version displayOptions', () => {
			const nodeType = createNodeType(
				'n8n-nodes-base.test',
				[
					{
						displayName: 'V1 Field',
						name: 'v1Field',
						type: 'string',
						default: '',
						required: true,
						displayOptions: { show: { '@version': [1] } },
					},
				],
				[1, 2],
			);
			// Node is version 2, so v1Field should be hidden
			const workflow = createWorkflow([createNode('n8n-nodes-base.test', {}, { typeVersion: 2 })]);

			expect(validateParameters(workflow, [nodeType])).toHaveLength(0);
		});

		it('should respect displayOptions for mode parameter (e.g., Vector Store nodes)', () => {
			const nodeType = createNodeType('n8n-nodes-langchain.vectorStore', [
				{
					displayName: 'Mode',
					name: 'mode',
					type: 'options',
					default: 'retrieve',
					options: [
						{ name: 'Retrieve', value: 'retrieve' },
						{ name: 'Insert', value: 'insert' },
						{ name: 'Retrieve as Tool', value: 'retrieve-as-tool' },
					],
				},
				{
					displayName: 'Description',
					name: 'toolDescription',
					type: 'string',
					default: '',
					required: true,
					displayOptions: { show: { mode: ['retrieve-as-tool'] } },
				},
			]);

			// Mode is 'retrieve', so toolDescription should NOT be required
			const workflowRetrieve = createWorkflow([
				createNode('n8n-nodes-langchain.vectorStore', { mode: 'retrieve' }),
			]);
			expect(validateParameters(workflowRetrieve, [nodeType])).toHaveLength(0);

			// Mode is 'retrieve-as-tool', so toolDescription IS required
			const workflowTool = createWorkflow([
				createNode('n8n-nodes-langchain.vectorStore', { mode: 'retrieve-as-tool' }),
			]);
			expect(validateParameters(workflowTool, [nodeType])).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({ parameterName: 'toolDescription' }),
				}),
			);
		});

		it('should respect displayOptions for authentication parameter', () => {
			const nodeType = createNodeType('n8n-nodes-base.discord', [
				{
					displayName: 'Authentication',
					name: 'authentication',
					type: 'options',
					default: 'botToken',
					options: [
						{ name: 'Bot Token', value: 'botToken' },
						{ name: 'Webhook', value: 'webhook' },
					],
				},
				// Bot token operation (includes send, getAll)
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'send',
					displayOptions: { show: { authentication: ['botToken'] } },
					options: [
						{ name: 'Send', value: 'send' },
						{ name: 'Get All', value: 'getAll' },
					],
				},
				// Webhook operation (only sendLegacy)
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					default: 'sendLegacy',
					displayOptions: { show: { authentication: ['webhook'] } },
					options: [{ name: 'Send', value: 'sendLegacy' }],
				},
			]);

			// Using botToken auth with 'send' operation - should be valid
			const workflowBotSend = createWorkflow([
				createNode('n8n-nodes-base.discord', { authentication: 'botToken', operation: 'send' }),
			]);
			expect(validateParameters(workflowBotSend, [nodeType])).toHaveLength(0);

			// Using botToken auth with 'getAll' operation - should be valid
			const workflowBotGetAll = createWorkflow([
				createNode('n8n-nodes-base.discord', { authentication: 'botToken', operation: 'getAll' }),
			]);
			expect(validateParameters(workflowBotGetAll, [nodeType])).toHaveLength(0);

			// Using webhook auth with 'sendLegacy' operation - should be valid
			const workflowWebhook = createWorkflow([
				createNode('n8n-nodes-base.discord', {
					authentication: 'webhook',
					operation: 'sendLegacy',
				}),
			]);
			expect(validateParameters(workflowWebhook, [nodeType])).toHaveLength(0);

			// Using webhook auth with 'send' operation - should be invalid
			// (send is only valid for botToken, not webhook)
			const workflowWebhookInvalid = createWorkflow([
				createNode('n8n-nodes-base.discord', { authentication: 'webhook', operation: 'send' }),
			]);
			expect(validateParameters(workflowWebhookInvalid, [nodeType])).toContainEqual(
				expect.objectContaining({
					name: 'node-invalid-options-value',
					metadata: expect.objectContaining({ parameterName: 'operation', invalidValue: 'send' }),
				}),
			);
		});
	});

	describe('real-world workflow scenarios', () => {
		it('should validate Discord nodes from Eco chatbot workflow (botToken + send/getAll)', () => {
			// Simulates the Discord node structure with multiple operation properties
			// for different authentication methods
			const discordNodeType = createNodeType(
				'n8n-nodes-base.discord',
				[
					{
						displayName: 'Authentication',
						name: 'authentication',
						type: 'options',
						default: 'botToken',
						options: [
							{ name: 'Bot Token', value: 'botToken' },
							{ name: 'OAuth2', value: 'oAuth2' },
							{ name: 'Webhook', value: 'webhook' },
						],
					},
					{
						displayName: 'Resource',
						name: 'resource',
						type: 'options',
						default: 'message',
						displayOptions: { show: { authentication: ['botToken', 'oAuth2'] } },
						options: [
							{ name: 'Message', value: 'message' },
							{ name: 'Channel', value: 'channel' },
						],
					},
					// Message operations for botToken/oAuth2
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						default: 'send',
						displayOptions: {
							show: { resource: ['message'], authentication: ['botToken', 'oAuth2'] },
						},
						options: [
							{ name: 'Send', value: 'send' },
							{ name: 'Get All', value: 'getAll' },
							{ name: 'Delete', value: 'deleteMessage' },
						],
					},
					// Webhook operation (different options)
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						default: 'sendLegacy',
						displayOptions: { show: { authentication: ['webhook'] } },
						options: [{ name: 'Send', value: 'sendLegacy' }],
					},
				],
				[1, 2], // Include version 2 to match node's typeVersion
			);

			const getMessagesWorkflow = createWorkflow([
				createNode(
					'n8n-nodes-base.discord',
					{ authentication: 'botToken', resource: 'message', operation: 'getAll' },
					{ name: 'Get Discord Messages', typeVersion: 2 },
				),
			]);
			expect(validateParameters(getMessagesWorkflow, [discordNodeType])).toHaveLength(0);

			// "Send Discord Response" node from workflow
			const sendResponseWorkflow = createWorkflow([
				createNode(
					'n8n-nodes-base.discord',
					{ authentication: 'botToken', resource: 'message', operation: 'send' },
					{ name: 'Send Discord Response', typeVersion: 2 },
				),
			]);
			expect(validateParameters(sendResponseWorkflow, [discordNodeType])).toHaveLength(0);
		});

		it('should validate Vector Store nodes from Eco chatbot workflow', () => {
			// Simulates the Vector Store In Memory node structure
			const vectorStoreNodeType = createNodeType(
				'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
				[
					{
						displayName: 'Operation Mode',
						name: 'mode',
						type: 'options',
						default: 'retrieve',
						options: [
							{ name: 'Get Many', value: 'load' },
							{ name: 'Insert Documents', value: 'insert' },
							{ name: 'Retrieve Documents (As Vector Store)', value: 'retrieve' },
							{ name: 'Retrieve Documents (As Tool)', value: 'retrieve-as-tool' },
							{ name: 'Update Documents', value: 'update' },
						],
					},
					{
						displayName: 'Description',
						name: 'toolDescription',
						type: 'string',
						default: '',
						required: true,
						displayOptions: { show: { mode: ['retrieve-as-tool'] } },
					},
					{
						displayName: 'Prompt',
						name: 'prompt',
						type: 'string',
						default: '',
						required: true,
						displayOptions: { show: { mode: ['load'] } },
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						required: true,
						displayOptions: { show: { mode: ['update'] } },
					},
				],
				[1, 1.1, 1.2, 1.3], // Include version 1.3 to match node's typeVersion
			);

			// "Vector Store - Load Rules" node (mode: insert) - no toolDescription required
			const loadRulesWorkflow = createWorkflow([
				createNode(
					'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					{ mode: 'insert', clearStore: false },
					{ name: 'Vector Store - Load Rules', typeVersion: 1.3 },
				),
			]);
			expect(validateParameters(loadRulesWorkflow, [vectorStoreNodeType])).toHaveLength(0);

			// "Vector Store - Query Tool" node (mode: retrieve-as-tool) with toolDescription provided
			const queryToolWorkflow = createWorkflow([
				createNode(
					'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					{
						mode: 'retrieve-as-tool',
						toolDescription:
							'Search the Eco community ruleset documents to find relevant rules and regulations.',
						topK: 5,
					},
					{ name: 'Vector Store - Query Tool', typeVersion: 1.3 },
				),
			]);
			expect(validateParameters(queryToolWorkflow, [vectorStoreNodeType])).toHaveLength(0);

			// Vector Store in 'retrieve-as-tool' mode WITHOUT toolDescription - should fail
			const missingDescriptionWorkflow = createWorkflow([
				createNode(
					'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					{ mode: 'retrieve-as-tool', topK: 5 },
					{ name: 'Vector Store Missing Description', typeVersion: 1.3 },
				),
			]);
			expect(validateParameters(missingDescriptionWorkflow, [vectorStoreNodeType])).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({
						nodeName: 'Vector Store Missing Description',
						parameterName: 'toolDescription',
					}),
				}),
			);

			// Vector Store in 'load' mode WITHOUT prompt - should fail
			const missingPromptWorkflow = createWorkflow([
				createNode(
					'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					{ mode: 'load' },
					{ name: 'Vector Store Missing Prompt', typeVersion: 1.3 },
				),
			]);
			expect(validateParameters(missingPromptWorkflow, [vectorStoreNodeType])).toContainEqual(
				expect.objectContaining({
					name: 'node-missing-required-parameter',
					metadata: expect.objectContaining({
						nodeName: 'Vector Store Missing Prompt',
						parameterName: 'prompt',
					}),
				}),
			);

			// Vector Store in 'retrieve' mode - no extra required params
			const retrieveWorkflow = createWorkflow([
				createNode(
					'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
					{ mode: 'retrieve' },
					{ name: 'Vector Store Retrieve', typeVersion: 1.3 },
				),
			]);
			expect(validateParameters(retrieveWorkflow, [vectorStoreNodeType])).toHaveLength(0);
		});
	});
});
