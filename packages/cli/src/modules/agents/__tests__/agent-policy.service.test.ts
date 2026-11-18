import type { ContentToolCall, PreToolExecutionContext } from '@n8n/agents';
import type { AgentJsonConfig, ToolPolicy } from '@n8n/api-types';
import type {
	PolicedSession,
	PolicyViolation,
	PreToolExecutionContext as PolicedToolCall,
} from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import type { PolicyEnforcementBackend } from '@/policy/policy-enforcement-backend';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { PolicyViolationError } from '@/policy/policy-violation.error';

import { AgentPolicyService } from '../agent-policy.service';
import type { AgentToolCallHistoryService } from '../agent-tool-call-history.service';
import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

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
	const toolCallHistory = mock<AgentToolCallHistoryService>();
	const agentRepository = mock<AgentRepository>();
	return {
		backend,
		toolCallHistory,
		agentRepository,
		service: new AgentPolicyService(enforcement, toolCallHistory, agentRepository),
	};
}

const hook = (
	service: AgentPolicyService,
	overrides: Partial<Parameters<AgentPolicyService['preToolExecutionHook']>[0]> = {},
) =>
	service.preToolExecutionHook({
		projectId: 'project-1',
		agentId: 'agent-1',
		toolPolicy: null,
		usePublishedVersion: false,
		...overrides,
	});

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

	describe('preToolExecutionHook', () => {
		const denied: PolicyViolation = {
			checkId: 'test-check',
			kind: 'tool-call-denied',
			message: 'This tool call is not allowed',
		};

		const call: PreToolExecutionContext = {
			toolCallId: 'call-1',
			runId: 'run-1',
			tool: { name: 'send_message', metadata: { kind: 'node', nodeType: 'n8n-nodes-base.slack' } },
			input: { text: 'hi' },
			resumed: false,
			persistence: {
				threadId: 'thread-1',
				resourceId: 'user-1',
				hostMetadata: { n8nExecutionId: 'agent-exec-1' },
			},
			runToolCalls: () => [],
		};

		it('asks the policy about the tool call and allows a cleared call', async () => {
			const { backend, service } = setUp();

			const decision = await hook(service)(call);

			expect(decision).toEqual({ allow: true });
			expect(backend.enforce).toHaveBeenCalledExactlyOnceWith(
				'preToolExecution',
				expect.objectContaining({
					agentId: 'agent-1',
					projectId: 'project-1',
					threadId: 'thread-1',
					agentExecutionId: 'agent-exec-1',
					runId: 'run-1',
					toolCallId: 'call-1',
					tool: call.tool,
					input: { text: 'hi' },
					resumed: false,
					toolPolicy: null,
				}),
				{ kind: 'system', reason: 'execution' },
			);
		});

		it('gives the policy the tool policy that the runtime was built with', async () => {
			const { backend, service } = setUp();
			const toolPolicy: ToolPolicy = {
				defaultAction: 'deny',
				rules: [
					{ id: 'allow-read', action: 'allow', tools: [{ kind: 'category', value: 'readsData' }] },
				],
			};

			await hook(service, { toolPolicy })(call);

			expect(backend.enforce).toHaveBeenCalledExactlyOnceWith(
				'preToolExecution',
				expect.objectContaining({ toolPolicy }),
				expect.anything(),
			);
		});

		describe('call history', () => {
			type Settled = Pick<ContentToolCall, 'state'> & Record<string, unknown>;
			const block = (toolCallId: string, state: Settled) =>
				({
					type: 'tool-call',
					toolCallId,
					toolName: 'lookup',
					input: { id: toolCallId },
					...state,
				}) as unknown as ContentToolCall;
			const runToolCalls = () => [
				block('call-a', { state: 'resolved', output: { found: true } }),
				block('call-b', { state: 'rejected', error: 'Not found' }),
				block('call-c', { state: 'resolved', output: 'Declined', canceled: true }),
				{ ...block('call-1', { state: 'pending' }), tool: call.tool },
			];
			const policedRunToolCalls = [
				{
					toolCallId: 'call-a',
					toolName: 'lookup',
					input: { id: 'call-a' },
					status: 'success',
					output: { found: true },
				},
				{
					toolCallId: 'call-b',
					toolName: 'lookup',
					input: { id: 'call-b' },
					status: 'error',
					output: 'Not found',
				},
				{
					toolCallId: 'call-c',
					toolName: 'lookup',
					input: { id: 'call-c' },
					status: 'canceled',
					output: 'Declined',
				},
				{
					toolCallId: 'call-1',
					toolName: 'lookup',
					input: { id: 'call-1' },
					tool: call.tool,
					status: 'pending',
				},
			];

			async function policedContext(setup: ReturnType<typeof setUp>) {
				await hook(setup.service)({ ...call, runToolCalls });
				return setup.backend.enforce.mock.calls[0][1] as PolicedToolCall;
			}

			it('gives the policy the tool calls of the run', async () => {
				const context = await policedContext(setUp());

				expect(context.runToolCalls()).toEqual(policedRunToolCalls);
			});

			it('reads the stored history only when a check asks for it', async () => {
				const setup = setUp();
				const history: PolicedSession[] = [
					{ threadId: 'thread-1', agentId: 'agent-1', toolCalls: [] },
				];
				setup.toolCallHistory.sessionHistory.mockResolvedValue(history);

				const context = await policedContext(setup);
				expect(setup.toolCallHistory.sessionHistory).not.toHaveBeenCalled();

				expect(await context.sessionHistory()).toBe(history);
				expect(setup.toolCallHistory.sessionHistory).toHaveBeenCalledExactlyOnceWith(
					'thread-1',
					'agent-1',
					policedRunToolCalls,
				);
			});

			it('reads the stored history one time for a tool call', async () => {
				const setup = setUp();
				setup.toolCallHistory.sessionHistory.mockResolvedValue([]);
				const context = await policedContext(setup);

				const first = await context.sessionHistory();
				const second = await context.sessionHistory();

				expect(second).toBe(first);
				expect(setup.toolCallHistory.sessionHistory).toHaveBeenCalledTimes(1);
			});
		});

		it.each([
			['a run that another agent delegated', { delegated: true as const }, true],
			['a top-level run', {}, false],
		])('marks %s', async (_name, persistence, delegated) => {
			const { backend, service } = setUp();

			await hook(service)({ ...call, persistence: { ...call.persistence!, ...persistence } });

			expect(backend.enforce).toHaveBeenCalledExactlyOnceWith(
				'preToolExecution',
				expect.objectContaining({ delegated }),
				expect.anything(),
			);
		});

		describe('policy of another agent', () => {
			const draftPolicy: ToolPolicy = { defaultAction: 'allow', rules: [] };
			const publishedPolicy: ToolPolicy = { defaultAction: 'deny', rules: [] };
			const parent = {
				schema: { config: { guardrails: { toolPolicy: draftPolicy } } },
				activeVersion: { schema: { config: { guardrails: { toolPolicy: publishedPolicy } } } },
			} as unknown as ProjectAgent;

			async function loadParentPolicy(
				setup: ReturnType<typeof setUp>,
				usePublishedVersion: boolean,
			) {
				await hook(setup.service, { usePublishedVersion })(call);
				const context = setup.backend.enforce.mock.calls[0][1] as PolicedToolCall;
				return await context.loadAgentToolPolicy('parent-agent');
			}

			it.each([
				['the draft policy in a draft run', false, draftPolicy],
				['the published policy in a published run', true, publishedPolicy],
			])('loads %s, from the project of the run', async (_name, usePublishedVersion, expected) => {
				const setup = setUp();
				setup.agentRepository.findByIdAndProjectId.mockResolvedValue(parent);

				expect(await loadParentPolicy(setup, usePublishedVersion)).toBe(expected);
				expect(setup.agentRepository.findByIdAndProjectId).toHaveBeenCalledExactlyOnceWith(
					'parent-agent',
					'project-1',
				);
			});

			it.each([
				['is not in the project', null],
				['has no policy', { schema: { config: {} } } as unknown as ProjectAgent],
				['is not published, in a published run', { schema: parent.schema } as ProjectAgent],
			])('has no policy for an agent that %s', async (_name, agent) => {
				const setup = setUp();
				setup.agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

				expect(await loadParentPolicy(setup, true)).toBeNull();
			});
		});

		it('has no session or execution for a run without persistence', async () => {
			const { backend, service } = setUp();

			await hook(service)({
				...call,
				persistence: undefined,
			});

			expect(backend.enforce).toHaveBeenCalledExactlyOnceWith(
				'preToolExecution',
				expect.objectContaining({ threadId: null, agentExecutionId: null }),
				expect.anything(),
			);
		});

		it('denies a blocked call with a refusal that the model can read', async () => {
			const { backend, service } = setUp();
			backend.enforce.mockResolvedValue({ violations: [denied] });

			const decision = await hook(service)(call);

			expect(decision).toEqual({
				allow: false,
				result: expect.objectContaining({
					isPolicyRefusal: true,
					message: 'This tool call is not allowed',
					violations: [denied],
				}),
			});
		});

		it('throws when the policy could not be checked, so the runtime stops the call', async () => {
			const { backend, service } = setUp();
			const failure = new Error('Could not verify policy');
			backend.enforce.mockRejectedValue(failure);

			await expect(hook(service)(call)).rejects.toBe(failure);
		});
	});
});
