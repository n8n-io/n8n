import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext, NodeDescription } from '../../../types';
import { validateWorkflowConfig } from '../validate-workflow.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(overrides?: Partial<InstanceAiContext>): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			unarchive: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
			clearAiTemporary: jest.fn(),
			archiveIfAiTemporary: jest.fn(),
		},
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {
			list: jest.fn().mockResolvedValue([]),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
			getParameterIssues: jest.fn().mockResolvedValue({}),
		},
		dataTableService: {
			list: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			getSchema: jest.fn(),
			addColumn: jest.fn(),
			deleteColumn: jest.fn(),
			renameColumn: jest.fn(),
			queryRows: jest.fn(),
			insertRows: jest.fn(),
			updateRows: jest.fn(),
			deleteRows: jest.fn(),
		},
		...overrides,
	} as unknown as InstanceAiContext;
}

function makeNode(overrides: Partial<NodeJSON> = {}): NodeJSON {
	return {
		name: 'Send Telegram message',
		type: 'n8n-nodes-base.telegram',
		typeVersion: 1,
		parameters: {},
		position: [250, 300] as [number, number],
		id: 'node-1',
		...overrides,
	} as NodeJSON;
}

function makeWorkflow(nodes: NodeJSON[]): WorkflowJSON {
	return { nodes, connections: {} } as unknown as WorkflowJSON;
}

