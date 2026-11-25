import type { AgentJsonConfig } from '@n8n/api-types';
import type { PolicyViolation } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import type { PolicyEnforcementBackend } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';

import { AgentPolicyService } from '../agent-policy.service';

vi.mock('@/node-execution/resolve-tool-node-type', () => ({
	resolveToolNodeType: (nodeType: string) => nodeType,
}));

const dateTimeTool = {
	type: 'node',
	name: 'Current date',
	node: { nodeType: 'n8n-nodes-base.dateTime', nodeTypeVersion: 2, nodeParameters: {} },
} as const;

const agent = (tools: AgentJsonConfig['tools'], mcpServers?: AgentJsonConfig['mcpServers']) => ({
	name: 'Support agent',
	tools,
	mcpServers,
});

const mcpServer = {
	name: 'Docs',
	url: 'https://mcp.example.com',
	transport: 'streamableHttp',
	authentication: 'none',
} as const;

const actor = { kind: 'user', user: { id: 'user-1' } } as const;

const violation: PolicyViolation = {
	kind: 'node-type-unavailable',
	checkId: 'node-type-availability',
	message: 'Node type "n8n-nodes-base.dateTime" is blocked by an instance policy',
	subject: 'n8n-nodes-base.dateTime',
	subjectType: 'nodeType',
};

function setUp() {
	const backend = mock<PolicyEnforcementBackend>();
	backend.enforce.mockResolvedValue({ violations: [] });
	backend.evaluate.mockResolvedValue({ violations: [] });
	const enforcement = new PolicyEnforcementService();
	enforcement.setImplementation(backend);
	return { backend, service: new AgentPolicyService(enforcement) };
}

describe('AgentPolicyService', () => {
	it('saves through workflowSave, as an agent whose nodes are its node tools', async () => {
		const { backend, service } = setUp();

		await service.enforceSave('proj-1', 'agent-1', agent([dateTimeTool]), agent([]), actor);

		expect(backend.enforce).toHaveBeenCalledWith(
			'workflowSave',
			{
				workflow: {
					id: 'agent-1',
					name: 'Support agent',
					artifactKind: 'agent',
					nodes: [expect.objectContaining({ type: 'n8n-nodes-base.dateTime', typeVersion: 2 })],
				},
				storedWorkflow: { id: 'agent-1', name: 'Support agent', artifactKind: 'agent', nodes: [] },
				projectId: 'proj-1',
			},
			actor,
		);
	});

	it('passes no stored workflow for a create', async () => {
		const { backend, service } = setUp();

		await service.enforceSave('proj-1', null, agent([dateTimeTool]), null, actor);

		expect(backend.enforce).toHaveBeenCalledWith(
			'workflowSave',
			expect.objectContaining({ storedWorkflow: null }),
			actor,
		);
	});

	it('throws the violations when a policy refuses a save', async () => {
		const { backend, service } = setUp();
		backend.enforce.mockResolvedValue({ violations: [violation] });

		const error = await service
			.enforceSave('proj-1', 'agent-1', agent([dateTimeTool]), agent([]), actor)
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(PolicyViolationError);
		expect((error as PolicyViolationError).violations).toEqual([violation]);
	});

	it('throws the violations when a policy refuses a publish', async () => {
		const { backend, service } = setUp();
		backend.enforce.mockResolvedValue({ violations: [violation] });

		const error = await service
			.enforcePublish('proj-1', 'agent-1', agent([dateTimeTool]), actor)
			.catch((e: unknown) => e);

		expect(backend.enforce).toHaveBeenCalledWith('workflowPublish', expect.anything(), actor);
		expect(error).toBeInstanceOf(PolicyViolationError);
		expect((error as PolicyViolationError).violations).toEqual([violation]);
	});

	it('polices an MCP server as the node type it runs as', async () => {
		const { backend, service } = setUp();

		await service.enforcePublish('proj-1', 'agent-1', agent([], [mcpServer]), actor);

		expect(backend.enforce).toHaveBeenCalledWith(
			'workflowPublish',
			expect.objectContaining({
				workflow: expect.objectContaining({
					nodes: [
						expect.objectContaining({
							name: 'Docs',
							type: '@n8n/n8n-nodes-langchain.mcpClientTool',
						}),
					],
				}),
			}),
			actor,
		);
	});

	describe('evaluatePublish', () => {
		it('reports the violations of a publish without throwing', async () => {
			const { backend, service } = setUp();
			backend.evaluate.mockResolvedValue({ violations: [violation] });

			const decision = await service.evaluatePublish('proj-1', 'agent-1', agent([dateTimeTool]));

			expect(backend.evaluate).toHaveBeenCalledWith(
				'workflowPublish',
				expect.objectContaining({ projectId: 'proj-1' }),
			);
			expect(decision.violations).toEqual([violation]);
		});

		it('reads the same nodes the publish gate polices', async () => {
			const { backend, service } = setUp();

			await service.evaluatePublish('proj-1', null, agent([dateTimeTool], [mcpServer]));

			const [, context] = backend.evaluate.mock.calls[0];
			const { workflow } = context as unknown as { workflow: { nodes: Array<{ type: string }> } };
			expect(workflow.nodes).toEqual([
				expect.objectContaining({ type: 'n8n-nodes-base.dateTime' }),
				expect.objectContaining({ type: '@n8n/n8n-nodes-langchain.mcpClientTool' }),
			]);
		});
	});
});
