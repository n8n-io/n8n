import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { validateWorkflow } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { runInSandbox } from '../../../workspace/sandbox-fs';
import { compileWorkflowSource } from '../workflow-source-compiler';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/daytona/workspace')),
}));

vi.mock('@n8n/workflow-sdk', () => ({
	validateWorkflow: vi.fn(() => ({ errors: [], warnings: [] })),
}));

vi.mock('../../../workspace/sandbox-fs', () => ({
	escapeSingleQuotes: (value: string) => value.replace(/'/g, "'\\''"),
	runInSandbox: vi.fn(),
}));

function makeContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {},
		credentialService: {},
		nodeService: {},
		dataTableService: {},
		executionService: {},
		workspace: { sandbox: {} },
		logger: { warn: vi.fn(), debug: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('compileWorkflowSource', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(validateWorkflow).mockReturnValue({ valid: true, errors: [], warnings: [] });
	});

	it('parses WorkflowJSON sources in process without sandbox execution', async () => {
		const workflow = {
			name: 'JSON workflow',
			nodes: [
				{
					id: 'manual-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
			],
			connections: {},
		};
		const context = makeContext();

		const result = await compileWorkflowSource(
			context,
			'src/workflows/json.workflow.json',
			JSON.stringify(workflow),
		);

		expect(result).toMatchObject({
			success: true,
			compiler: 'workflow-json',
			workflow,
		});
		expect(runInSandbox).not.toHaveBeenCalled();
		expect(validateWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'JSON workflow' }),
			expect.objectContaining({ strictMode: true }),
		);
	});

	it('strips null top-level node keys and coerces parameters to an object', async () => {
		const workflow = {
			name: 'JSON workflow',
			nodes: [
				{
					id: 'http-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [0, 0] as [number, number],
					parameters: null,
					credentials: null,
					webhookId: null,
					notes: null,
				},
				{
					id: 'slack-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 2.2,
					position: [200, 0] as [number, number],
					parameters: {},
					credentials: {
						slackApi: { id: null, name: 'Slack account' },
					},
				},
			],
			connections: {},
		};
		const context = makeContext();

		const result = await compileWorkflowSource(
			context,
			'src/workflows/json.workflow.json',
			JSON.stringify(workflow),
		);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const httpNode = result.workflow.nodes[0];
		expect(httpNode).not.toHaveProperty('credentials');
		expect(httpNode).not.toHaveProperty('webhookId');
		expect(httpNode).not.toHaveProperty('notes');
		expect(httpNode?.parameters).toEqual({});

		const slackNode = result.workflow.nodes[1];
		expect(slackNode?.credentials).toEqual({
			slackApi: { id: null, name: 'Slack account' },
		});
	});

	it('strips null top-level node keys from sandbox build output', async () => {
		const workflow = {
			name: 'TS workflow',
			nodes: [
				{
					id: 'manual-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
					credentials: null,
					webhookId: null,
				},
			],
			connections: {},
		};
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: JSON.stringify({ success: true, workflow, warnings: [] }),
			stderr: '',
		});

		const result = await compileWorkflowSource(
			makeContext(),
			'src/workflows/main.workflow.ts',
			'workflow source',
		);

		expect(result.success).toBe(true);
		if (!result.success) return;

		const node = result.workflow.nodes[0];
		expect(node).not.toHaveProperty('credentials');
		expect(node).not.toHaveProperty('webhookId');
	});

	it('runs TypeScript workflow sources through the sandbox tsx build runner', async () => {
		const workflow = {
			name: 'TS workflow',
			nodes: [
				{
					id: 'manual-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			],
			connections: {},
		};
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: `tsx warning\n${JSON.stringify({
				success: true,
				workflow,
				warnings: [{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected' }],
			})}`,
			stderr: '',
		});
		vi.mocked(validateWorkflow).mockReturnValue({
			valid: false,
			errors: [{ code: 'INVALID_PARAMETER', message: 'Bad parameter', nodeName: 'Manual Trigger' }],
			warnings: [],
		});
		const context = makeContext();

		const result = await compileWorkflowSource(
			context,
			'src/workflows/main.workflow.ts',
			'workflow source',
		);

		expect(getWorkspaceRoot).toHaveBeenCalledWith(context.workspace);
		expect(runInSandbox).toHaveBeenCalledWith(
			context.workspace,
			"node --import tsx build.mjs '/home/daytona/workspace/src/workflows/main.workflow.ts'",
			{ cwd: '/home/daytona/workspace', abortSignal: undefined },
		);
		expect(result).toMatchObject({
			success: true,
			compiler: 'sandbox-tsx',
			workflow,
			warnings: [
				{ code: 'DISCONNECTED_NODE', message: 'Node is disconnected' },
				{
					code: 'INVALID_PARAMETER',
					message: 'Bad parameter',
					nodeName: 'Manual Trigger',
				},
			],
		});
	});

	it('returns a code-fixable failure when sandbox output cannot be parsed', async () => {
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 1,
			stdout: 'not json',
			stderr: 'compile failed',
		});

		const result = await compileWorkflowSource(
			makeContext(),
			'src/workflows/main.workflow.ts',
			'workflow source',
		);

		expect(result).toMatchObject({
			success: false,
			reason: 'workflow_source_sandbox_failed',
			editable: true,
			errors: ['Failed to execute workflow file in sandbox (exit code 1).', 'compile failed'],
		});
	});

	it('returns non-editable failure when no sandbox workspace is available', async () => {
		const result = await compileWorkflowSource(
			makeContext({ workspace: undefined }),
			'src/workflows/main.workflow.ts',
			'workflow source',
		);

		expect(result).toMatchObject({
			success: false,
			reason: 'workflow_source_sandbox_unavailable',
			editable: false,
		});
		expect(runInSandbox).not.toHaveBeenCalled();
	});

	it('rethrows AbortError from sandbox execution instead of converting to a build failure', async () => {
		const abortError = new Error('This operation was aborted');
		abortError.name = 'AbortError';
		vi.mocked(runInSandbox).mockRejectedValue(abortError);

		await expect(
			compileWorkflowSource(makeContext(), 'src/workflows/main.workflow.ts', 'workflow source'),
		).rejects.toMatchObject({ name: 'AbortError' });
	});

	it('forwards abortSignal into the sandbox runner', async () => {
		const controller = new AbortController();
		vi.mocked(runInSandbox).mockResolvedValue({
			exitCode: 0,
			stdout: JSON.stringify({
				success: true,
				workflow: { name: 'TS workflow', nodes: [], connections: {} },
				warnings: [],
			}),
			stderr: '',
		});

		await compileWorkflowSource(
			makeContext(),
			'src/workflows/main.workflow.ts',
			'workflow source',
			controller.signal,
		);

		expect(runInSandbox).toHaveBeenCalledWith(expect.anything(), expect.any(String), {
			cwd: '/home/daytona/workspace',
			abortSignal: controller.signal,
		});
	});
});

