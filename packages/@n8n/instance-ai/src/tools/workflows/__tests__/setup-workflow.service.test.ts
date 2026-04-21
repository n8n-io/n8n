import type { WorkflowJSON, NodeJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import {
	buildSetupRequests,
	analyzeWorkflow,
	applyNodeChanges,
	buildCompletedReport,
	createCredentialCache,
	stripStaleCredentialsFromWorkflow,
} from '../setup-workflow.service';

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
			delete: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
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
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
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
	};
}

function makeNode(overrides: Partial<NodeJSON> = {}): NodeJSON {
	return {
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2,
		parameters: {},
		position: [250, 300] as [number, number],
		id: 'node-1',
		...overrides,
	} as NodeJSON;
}

function makeWorkflowJSON(
	nodes: NodeJSON[] = [],
	connections: Record<string, unknown> = {},
): WorkflowJSON {
	return { nodes, connections } as unknown as WorkflowJSON;
}

// ---------------------------------------------------------------------------
// buildSetupRequests
// ---------------------------------------------------------------------------

describe('buildSetupRequests', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [{ name: 'slackApi' }],
		});
		// Default: credential test passes (override in specific tests for failure cases)
		(context.credentialService.test as jest.Mock).mockResolvedValue({ success: true });
	});

	it('skips disabled nodes', async () => {
		const node = makeNode({ disabled: true });
		const result = await buildSetupRequests(context, node);
		expect(result).toHaveLength(0);
	});

	it('skips nodes without a name', async () => {
		const node = makeNode({ name: '' });
		const result = await buildSetupRequests(context, node);
		expect(result).toHaveLength(0);
	});

	it('detects credential types from node description', async () => {
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);

		const node = makeNode();
		const result = await buildSetupRequests(context, node);

		expect(result).toHaveLength(1);
		expect(result[0].credentialType).toBe('slackApi');
		expect(result[0].existingCredentials).toEqual([{ id: 'cred-1', name: 'My Slack' }]);
	});

	it('falls back to node description credentials when getNodeCredentialTypes returns empty', async () => {
		// Simulate production: getNodeCredentialTypes is available but returns []
		// (e.g. node lookup miss in the adapter). The fallback should still detect
		// credentials from the node description.
		(context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes = jest
			.fn()
			.mockResolvedValue([]);
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const node = makeNode();
		const result = await buildSetupRequests(context, node);

		expect(result).toHaveLength(1);
		expect(result[0].credentialType).toBe('slackApi');
		expect(result[0].needsAction).toBe(true);
	});

	it('falls back to node description credentials when getNodeCredentialTypes throws', async () => {
		(context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes = jest
			.fn()
			.mockRejectedValue(new Error('Node lookup failed'));
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const node = makeNode();
		const result = await buildSetupRequests(context, node);

		expect(result).toHaveLength(1);
		expect(result[0].credentialType).toBe('slackApi');
		expect(result[0].needsAction).toBe(true);
	});

	it('excludes credentials whose displayOptions do not match current parameters', async () => {
		(context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes = jest
			.fn()
			.mockResolvedValue([]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [
				{ name: 'httpSslAuth', displayOptions: { show: { provideSslCertificates: [true] } } },
			],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const node = makeNode({ type: 'n8n-nodes-base.httpRequest', typeVersion: 4.4 });
		const result = await buildSetupRequests(context, node);

		// displayOptions require provideSslCertificates=true, but it's not set
		expect(result.find((r) => r.credentialType === 'httpSslAuth')).toBeUndefined();
	});

	it('includes credentials whose displayOptions match current parameters', async () => {
		(context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes = jest
			.fn()
			.mockResolvedValue([]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [
				{ name: 'httpSslAuth', displayOptions: { show: { provideSslCertificates: [true] } } },
			],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const node = makeNode({
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: { provideSslCertificates: true },
		});
		const result = await buildSetupRequests(context, node);

		expect(result.find((r) => r.credentialType === 'httpSslAuth')).toBeDefined();
	});

	it('resolves dynamic credential from genericAuthType parameter', async () => {
		(context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes = jest
			.fn()
			.mockResolvedValue([]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [
				{ name: 'httpSslAuth', displayOptions: { show: { provideSslCertificates: [true] } } },
			],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const node = makeNode({
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: {
				authentication: 'genericCredentialType',
				genericAuthType: 'httpQueryAuth',
				url: 'https://api.example.com',
			},
		});
		const result = await buildSetupRequests(context, node);

		expect(result).toHaveLength(1);
		expect(result[0].credentialType).toBe('httpQueryAuth');
		expect(result[0].needsAction).toBe(true);
	});

	it('resolves dynamic credential from predefinedCredentialType parameter', async () => {
		(context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes = jest
			.fn()
			.mockResolvedValue([]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const node = makeNode({
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: {
				authentication: 'predefinedCredentialType',
				nodeCredentialType: 'openWeatherMapApi',
				url: 'https://api.openweathermap.org',
			},
		});
		const result = await buildSetupRequests(context, node);

		expect(result).toHaveLength(1);
		expect(result[0].credentialType).toBe('openWeatherMapApi');
		expect(result[0].needsAction).toBe(true);
	});

	it('sets needsAction=true when no credential is set', async () => {
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);

		const node = makeNode();
		const result = await buildSetupRequests(context, node);

		expect(result[0].needsAction).toBe(true);
	});

	it('sets needsAction=false when credential is set and test passes', async () => {
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);
		(context.credentialService.test as jest.Mock).mockResolvedValue({
			success: true,
		});

		const node = makeNode({
			credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
		});
		const result = await buildSetupRequests(context, node);

		expect(result[0].needsAction).toBe(false);
	});

	it('sets needsAction=true when credential test fails', async () => {
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);
		(context.credentialService.test as jest.Mock).mockResolvedValue({
			success: false,
			message: 'Invalid token',
		});

		const node = makeNode({
			credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
		});
		const result = await buildSetupRequests(context, node);

		expect(result[0].needsAction).toBe(true);
	});

	it('sets needsAction=true when parameter issues exist', async () => {
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
			properties: [{ name: 'resource', displayName: 'Resource', type: 'string' }],
		});
		(context.nodeService as unknown as Record<string, unknown>).getParameterIssues = jest
			.fn()
			.mockResolvedValue({
				resource: ['Parameter "resource" is required'],
			});

		const node = makeNode();
		const result = await buildSetupRequests(context, node);

		expect(result).toHaveLength(1);
		expect(result[0].needsAction).toBe(true);
		expect(result[0].parameterIssues).toBeDefined();
	});

	it('auto-applies most recent credential when node has none', async () => {
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-2', name: 'Newer Slack', updatedAt: '2025-06-01T00:00:00.000Z' },
			{ id: 'cred-1', name: 'Older Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);

		const node = makeNode();
		const result = await buildSetupRequests(context, node);

		expect(result[0].isAutoApplied).toBe(true);
		expect(result[0].existingCredentials?.[0].id).toBe('cred-2');
	});

	it('sets isAutoApplied=false when node already has credential', async () => {
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);

		const node = makeNode({
			credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
		});
		const result = await buildSetupRequests(context, node);

		expect(result[0].isAutoApplied).toBeFalsy();
	});

	it('uses credential cache to avoid duplicate fetches', async () => {
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);

		const cache = createCredentialCache();
		const node1 = makeNode({ name: 'Slack 1', id: 'n1' });
		const node2 = makeNode({ name: 'Slack 2', id: 'n2' });

		await buildSetupRequests(context, node1, undefined, cache);
		await buildSetupRequests(context, node2, undefined, cache);

		// list should only be called once due to caching
		expect(context.credentialService.list).toHaveBeenCalledTimes(1);
	});

	it('does not generate credential request for HTTP Request with auth=none and stale node.credentials', async () => {
		(context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes = jest
			.fn()
			.mockResolvedValue([]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [
				{
					name: 'httpHeaderAuth',
					displayOptions: { show: { authentication: ['genericCredentialType'] } },
				},
			],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const node = makeNode({
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: { authentication: 'none', url: 'https://api.example.com' },
			credentials: { httpHeaderAuth: { id: 'old-cred', name: 'Stale Header Auth' } },
		});
		const result = await buildSetupRequests(context, node);

		expect(result.find((r) => r.credentialType === 'httpHeaderAuth')).toBeUndefined();
	});

	it('fallback: displayOptions filtering takes priority over stale node.credentials', async () => {
		// Remove getNodeCredentialTypes to force fallback path
		delete (context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes;
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [
				{
					name: 'httpHeaderAuth',
					displayOptions: { show: { authentication: ['genericCredentialType'] } },
				},
			],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const node = makeNode({
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: { authentication: 'none', url: 'https://api.example.com' },
			credentials: { httpHeaderAuth: { id: 'old-cred', name: 'Stale Header Auth' } },
		});
		const result = await buildSetupRequests(context, node);

		expect(result.find((r) => r.credentialType === 'httpHeaderAuth')).toBeUndefined();
	});

	it('fallback: node with assigned credentials matching description is still detected', async () => {
		(context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes = jest
			.fn()
			.mockResolvedValue([]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [{ name: 'slackApi' }],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);

		const node = makeNode({
			credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
		});
		const result = await buildSetupRequests(context, node);

		expect(result.find((r) => r.credentialType === 'slackApi')).toBeDefined();
	});

	it('fallback: node.credentials with types not in description are excluded', async () => {
		// Remove getNodeCredentialTypes to force fallback path
		delete (context.nodeService as unknown as Record<string, unknown>).getNodeCredentialTypes;
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [{ name: 'slackApi' }],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);

		const node = makeNode({
			credentials: {
				slackApi: { id: 'cred-1', name: 'My Slack' },
				httpHeaderAuth: { id: 'stale', name: 'Stale Auth' },
			},
		});
		const result = await buildSetupRequests(context, node);

		expect(result.find((r) => r.credentialType === 'slackApi')).toBeDefined();
		expect(result.find((r) => r.credentialType === 'httpHeaderAuth')).toBeUndefined();
	});

	it('treats placeholder values as parameter issues', async () => {
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
			properties: [{ name: 'email', displayName: 'Email', type: 'string' }],
		});

		const node = makeNode({
			parameters: { email: '<__PLACEHOLDER_VALUE__your_email__>' },
		});
		const result = await buildSetupRequests(context, node);

		expect(result).toHaveLength(1);
		expect(result[0].parameterIssues).toBeDefined();
		expect(result[0].parameterIssues!.email).toEqual(
			expect.arrayContaining([expect.stringContaining('your_email')]),
		);
	});

	it('adds placeholder issue even when param already has validation issues', async () => {
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
			properties: [{ name: 'email', displayName: 'Email', type: 'string', required: true }],
		});
		(context.nodeService as unknown as Record<string, unknown>).getParameterIssues = jest
			.fn()
			.mockResolvedValue({ email: ['Parameter "Email" is required'] });

		const node = makeNode({
			parameters: { email: '<__PLACEHOLDER_VALUE__your_email__>' },
		});
		const result = await buildSetupRequests(context, node);

		expect(result).toHaveLength(1);
		const issues = result[0].parameterIssues!.email;
		expect(issues).toHaveLength(2);
		expect(issues).toEqual(
			expect.arrayContaining([
				'Parameter "Email" is required',
				expect.stringContaining('your_email'),
			]),
		);
	});
});

// ---------------------------------------------------------------------------
// analyzeWorkflow
// ---------------------------------------------------------------------------

describe('analyzeWorkflow', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('returns empty array for workflow with no actionable nodes', async () => {
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
			makeWorkflowJSON([makeNode({ name: 'NoOp', type: 'n8n-nodes-base.noOp' })]),
		);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
		});

		const result = await analyzeWorkflow(context, 'wf-1');
		expect(result).toHaveLength(0);
	});

	it('includes nodes with credential types', async () => {
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
			makeWorkflowJSON([makeNode()]),
		);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [{ name: 'slackApi' }],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const result = await analyzeWorkflow(context, 'wf-1');
		expect(result).toHaveLength(1);
		expect(result[0].credentialType).toBe('slackApi');
	});

	it('marks needsAction correctly after credentials are applied', async () => {
		const node = makeNode({
			credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
		});
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
			makeWorkflowJSON([node]),
		);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [{ name: 'slackApi' }],
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([
			{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01T00:00:00.000Z' },
		]);
		(context.credentialService.test as jest.Mock).mockResolvedValue({ success: true });

		const result = await analyzeWorkflow(context, 'wf-1');

		expect(result).toHaveLength(1);
		expect(result[0].needsAction).toBe(false);
	});

	it('sorts by execution order with triggers first', async () => {
		const trigger = makeNode({
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			id: 'n-trigger',
			position: [100, 100] as [number, number],
		});
		const action = makeNode({
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
			id: 'n-action',
			position: [400, 100] as [number, number],
		});
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
			makeWorkflowJSON([action, trigger], {
				Webhook: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] },
			}),
		);
		(context.nodeService.getDescription as jest.Mock).mockImplementation(async (type: string) => {
			if (type === 'n8n-nodes-base.webhook') {
				return await Promise.resolve({
					group: ['trigger'],
					credentials: [],
					webhooks: [{}],
				});
			}
			return await Promise.resolve({ group: [], credentials: [{ name: 'slackApi' }] });
		});
		(context.credentialService.list as jest.Mock).mockResolvedValue([]);

		const result = await analyzeWorkflow(context, 'wf-1');

		// Trigger should come first (execution order)
		const names = result.map((r) => r.node.name);
		expect(names.indexOf('Webhook')).toBeLessThan(names.indexOf('Slack'));
	});
});

