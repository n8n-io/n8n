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

function makeWorkflow(nodes: NodeJSON[], connections: Record<string, unknown> = {}): WorkflowJSON {
	return { nodes, connections } as unknown as WorkflowJSON;
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

	describe('input issues', () => {
		// Mock helper that stages the resolved-inputs result. Real adapter constructs
		// a Workflow instance and calls NodeHelpers.getNodeInputs; here we mock at
		// the service-interface boundary so we control the shape directly.
		function stubResolvedInputs(
			context: InstanceAiContext,
			perNodeInputs: Record<string, unknown[]>,
		): void {
			(context.nodeService as unknown as Record<string, unknown>).getResolvedNodeInputs = jest
				.fn()
				.mockImplementation(async (_workflow: WorkflowJSON, nodeName: string) => {
					return await Promise.resolve(perNodeInputs[nodeName] ?? []);
				});
		}

		it('flags an AI Agent node missing its required ai_languageModel attachment', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					credentials: [],
				}),
			);
			stubResolvedInputs(context, {
				Agent: [
					'main',
					{
						type: 'ai_languageModel',
						displayName: 'Chat Model',
						required: true,
						maxConnections: 1,
					},
				],
			});

			const node = makeNode({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
			});

			const result = await validateWorkflowConfig(context, {
				workflow: makeWorkflow([node]),
			});

			expect(result.valid).toBe(false);
			expect(result.issues.Agent.input).toEqual({
				ai_languageModel: ['No node connected to required input "Chat Model"'],
			});
			expect(result.summary).toContain(
				'Agent: input.ai_languageModel: No node connected to required input "Chat Model"',
			);
		});

		it('does not flag an AI Agent when the language model is attached', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					credentials: [],
				}),
			);
			stubResolvedInputs(context, {
				Agent: [
					'main',
					{
						type: 'ai_languageModel',
						displayName: 'Chat Model',
						required: true,
						maxConnections: 1,
					},
				],
			});

			const node = makeNode({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
			});
			const model = makeNode({
				name: 'OpenAI Chat Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				typeVersion: 1,
			});

			// `connections` keyed by SOURCE node — `OpenAI Chat Model` feeds Agent's
			// `ai_languageModel` input.
			const connections = {
				'OpenAI Chat Model': {
					ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]],
				},
			};

			const result = await validateWorkflowConfig(context, {
				workflow: makeWorkflow([node, model], connections),
			});

			expect(result.valid).toBe(true);
			expect(result.issues).toEqual({});
		});

		it('does not flag optional inputs (required !== true)', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					credentials: [],
				}),
			);
			stubResolvedInputs(context, {
				Agent: [
					'main',
					{ type: 'ai_memory', displayName: 'Memory' }, // no `required` flag
				],
			});

			const node = makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });
			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(true);
		});

		it('does not flag plain-string inputs (no required field)', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			// Standard nodes have plain `'main'` string inputs — never carry a required flag.
			stubResolvedInputs(context, {
				'Send Telegram message': ['main'],
			});

			const node = makeNode();
			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(true);
		});

		it('honors ignoreIssues: ["input"] to suppress input issues', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					credentials: [],
				}),
			);
			stubResolvedInputs(context, {
				Agent: [{ type: 'ai_languageModel', displayName: 'Chat Model', required: true }],
			});

			const node = makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });
			const result = await validateWorkflowConfig(context, {
				workflow: makeWorkflow([node]),
				ignoreIssues: ['input'],
			});

			expect(result.valid).toBe(true);
			expect(result.issues).toEqual({});
		});

		it('skips input checks entirely when getResolvedNodeInputs is not implemented', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			// Adapter optionality: no getResolvedNodeInputs method on the service.
			// Validation should still succeed without crashing.
			const node = makeNode();

			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(true);
		});

		it('uses the input.type as fallback message label when displayName is missing', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					credentials: [],
				}),
			);
			stubResolvedInputs(context, {
				Agent: [{ type: 'ai_tool', required: true }], // no displayName
			});

			const node = makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' });
			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.issues.Agent.input).toEqual({
				ai_tool: ['No node connected to required input "ai_tool"'],
			});
		});
	});

	describe('execution issues', () => {
		function stubLatestRunData(
			context: InstanceAiContext,
			runData: Record<string, unknown[]> | null,
		): void {
			(context.workflowService as unknown as Record<string, unknown>).getLatestRunData = jest
				.fn()
				.mockImplementation(async (_workflowId: string) => {
					return await Promise.resolve(runData);
				});
		}

		it('flags a node whose most recent execution had an error', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflow([makeNode({ name: 'HTTP Request' })]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			stubLatestRunData(context, {
				'HTTP Request': [{ error: { message: 'connect ECONNREFUSED' } }],
			});

			const result = await validateWorkflowConfig(context, { workflowId: 'w1' });

			expect(result.valid).toBe(false);
			expect(result.issues['HTTP Request'].execution).toBe(true);
			expect(result.summary).toContain(
				'HTTP Request: execution: A previous execution of this node failed: connect ECONNREFUSED',
			);
		});

		it('does not flag a node whose most recent execution completed without error', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflow([makeNode({ name: 'HTTP Request' })]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			stubLatestRunData(context, {
				'HTTP Request': [{ data: {} }], // task with no `error`
			});

			const result = await validateWorkflowConfig(context, { workflowId: 'w1' });

			expect(result.valid).toBe(true);
			expect(result.issues).toEqual({});
		});

		it('does not flag any execution issues when the workflow has no execution history', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflow([makeNode({ name: 'HTTP Request' })]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			stubLatestRunData(context, null);

			const result = await validateWorkflowConfig(context, { workflowId: 'w1' });

			expect(result.valid).toBe(true);
		});

		it('skips execution checks silently in inline-workflow mode', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			// Even though getLatestRunData would return errors, inline mode has no
			// workflowId so the fetch never happens.
			stubLatestRunData(context, {
				'HTTP Request': [{ error: { message: 'should not surface' } }],
			});

			const node = makeNode({ name: 'HTTP Request' });
			const result = await validateWorkflowConfig(context, { workflow: makeWorkflow([node]) });

			expect(result.valid).toBe(true);
			expect(context.workflowService.getLatestRunData).not.toHaveBeenCalled();
		});

		it('honors ignoreIssues: ["execution"] to suppress execution flags', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflow([makeNode({ name: 'HTTP Request' })]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			stubLatestRunData(context, {
				'HTTP Request': [{ error: { message: 'connect ECONNREFUSED' } }],
			});

			const result = await validateWorkflowConfig(context, {
				workflowId: 'w1',
				ignoreIssues: ['execution'],
			});

			expect(result.valid).toBe(true);
			expect(context.workflowService.getLatestRunData).not.toHaveBeenCalled();
		});

		it('skips execution checks when the adapter does not implement getLatestRunData', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflow([makeNode({ name: 'HTTP Request' })]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			// No stubLatestRunData — the optional method is absent on this adapter.

			const result = await validateWorkflowConfig(context, { workflowId: 'w1' });

			expect(result.valid).toBe(true);
		});

		it('reports execution alongside parameter/credential issues on the same node', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflow([makeNode()]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({
					credentials: [{ name: 'telegramApi', required: true }],
				}),
			);
			stubLatestRunData(context, {
				'Send Telegram message': [{ error: { message: 'unauthorized' } }],
			});

			const result = await validateWorkflowConfig(context, { workflowId: 'w1' });

			const nodeIssues = result.issues['Send Telegram message'];
			expect(nodeIssues.credentials?.telegramApi).toBeDefined();
			expect(nodeIssues.execution).toBe(true);
			expect(result.summary).toEqual(
				expect.arrayContaining([
					'Send Telegram message: credentials.telegramApi: Credentials for Telegram are not set.',
					'Send Telegram message: execution: A previous execution of this node failed: unauthorized',
				]),
			);
		});

		it('handles task errors without a message field gracefully', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflow([makeNode({ name: 'HTTP Request' })]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue(
				makeDescription({ credentials: [] }),
			);
			stubLatestRunData(context, {
				'HTTP Request': [{ error: {} }], // error object with no message
			});

			const result = await validateWorkflowConfig(context, { workflowId: 'w1' });

			expect(result.valid).toBe(false);
			expect(result.issues['HTTP Request'].execution).toBe(true);
			// Summary should fall back to a generic line since no error message exists
			expect(
				result.summary.some((line) =>
					line.startsWith('HTTP Request: execution: A previous execution of this node failed'),
				),
			).toBe(true);
		});
	});
});