function makeDescription(overrides: Partial<NodeDescription> = {}): NodeDescription {
	return {
		name: 'n8n-nodes-base.telegram',
		displayName: 'Telegram',
		description: '',
		group: [],
		version: 1,
		properties: [],
		credentials: [],
		inputs: [],
		outputs: [],
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// validateWorkflowConfig
// ---------------------------------------------------------------------------

describe('validateWorkflowConfig', () => {
	describe('input validation', () => {
		it('rejects when neither workflowId nor workflow is provided', async () => {
			const context = createMockContext();
			await expect(validateWorkflowConfig(context, {})).rejects.toThrow(
				'requires either workflowId or workflow',
			);
		});

		it('rejects when both workflowId and workflow are provided', async () => {
			const context = createMockContext();
			await expect(
				validateWorkflowConfig(context, { workflowId: 'w1', workflow: makeWorkflow([]) }),
			).rejects.toThrow('not both');
		});
	});

	describe('credential issues', () => {
		it('flags a node whose required credential is unset', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'telegramApi', required: true }],
				}),
			);
			const node = makeNode();

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(false);
			expect(result.issues[node.name!].credentials).toEqual({
				telegramApi: ['Credentials for Telegram are not set.'],
			});
			expect(result.summary).toContain(
				'Send Telegram message: credentials.telegramApi: Credentials for Telegram are not set.',
			);
		});

		it('does not flag a required credential when one is set and exists for the user', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'telegramApi', required: true }],
				}),
			);
			(context.credentialService.list as jest.Mock).mockResolvedValue([
				{ id: 'cred-1', name: 'My Telegram', type: 'telegramApi' },
			]);
			const node = makeNode({
				credentials: { telegramApi: { id: 'cred-1', name: 'My Telegram' } },
			});

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(true);
			expect(result.issues).toEqual({});
		});

		it('emits a "do not exist" issue when the selected credential is not in the user\'s store', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'telegramApi', required: true }],
				}),
			);
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);
			const node = makeNode({
				credentials: { telegramApi: { id: 'cred-missing', name: 'Foreign Telegram' } },
			});

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.issues[node.name!].credentials?.telegramApi?.[0]).toContain(
				'Credentials with name Foreign Telegram do not exist',
			);
		});

		it('emits a "not identified" issue when multiple stored credentials match the selected name', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'telegramApi', required: true }],
				}),
			);
			(context.credentialService.list as jest.Mock).mockResolvedValue([
				{ id: 'cred-1', name: 'Same Name', type: 'telegramApi' },
				{ id: 'cred-2', name: 'Same Name', type: 'telegramApi' },
			]);
			const node = makeNode({
				credentials: { telegramApi: { name: 'Same Name' } as { name: string } },
			});

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.issues[node.name!].credentials?.telegramApi?.[0]).toContain(
				'Credentials with name Same Name exist for telegramApi',
			);
		});

		it('skips AI-gateway-managed credentials', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'openAiApi', required: true }],
				}),
			);
			const node = makeNode({
				type: 'n8n-nodes-base.openAi',
				credentials: {
					openAiApi: {
						id: null,
						name: 'gateway',
						__aiGatewayManaged: true,
					} as unknown as { id: string; name: string },
				},
			});

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(true);
			expect(result.issues).toEqual({});
		});

		it('respects displayOptions when filtering credential types', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [
						{
							name: 'httpSslAuth',
							required: true,
							displayOptions: { show: { provideSslCertificates: [true] } },
						},
					],
				}),
			);
			const node = makeNode({ parameters: {} });

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			// displayOptions exclude httpSslAuth → no issue should be reported
			expect(result.valid).toBe(true);
		});
	});

	describe('HTTP Request paths', () => {
		// The real HTTP Request node lists its supported auth types under `credentials`
		// (httpBasicAuth, httpHeaderAuth, etc.). The genericCredentialType / proxy-auth
		// paths run alongside that loop.
		const httpRequestDescription = makeDescription({
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			credentials: [
				{
					name: 'httpBasicAuth',
					displayOptions: { show: { authentication: ['basicAuth'] } },
				},
			],
		});

		it('flags an HTTP Request node with genericCredentialType but no credentials set', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(httpRequestDescription);
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBasicAuth',
				},
			});

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(false);
			expect(result.issues[node.name!].credentials?.httpBasicAuth?.[0]).toContain(
				'Credentials for HTTP Request are not set.',
			);
		});

		it('flags an HTTP Request node with predefinedCredentialType missing credentials', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(httpRequestDescription);
			const node = makeNode({
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4,
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'githubApi',
				},
			});

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.issues[node.name!].credentials?.githubApi?.[0]).toContain(
				'Credentials for HTTP Request are not set.',
			);
		});
	});

	describe('parameter issues', () => {
		it('surfaces parameter validation errors from the node service', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			(context.nodeService.getParameterIssues as jest.Mock).mockResolvedValue({
				chatId: ['Parameter "chatId" is required'],
			});
			const node = makeNode({ parameters: { chatId: '' } });

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.issues[node.name!].parameters).toEqual({
				chatId: ['Parameter "chatId" is required'],
			});
			expect(result.summary).toContain(
				'Send Telegram message: parameters.chatId: Parameter "chatId" is required',
			);
		});

		it('honors ignoreIssues to suppress whole categories', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'telegramApi', required: true }],
				}),
			);
			(context.nodeService.getParameterIssues as jest.Mock).mockResolvedValue({
				chatId: ['Parameter "chatId" is required'],
			});
			const node = makeNode({ parameters: { chatId: '' } });

			const result = await validateWorkflowConfig(context, {
				workflow: makeWorkflow([node]),
				ignoreIssues: ['credentials'],
			});

			expect(result.issues[node.name!].parameters).toBeDefined();
			expect(result.issues[node.name!].credentials).toBeUndefined();
		});
	});

	describe('node-level skips', () => {
		it('skips disabled nodes', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'telegramApi', required: true }],
				}),
			);
			const node = makeNode({ disabled: true });

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(true);
			expect(result.issues).toEqual({});
		});

		it('emits typeUnknown when the node description cannot be resolved', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockRejectedValue(new Error('not found'));
			const node = makeNode({ type: 'n8n-nodes-base.madeUpType' });

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.issues[node.name!].typeUnknown).toBe(true);
			expect(result.summary).toContain('Send Telegram message: typeUnknown: Unknown node type');
		});
	});

	describe('workflowId mode', () => {
		it('resolves the workflow via workflowService.getAsWorkflowJSON', async () => {
			const context = createMockContext();
			const node = makeNode();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflow([node]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'telegramApi', required: true }],
				}),
			);

			const result = await validateWorkflowConfig(context, { workflowId: 'w1' });

			expect(context.workflowService.getAsWorkflowJSON).toHaveBeenCalledWith('w1');
			expect(result.workflowId).toBe('w1');
			expect(result.valid).toBe(false);
		});
	});
});