// ---------------------------------------------------------------------------
// applyNodeChanges
// ---------------------------------------------------------------------------

describe('applyNodeChanges', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('applies credentials and parameters atomically', async () => {
		const wfJson = makeWorkflowJSON([
			makeNode({ name: 'Slack', id: 'n1' }),
			makeNode({ name: 'Gmail', id: 'n2', type: 'n8n-nodes-base.gmail' }),
		]);
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(wfJson);
		(context.credentialService.get as jest.Mock).mockImplementation(
			async (id: string) => await Promise.resolve({ id, name: `Cred ${id}` }),
		);
		(context.workflowService.updateFromWorkflowJSON as jest.Mock).mockResolvedValue(undefined);

		const result = await applyNodeChanges(
			context,
			'wf-1',
			{ Slack: { slackApi: 'cred-1' } },
			{ Gmail: { resource: 'message' } },
		);

		expect(result.applied).toContain('Slack');
		expect(result.applied).toContain('Gmail');
		expect(result.failed).toHaveLength(0);
		// Single save for both changes
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('reports failures when credential is not found', async () => {
		const wfJson = makeWorkflowJSON([makeNode({ name: 'Slack', id: 'n1' })]);
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(wfJson);
		(context.credentialService.get as jest.Mock).mockResolvedValue(undefined);
		(context.workflowService.updateFromWorkflowJSON as jest.Mock).mockResolvedValue(undefined);

		const result = await applyNodeChanges(context, 'wf-1', {
			Slack: { slackApi: 'nonexistent' },
		});

		expect(result.failed).toHaveLength(1);
		expect(result.failed[0].nodeName).toBe('Slack');
	});

	it('rolls back applied nodes on save failure', async () => {
		const wfJson = makeWorkflowJSON([makeNode({ name: 'Slack', id: 'n1' })]);
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(wfJson);
		(context.credentialService.get as jest.Mock).mockResolvedValue({
			id: 'cred-1',
			name: 'My Slack',
		});
		(context.workflowService.updateFromWorkflowJSON as jest.Mock).mockRejectedValue(
			new Error('DB error'),
		);

		const result = await applyNodeChanges(context, 'wf-1', {
			Slack: { slackApi: 'cred-1' },
		});

		expect(result.applied).toHaveLength(0);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0].error).toContain('Failed to save workflow');
	});

	it('strips credentials not valid for the current parameters', async () => {
		const node = makeNode({
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: { authentication: 'none', url: 'https://api.example.com' },
			credentials: { httpHeaderAuth: { id: 'stale', name: 'Stale Header Auth' } },
		});
		const wfJson = makeWorkflowJSON([node]);
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(wfJson);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [
				{
					name: 'httpHeaderAuth',
					displayOptions: { show: { authentication: ['genericCredentialType'] } },
				},
			],
		});
		(context.workflowService.updateFromWorkflowJSON as jest.Mock).mockResolvedValue(undefined);

		await applyNodeChanges(context, 'wf-1');

		const calls = (context.workflowService.updateFromWorkflowJSON as jest.Mock).mock.calls as Array<
			[string, WorkflowJSON]
		>;
		const savedJson = calls[0][1];
		const savedNode = savedJson.nodes.find((n) => n.name === 'HTTP Request');
		expect(savedNode?.credentials).toBeUndefined();
	});

	it('preserves just-applied credentials even if description would exclude them', async () => {
		const node = makeNode({
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: { authentication: 'none' },
		});
		const wfJson = makeWorkflowJSON([node]);
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(wfJson);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
		});
		(context.credentialService.get as jest.Mock).mockResolvedValue({
			id: 'cred-1',
			name: 'My Header Auth',
		});
		(context.workflowService.updateFromWorkflowJSON as jest.Mock).mockResolvedValue(undefined);

		await applyNodeChanges(context, 'wf-1', {
			'HTTP Request': { httpHeaderAuth: 'cred-1' },
		});

		const calls = (context.workflowService.updateFromWorkflowJSON as jest.Mock).mock.calls as Array<
			[string, WorkflowJSON]
		>;
		const savedJson = calls[0][1];
		const savedNode = savedJson.nodes.find((n) => n.name === 'HTTP Request');
		expect(savedNode?.credentials).toEqual({
			httpHeaderAuth: { id: 'cred-1', name: 'My Header Auth' },
		});
	});

	it('keeps credentials matching description displayOptions', async () => {
		const node = makeNode({
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: {
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
			},
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Header Auth' } },
		});
		const wfJson = makeWorkflowJSON([node]);
		(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(wfJson);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
		});
		(context.workflowService.updateFromWorkflowJSON as jest.Mock).mockResolvedValue(undefined);

		await applyNodeChanges(context, 'wf-1');

		const calls = (context.workflowService.updateFromWorkflowJSON as jest.Mock).mock.calls as Array<
			[string, WorkflowJSON]
		>;
		const savedJson = calls[0][1];
		const savedNode = savedJson.nodes.find((n) => n.name === 'HTTP Request');
		expect(savedNode?.credentials).toEqual({
			httpHeaderAuth: { id: 'cred-1', name: 'Header Auth' },
		});
	});
});