describe('compileWorkflowSource credential resolution', () => {
	const hosts = [
		{ type: 'stripeApi', hosts: ['api.stripe.com'] },
		{ type: 'facebookGraphApi', hosts: ['graph.facebook.com'] },
		{ type: 'whatsAppApi', hosts: ['graph.facebook.com'] },
	];

	function contextWithHosts(overrides = {}) {
		return makeContext({
			credentialService: { listHttpCredentialHosts: async () => await Promise.resolve(hosts) },
			...overrides,
		} as unknown as Partial<InstanceAiContext>);
	}

	function httpWorkflow(parameters: Record<string, unknown>) {
		return {
			name: 'HTTP workflow',
			nodes: [
				{
					id: 'http-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					position: [0, 0] as [number, number],
					parameters,
				},
			],
			connections: {},
		};
	}

	async function compileHttp(parameters: Record<string, unknown>, context = contextWithHosts()) {
		const result = await compileWorkflowSource(
			context,
			'src/workflows/http.workflow.json',
			JSON.stringify(httpWorkflow(parameters)),
		);
		if (!result.success) throw new Error('expected compile success');
		return result.warnings.filter((w) => w.code === 'PREFER_PREDEFINED_CREDENTIAL');
	}

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(validateWorkflow).mockReturnValue({ valid: true, errors: [], warnings: [] });
	});

	it('warns when generic auth targets a host with a single predefined credential', async () => {
		const warnings = await compileHttp({
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
			url: 'https://api.stripe.com/v1/charges',
		});

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatchObject({ nodeName: 'HTTP Request' });
		expect(warnings[0].message).toContain('stripeApi');
		expect(warnings[0].message).toContain('predefinedCredentialType');
	});

	it('lists candidates when the host maps to multiple predefined credentials', async () => {
		const warnings = await compileHttp({
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
			url: 'https://graph.facebook.com/v19.0/me',
		});

		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toContain('facebookGraphApi');
		expect(warnings[0].message).toContain('whatsAppApi');
	});

	it('does not warn for a host with no predefined credential', async () => {
		const warnings = await compileHttp({
			authentication: 'genericCredentialType',
			genericAuthType: 'httpHeaderAuth',
			url: 'https://queue.fal.run/fal-ai/flux',
		});

		expect(warnings).toHaveLength(0);
	});

	it('does not warn when the node already uses a predefined credential', async () => {
		const warnings = await compileHttp({
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'stripeApi',
			url: 'https://api.stripe.com/v1/charges',
		});

		expect(warnings).toHaveLength(0);
	});

	it('is a no-op when the credential service cannot list hosts', async () => {
		const warnings = await compileHttp(
			{
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
				url: 'https://api.stripe.com/v1/charges',
			},
			makeContext(),
		);

		expect(warnings).toHaveLength(0);
	});
});
