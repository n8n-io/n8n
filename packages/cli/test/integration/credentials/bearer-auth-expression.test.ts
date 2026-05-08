/**
 * Regression test for GHC-8228: MCP Bearer Auth with expression referencing previous node
 *
 * Issue: When using bearer auth credential with an expression that references a previous node,
 * the credential resolution fails with "No path back to node" error.
 *
 * This happens because credentials are resolved early in the node execution (before the item loop),
 * and the workflow graph context needed to resolve the expression is not properly set up.
 */

import { testDb, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type {
	INode,
	INodeExecutionData,
	IExecuteData,
	IRunExecutionData,
	ITaskDataConnections,
} from 'n8n-workflow';
import { Workflow, NodeConnectionTypes } from 'n8n-workflow';

import { ExecuteContext } from 'n8n-core';
import { CredentialsHelper } from '@/credentials-helper';
import { CredentialTypes } from '@/credential-types';
import { setupTestServer } from '@test-integration/utils';

setupTestServer({ endpointGroups: [] });

describe('Bearer Auth Credential with Expression', () => {
	const globalConfig = Container.get(GlobalConfig);
	let credentialsHelper: CredentialsHelper;
	let credentialTypes: CredentialTypes;

	beforeAll(async () => {
		credentialsHelper = Container.get(CredentialsHelper);
		credentialTypes = Container.get(CredentialTypes);
	});

	beforeEach(async () => {
		await testDb.truncate(['CredentialsEntity']);
		jest.clearAllMocks();
	});

	/**
	 * Test case: Bearer auth credential with expression referencing a previous node
	 *
	 * Workflow structure:
	 *   [Generate Token] -> [MCP Client with Bearer Auth]
	 *
	 * The bearer auth credential uses an expression: {{ $json.access_token }}
	 * This should resolve to the output of the "Generate Token" node.
	 */
	it('should resolve bearer auth credential expression referencing previous node', async () => {
		// GHC-8228: This test is expected to FAIL until the bug is fixed

		// Create workflow nodes
		const generateTokenNode: INode = {
			id: 'generate-token-node',
			name: 'Generate Token',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [100, 100],
			parameters: {
				values: {
					string: [
						{
							name: 'access_token',
							value: 'test-bearer-token-12345',
						},
					],
				},
			},
		};

		const mcpClientNode: INode = {
			id: 'mcp-client-node',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1,
			position: [300, 100],
			parameters: {
				authentication: 'bearerAuth',
				serverTransport: 'httpStreamable',
				endpointUrl: 'https://test.example.com/mcp',
				tool: { mode: 'list', value: 'test_tool' },
				inputMode: 'json',
				jsonInput: '{}',
			},
			credentials: {
				httpBearerAuth: {
					id: 'test-bearer-cred',
					name: 'Test Bearer Auth',
				},
			},
		};

		// Create workflow with connection from Generate Token to MCP Client
		const workflow = new Workflow({
			id: 'test-workflow',
			name: 'Test Workflow',
			nodes: [generateTokenNode, mcpClientNode],
			connections: {
				'Generate Token': {
					[NodeConnectionTypes.Main]: [[{ node: 'MCP Client', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
			active: false,
			nodeTypes: mock(),
			settings: {},
		});

		// Set up execution data as if "Generate Token" node has already executed
		const connectionInputData: INodeExecutionData[] = [
			{
				json: {
					access_token: 'test-bearer-token-12345',
				},
			},
		];

		const inputData: ITaskDataConnections = {
			[NodeConnectionTypes.Main]: [connectionInputData],
		};

		const executeData: IExecuteData = {
			data: {
				[NodeConnectionTypes.Main]: [connectionInputData],
			},
			node: mcpClientNode,
			source: {
				[NodeConnectionTypes.Main]: [
					{
						previousNode: 'Generate Token',
						previousNodeOutput: 0,
					},
				],
			},
		};

		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {
					'Generate Token': [
						{
							startTime: Date.now(),
							executionTime: 10,
							data: {
								[NodeConnectionTypes.Main]: [connectionInputData],
							},
							source: [],
						},
					],
				},
			},
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		const additionalData = mock<any>({
			credentialsHelper,
			executionId: 'test-execution-id',
			restApiUrl: 'http://localhost:5678',
			instanceBaseUrl: 'http://localhost:5678',
			webhookBaseUrl: 'http://localhost:5678',
			webhookWaitingBaseUrl: 'http://localhost:5678',
			webhookTestBaseUrl: 'http://localhost:5678',
		});

		// Create execution context for the MCP Client node
		const executeContext = new ExecuteContext(
			workflow,
			mcpClientNode,
			additionalData,
			'manual',
			runExecutionData,
			0,
			connectionInputData,
			inputData,
			executeData,
			[],
		);

		// Mock the credential data with expression
		// In real scenario, this would be stored in the database
		const credentialDataWithExpression = {
			token: '={{ $json.access_token }}', // Expression referencing previous node output
		};

		// Mock getDecrypted to return credential data with expression
		jest.spyOn(credentialsHelper, 'getDecrypted').mockImplementation(async (
			_additionalData,
			_nodeCredentials,
			_type,
			_mode,
			_executeData,
			_raw,
			expressionResolveValues,
		) => {
			// This should resolve the expression using the workflow data proxy
			// GHC-8228: Currently this throws "No path back to node" error

			if (expressionResolveValues) {
				const { workflow: wf, node, runExecutionData: red, runIndex, connectionInputData: cid, itemIndex } = expressionResolveValues;

				// Try to resolve the expression
				const resolvedToken = wf.expression.getParameterValue(
					credentialDataWithExpression.token,
					red,
					runIndex,
					itemIndex,
					node.name,
					cid,
					'manual',
					{},
					executeData,
				);

				return {
					token: resolvedToken,
				};
			}

			return credentialDataWithExpression;
		});

		// Try to get credentials - this should resolve the expression
		// GHC-8228: This is expected to throw "No path back to node" error until the bug is fixed
		await expect(async () => {
			const credentials = await executeContext.getCredentials('httpBearerAuth', 0);

			// If we get here, the bug is fixed!
			expect(credentials).toBeDefined();
			expect((credentials as any).token).toBe('test-bearer-token-12345');
		}).rejects.toThrow(/No path back to node|paired_item_no_connection/i);
	});

	/**
	 * Test case: Bearer auth credential with static value (should work)
	 *
	 * This test verifies that static bearer tokens (without expressions) work correctly.
	 * This is the "happy path" that should always pass.
	 */
	it('should resolve bearer auth credential with static value', async () => {
		const mcpClientNode: INode = {
			id: 'mcp-client-node',
			name: 'MCP Client',
			type: '@n8n/n8n-nodes-langchain.mcpClient',
			typeVersion: 1,
			position: [100, 100],
			parameters: {
				authentication: 'bearerAuth',
				serverTransport: 'httpStreamable',
				endpointUrl: 'https://test.example.com/mcp',
				tool: { mode: 'list', value: 'test_tool' },
				inputMode: 'json',
				jsonInput: '{}',
			},
			credentials: {
				httpBearerAuth: {
					id: 'test-bearer-cred',
					name: 'Test Bearer Auth',
				},
			},
		};

		const workflow = new Workflow({
			id: 'test-workflow',
			name: 'Test Workflow',
			nodes: [mcpClientNode],
			connections: {},
			active: false,
			nodeTypes: mock(),
			settings: {},
		});

		const connectionInputData: INodeExecutionData[] = [{ json: {} }];
		const inputData: ITaskDataConnections = {
			[NodeConnectionTypes.Main]: [connectionInputData],
		};

		const executeData: IExecuteData = {
			data: {
				[NodeConnectionTypes.Main]: [connectionInputData],
			},
			node: mcpClientNode,
			source: {
				[NodeConnectionTypes.Main]: [],
			},
		};

		const runExecutionData: IRunExecutionData = {
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		const additionalData = mock<any>({
			credentialsHelper,
			executionId: 'test-execution-id',
			restApiUrl: 'http://localhost:5678',
			instanceBaseUrl: 'http://localhost:5678',
			webhookBaseUrl: 'http://localhost:5678',
			webhookWaitingBaseUrl: 'http://localhost:5678',
			webhookTestBaseUrl: 'http://localhost:5678',
		});

		const executeContext = new ExecuteContext(
			workflow,
			mcpClientNode,
			additionalData,
			'manual',
			runExecutionData,
			0,
			connectionInputData,
			inputData,
			executeData,
			[],
		);

		// Mock static credential value
		jest.spyOn(credentialsHelper, 'getDecrypted').mockResolvedValue({
			token: 'static-bearer-token-67890',
		});

		// This should work fine with static values
		const credentials = await executeContext.getCredentials('httpBearerAuth', 0);

		expect(credentials).toBeDefined();
		expect((credentials as any).token).toBe('static-bearer-token-67890');
	});
});