// ---------------------------------------------------------------------------
// buildCompletedReport
// ---------------------------------------------------------------------------

describe('buildCompletedReport', () => {
	it('builds report from credentials and parameters', () => {
		const report = buildCompletedReport(
			{ Slack: { slackApi: 'cred-1' } },
			{ Slack: { channel: '#general' } },
		);

		expect(report).toHaveLength(1);
		expect(report[0]).toEqual({
			nodeName: 'Slack',
			credentialType: 'slackApi',
			parametersSet: ['channel'],
		});
	});

	it('reports parameter-only nodes', () => {
		const report = buildCompletedReport(undefined, { Gmail: { resource: 'message' } });

		expect(report).toHaveLength(1);
		expect(report[0]).toEqual({
			nodeName: 'Gmail',
			parametersSet: ['resource'],
		});
	});

	it('returns empty array when nothing was applied', () => {
		const report = buildCompletedReport(undefined, undefined);
		expect(report).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// stripStaleCredentialsFromWorkflow
// ---------------------------------------------------------------------------

describe('stripStaleCredentialsFromWorkflow', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('removes credential entries that no longer match the node parameters', async () => {
		const node = makeNode({
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: { authentication: 'none', url: 'https://api.example.com' },
			credentials: { httpHeaderAuth: { id: 'stale', name: 'Stale Header Auth' } },
		});
		const wfJson = makeWorkflowJSON([node]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [
				{
					name: 'httpHeaderAuth',
					displayOptions: { show: { authentication: ['genericCredentialType'] } },
				},
			],
		});

		await stripStaleCredentialsFromWorkflow(context, wfJson);

		expect(wfJson.nodes[0].credentials).toBeUndefined();
	});

	it('keeps credential entries that match the current parameters', async () => {
		const node = makeNode({
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: {
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
			},
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Header Auth' } },
		});
		const wfJson = makeWorkflowJSON([node]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
		});

		await stripStaleCredentialsFromWorkflow(context, wfJson);

		expect(wfJson.nodes[0].credentials).toEqual({
			httpHeaderAuth: { id: 'cred-1', name: 'Header Auth' },
		});
	});

	it('strips per-node — clean nodes are unaffected, stale nodes are scrubbed', async () => {
		const cleanNode = makeNode({
			name: 'OpenRouter',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: {
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
			},
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'OpenRouter Auth' } },
		});
		const staleNode = makeNode({
			name: 'Joke API',
			id: 'node-2',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.4,
			parameters: { authentication: 'none', url: 'https://icanhazdadjoke.com/' },
			credentials: { httpHeaderAuth: { id: 'cred-1', name: 'OpenRouter Auth' } },
		});
		const wfJson = makeWorkflowJSON([cleanNode, staleNode]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [
				{
					name: 'httpHeaderAuth',
					displayOptions: { show: { authentication: ['genericCredentialType'] } },
				},
			],
		});

		await stripStaleCredentialsFromWorkflow(context, wfJson);

		expect(wfJson.nodes[0].credentials).toEqual({
			httpHeaderAuth: { id: 'cred-1', name: 'OpenRouter Auth' },
		});
		expect(wfJson.nodes[1].credentials).toBeUndefined();
	});

	it('is a no-op for nodes without credentials', async () => {
		const node = makeNode({
			parameters: { authentication: 'none' },
		});
		const wfJson = makeWorkflowJSON([node]);
		(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
			group: [],
			credentials: [],
		});

		await stripStaleCredentialsFromWorkflow(context, wfJson);

		expect(wfJson.nodes[0].credentials).toBeUndefined();
		expect(context.nodeService.getDescription).not.toHaveBeenCalled();
	});
});
