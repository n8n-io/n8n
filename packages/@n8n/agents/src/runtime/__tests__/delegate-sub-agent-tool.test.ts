import type { JSONSchema7 } from 'json-schema';
import { describe, expect, it, vi } from 'vitest';

import { AgentEvent, type AgentEventData } from '../../types/runtime/event';
import type { GenerateResult } from '../../types/sdk/agent';
import { isZodSchema } from '../../utils/zod';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
	createDelegateSubAgentTool,
	generateResultToDelegateSubAgentOutput,
	getInlineDelegateSubAgentToolOptions,
	isDelegateSubAgentTool,
	renderDelegateSubAgentPrompt,
	type DelegateSubAgentContinuation,
	type DelegateSubAgentResumeRunner,
	type DelegateSubAgentRunner,
	type DelegateSubAgentToolOutput,
} from '../tools/delegate-sub-agent-tool';
import type { SubAgentTaskPath } from '../tools/sub-agent-task-path';

const input = {
	subAgentId: INLINE_SUB_AGENT_ID,
	taskName: 'Research API',
	goal: 'Find the API behavior.',
	context: 'Focus on auth endpoints.',
	expectedOutput: 'A short summary.',
};

const approvalSuspendPayload = {
	type: 'approval',
	toolName: 'http_request',
	args: { url: 'https://example.com' },
};

const approvalResumeSchema = {
	type: 'object',
	properties: { approved: { type: 'boolean' } },
	required: ['approved'],
} satisfies JSONSchema7;

function delegateContinuation(
	overrides: Partial<DelegateSubAgentContinuation> = {},
): DelegateSubAgentContinuation {
	return {
		runId: 'child-run-1',
		toolCallId: 'child-tool-call-1',
		taskPath: '/root/research_api_0',
		subAgentId: INLINE_SUB_AGENT_ID,
		childCount: 0,
		...overrides,
	};
}

function suspendedApproval(
	taskPath: SubAgentTaskPath,
	toolCallId = 'child-tool-call-1',
	url = 'https://example.com',
): DelegateSubAgentToolOutput {
	return {
		status: 'suspended',
		taskPath,
		runId: 'child-run-1',
		threadId: 'child-thread-1',
		resumeContext: { agentId: 'agent-1', versionId: 'version-1' },
		answer: '',
		pendingSuspend: [
			{
				runId: 'child-run-1',
				toolCallId,
				toolName: 'http_request',
				input: { url },
				resumeSchema: approvalResumeSchema,
				suspendPayload: { type: 'approval', toolName: 'http_request', args: { url } },
			},
		],
	};
}

describe('createDelegateSubAgentTool', () => {
	it('creates the delegate_subagent tool', () => {
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () =>
				await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api',
					runId: 'child-run-1',
					answer: 'done',
					getState: () => {
						throw new Error('not implemented');
					},
				}),
		});

		expect(tool.name).toBe(DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(tool.description).toContain('focused child agent');
		expect(tool.description).toContain('independent workstreams');
		expect(tool.inputSchema).toBeDefined();
		expect(tool.outputSchema).toBeDefined();
	});

	it('defaults to the delegate_subagent name when none is provided', () => {
		const tool = createDelegateSubAgentTool();

		expect(tool.name).toBe(DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(tool.systemInstruction).toContain('delegate_subagent runs a focused child agent');
		expect(tool.systemInstruction).toContain('WHEN TO USE delegate_subagent:');
		expect(tool.systemInstruction).toContain('WHEN NOT TO USE delegate_subagent:');
	});

	it('renames the tool and interpolates the name into the system instruction', () => {
		const tool = createDelegateSubAgentTool({ name: 'agent' });

		expect(tool.name).toBe('agent');
		expect(tool.systemInstruction).toContain('agent runs a focused child agent');
		expect(tool.systemInstruction).toContain('WHEN TO USE agent:');
		expect(tool.systemInstruction).toContain('WHEN NOT TO USE agent:');
		expect(tool.systemInstruction).not.toContain('delegate_subagent');
	});

	it('preserves a custom name across the SDK inline-completion rebuild', () => {
		const tool = createDelegateSubAgentTool({
			name: 'agent',
			runSubAgent: async () =>
				await Promise.resolve({ status: 'completed', taskPath: '/root/x_0', answer: 'done' }),
		});

		const rebuilt = createDelegateSubAgentTool({
			...getInlineDelegateSubAgentToolOptions(tool),
			runSubAgent: async () =>
				await Promise.resolve({ status: 'completed', taskPath: '/root/x_0', answer: 'done' }),
		});

		expect(rebuilt.name).toBe('agent');
	});

	it.each(['', ' ', 'has space', '1agent', 'agent!', 'a'.repeat(65)])(
		'rejects invalid delegate tool name %j',
		(name) => {
			expect(() => createDelegateSubAgentTool({ name })).toThrow(
				'Invalid delegate sub-agent tool name',
			);
		},
	);

	it('names a renamed tool in policy validation errors', () => {
		expect(() => createDelegateSubAgentTool({ name: 'agent', policy: { maxChildren: 0 } })).toThrow(
			'agent policy.maxChildren must be at least 1',
		);
	});

	it('requires resume and cancellation callbacks to be configured together', () => {
		expect(() =>
			createDelegateSubAgentTool({
				resumeSubAgent: vi.fn(),
			}),
		).toThrow('requires resumeSubAgent and cancelSubAgent to be configured together');
		expect(() =>
			createDelegateSubAgentTool({
				cancelSubAgent: vi.fn(),
			}),
		).toThrow('requires resumeSubAgent and cancelSubAgent to be configured together');
	});

	it('names a renamed tool in the missing-runner error', async () => {
		const tool = createDelegateSubAgentTool({ name: 'agent' });

		await expect(tool.handler?.(input, { runId: 'parent-run-1' })).resolves.toMatchObject({
			status: 'failed',
			error:
				'agent was registered without a runSubAgent callback, and no host runner was provided. Register it on an Agent (for inline delegation) or pass runSubAgent.',
		});
	});

	it('identifies delegate tools by metadata regardless of name', () => {
		expect(isDelegateSubAgentTool(createDelegateSubAgentTool())).toBe(true);
		expect(isDelegateSubAgentTool(createDelegateSubAgentTool({ name: 'agent' }))).toBe(true);
		expect(isDelegateSubAgentTool({ name: DELEGATE_SUB_AGENT_TOOL_NAME })).toBe(false);
	});

	it.each([null, '', '   '])(
		'falls back to the default system instruction for non-string or blank value %j',
		(systemInstruction) => {
			const tool = createDelegateSubAgentTool({ systemInstruction });

			expect(tool.systemInstruction).toContain('WHEN TO USE delegate_subagent:');
		},
	);

	it('uses a host-provided system instruction instead of the built-in guidance', () => {
		const tool = createDelegateSubAgentTool({
			name: 'agent',
			systemInstruction: 'Host-authored delegation guidance.',
		});

		expect(tool.systemInstruction).toBe('Host-authored delegation guidance.');
		expect(tool.systemInstruction).not.toContain('WHEN TO USE agent:');
	});

	it('preserves a custom system instruction across the SDK inline-completion rebuild', () => {
		const tool = createDelegateSubAgentTool({
			name: 'agent',
			systemInstruction: 'Host-authored delegation guidance.',
			runSubAgent: async () =>
				await Promise.resolve({ status: 'completed', taskPath: '/root/x_0', answer: 'done' }),
		});

		const rebuilt = createDelegateSubAgentTool({
			...getInlineDelegateSubAgentToolOptions(tool),
			runSubAgent: async () =>
				await Promise.resolve({ status: 'completed', taskPath: '/root/x_0', answer: 'done' }),
		});

		expect(rebuilt.systemInstruction).toBe('Host-authored delegation guidance.');
	});

	it('uses the default description when none is provided', () => {
		const tool = createDelegateSubAgentTool();

		expect(tool.description).toContain('focused child agent');
		expect(tool.description).toContain('independent workstreams');
	});

	it.each([null, '', '   '])(
		'falls back to the default description for non-string or blank value %j',
		(description) => {
			const tool = createDelegateSubAgentTool({ description });

			expect(tool.description).toContain('independent workstreams');
		},
	);

	it('uses a host-provided description instead of the built-in text', () => {
		const tool = createDelegateSubAgentTool({
			description: 'Delegate read-only research to a sub-agent.',
		});

		expect(tool.description).toBe('Delegate read-only research to a sub-agent.');
		expect(tool.description).not.toContain('independent workstreams');
	});

	it('preserves a custom description across the SDK inline-completion rebuild', () => {
		const tool = createDelegateSubAgentTool({
			description: 'Delegate read-only research to a sub-agent.',
			runSubAgent: async () =>
				await Promise.resolve({ status: 'completed', taskPath: '/root/x_0', answer: 'done' }),
		});

		const rebuilt = createDelegateSubAgentTool({
			...getInlineDelegateSubAgentToolOptions(tool),
			runSubAgent: async () =>
				await Promise.resolve({ status: 'completed', taskPath: '/root/x_0', answer: 'done' }),
		});

		expect(rebuilt.description).toBe('Delegate read-only research to a sub-agent.');
	});

	it('accepts optional difficulty on the delegate input schema', () => {
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () =>
				await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api_0',
					answer: 'done',
				}),
		});

		expect(isZodSchema(tool.inputSchema)).toBe(true);
		if (!isZodSchema(tool.inputSchema)) return;

		expect(
			tool.inputSchema.safeParse({
				...input,
				difficulty: 'medium',
			}).success,
		).toBe(true);
		expect(
			tool.inputSchema.safeParse({
				...input,
				difficulty: 'extreme',
			}).success,
		).toBe(false);
	});

	it('preserves inlineSubAgentModelsByDifficulty in delegate tool metadata', () => {
		const tool = createDelegateSubAgentTool({
			inlineSubAgentModelsByDifficulty: {
				high: 'anthropic/claude-sonnet-4-5',
			},
			runSubAgent: async () =>
				await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api_0',
					answer: 'done',
				}),
		});

		expect(getInlineDelegateSubAgentToolOptions(tool)?.inlineSubAgentModelsByDifficulty).toEqual({
			high: 'anthropic/claude-sonnet-4-5',
		});
	});

	it('renders configured sub-agent useWhen guidance in model-facing instructions', () => {
		const tool = createDelegateSubAgentTool({
			availableSubAgents: [
				{
					id: 'agent-billing',
					name: 'Billing Agent',
					useWhen: 'Use for invoice investigations and payment status checks.',
				},
				{
					id: 'agent-research',
					name: 'Research Agent',
					useWhen: 'Use for market and source research.',
				},
			],
		});

		expect(tool.systemInstruction).toContain('name and useWhen guidance');
		expect(tool.systemInstruction).toContain('- agent-billing: Billing Agent');
		expect(tool.systemInstruction).toContain(
			'Use when: Use for invoice investigations and payment status checks.',
		);
		expect(tool.systemInstruction).toContain('- agent-research: Research Agent');
		expect(tool.systemInstruction).toContain('Use when: Use for market and source research.');
		expect(tool.systemInstruction).not.toContain('name/description');
	});

	it('preserves available sub-agent useWhen guidance in delegate tool metadata', () => {
		const availableSubAgents = [
			{
				id: 'agent-billing',
				name: 'Billing Agent',
				useWhen: 'Use for invoice investigations.',
			},
		];
		const tool = createDelegateSubAgentTool({ availableSubAgents });

		expect(getInlineDelegateSubAgentToolOptions(tool)?.availableSubAgents).toEqual(
			availableSubAgents,
		);
	});

	it('preserves resolveInlineSubAgentProviderTools in delegate tool metadata', () => {
		const resolveInlineSubAgentProviderTools = () => [];
		const tool = createDelegateSubAgentTool({
			resolveInlineSubAgentProviderTools,
			runSubAgent: async () =>
				await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api_0',
					answer: 'done',
				}),
		});

		expect(getInlineDelegateSubAgentToolOptions(tool)?.resolveInlineSubAgentProviderTools).toBe(
			resolveInlineSubAgentProviderTools,
		);
	});

	it('can be created without a host runner for SDK inline execution', async () => {
		const tool = createDelegateSubAgentTool();

		await expect(tool.handler?.(input, { runId: 'parent-run-1' })).resolves.toMatchObject({
			status: 'failed',
			answer: '',
			error:
				'delegate_subagent was registered without a runSubAgent callback, and no host runner was provided. Register it on an Agent (for inline delegation) or pass runSubAgent.',
		});
	});

	it('passes model input and parent runtime context to the runner callback', async () => {
		const runSubAgent = vi.fn<DelegateSubAgentRunner>().mockResolvedValue({
			status: 'completed',
			taskPath: '/root/research_api',
			runId: 'child-run-1',
			answer: 'done',
		});
		const tool = createDelegateSubAgentTool({
			policy: { maxChildren: 2 },
			runSubAgent,
		});

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'tool-call-1',
		});

		expect(runSubAgent).toHaveBeenCalledWith(
			{
				...input,
				taskPath: '/root/research_api_0',
				parentRunId: 'parent-run-1',
				parentToolCallId: 'tool-call-1',
				childCount: 0,
				policy: { maxChildren: 2 },
			},
			expect.objectContaining({
				runInlineSubAgent: expect.any(Function),
			}),
		);
	});

	it('forwards difficulty to the runner callback when provided', async () => {
		const runSubAgent = vi.fn<DelegateSubAgentRunner>().mockResolvedValue({
			status: 'completed',
			taskPath: '/root/research_api_0',
			answer: 'done',
		});
		const tool = createDelegateSubAgentTool({ runSubAgent });

		await tool.handler?.(
			{ ...input, difficulty: 'high' },
			{
				runId: 'parent-run-1',
				toolCallId: 'tool-call-1',
			},
		);

		expect(runSubAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				difficulty: 'high',
			}),
			expect.objectContaining({
				runInlineSubAgent: expect.any(Function),
			}),
		);
	});

	it('passes runInlineSubAgent helpers to the host runner callback', async () => {
		const runSubAgent = vi.fn<DelegateSubAgentRunner>(async (_request, helpers) => {
			expect(helpers.runInlineSubAgent).toEqual(expect.any(Function));
			await Promise.resolve();
			return {
				status: 'completed',
				taskPath: '/root/research_api_0',
				answer: 'routed',
			};
		});
		const tool = createDelegateSubAgentTool({ runSubAgent });

		await tool.handler?.(input, { runId: 'parent-run-1' });

		expect(runSubAgent).toHaveBeenCalledOnce();
	});

	it('cascades an object child suspension through the parent delegate tool', async () => {
		const suspend = vi.fn().mockResolvedValue(undefined);
		const tool = createDelegateSubAgentTool({
			runSubAgent: async (request) => await Promise.resolve(suspendedApproval(request.taskPath)),
			resumeSubAgent: async () => await Promise.reject(new Error('not resumed')),
			cancelSubAgent: vi.fn(),
		});

		expect(tool.suspendSchema).toBeDefined();
		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'parent-tool-call-1',
			resumeData: undefined,
			suspend,
		});

		expect(suspend).toHaveBeenCalledWith(approvalSuspendPayload, {
			resumeSchema: approvalResumeSchema,
			continuation: delegateContinuation({
				threadId: 'child-thread-1',
				resumeContext: { agentId: 'agent-1', versionId: 'version-1' },
			}),
		});
	});

	it('does not expose a child suspension without a resume schema', async () => {
		const suspend = vi.fn().mockResolvedValue(undefined);
		const tool = createDelegateSubAgentTool({
			runSubAgent: async (request) =>
				await Promise.resolve({
					status: 'suspended',
					taskPath: request.taskPath,
					runId: 'child-run-1',
					answer: '',
					pendingSuspend: [
						{
							runId: 'child-run-1',
							toolCallId: 'child-tool-call-1',
							toolName: 'unknown_interaction',
							input: {},
							suspendPayload: { prompt: 'Choose' },
						},
					],
				}),
			resumeSubAgent: vi.fn(),
			cancelSubAgent: vi.fn(),
		});

		await expect(
			tool.handler?.(input, {
				runId: 'parent-run-1',
				toolCallId: 'parent-tool-call-1',
				resumeData: undefined,
				suspend,
			}),
		).resolves.toMatchObject({
			status: 'failed',
			error: 'agents.chat.delegate.childSuspendUnsupported',
		});
		expect(suspend).not.toHaveBeenCalled();
	});

	it('cleans up the exact child checkpoint when the parent wait is cancelled', async () => {
		const cancelSubAgent = vi.fn().mockResolvedValue(undefined);
		const resumeSubAgent = vi.fn<DelegateSubAgentResumeRunner>();
		const tool = createDelegateSubAgentTool({
			runSubAgent: vi.fn(),
			resumeSubAgent,
			cancelSubAgent,
		});

		await tool.onCancellation?.(input, {
			cancellation: { message: 'take another approach' },
			runId: 'parent-run-1',
			toolCallId: 'parent-tool-call-1',
			suspendPayload: approvalSuspendPayload,
			continuation: delegateContinuation({
				threadId: 'child-thread-1',
				taskPath: '/root/research_api_2',
				childCount: 2,
				resumeContext: { agentId: 'agent-1', versionId: 'version-1' },
			}),
		});

		expect(resumeSubAgent).not.toHaveBeenCalled();
		expect(cancelSubAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				taskPath: '/root/research_api_2',
				childRunId: 'child-run-1',
				childToolCallId: 'child-tool-call-1',
				childThreadId: 'child-thread-1',
				resumeContext: { agentId: 'agent-1', versionId: 'version-1' },
				reason: 'take another approach',
			}),
			expect.objectContaining({ emitChunk: expect.any(Function) }),
		);
	});

	it('keeps the parent suspended when child resume setup fails and succeeds on retry', async () => {
		const resumeSubAgent = vi
			.fn<DelegateSubAgentResumeRunner>()
			.mockRejectedValueOnce(new Error('reconstruction unavailable'))
			.mockResolvedValueOnce({
				status: 'completed',
				taskPath: '/root/research_api_0',
				answer: 'request completed',
			});
		const tool = createDelegateSubAgentTool({
			runSubAgent: vi.fn(),
			resumeSubAgent,
			cancelSubAgent: vi.fn(),
		});
		const continuation = delegateContinuation();
		const suspend = vi.fn().mockResolvedValue(undefined);

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'parent-tool-call-1',
			resumeData: { approved: true },
			suspendPayload: approvalSuspendPayload,
			continuation,
			resumeSchema: approvalResumeSchema,
			suspend,
		});

		expect(suspend).toHaveBeenCalledWith(approvalSuspendPayload);
		await expect(
			tool.handler?.(input, {
				runId: 'parent-run-1',
				toolCallId: 'parent-tool-call-1',
				resumeData: { approved: true },
				suspendPayload: approvalSuspendPayload,
				continuation,
				resumeSchema: approvalResumeSchema,
				suspend,
			}),
		).resolves.toMatchObject({ status: 'completed', answer: 'request completed' });
		expect(resumeSubAgent).toHaveBeenCalledTimes(2);
	});

	it('cascades repeated child suspensions and routes each new checkpoint', async () => {
		const runSubAgent = vi.fn();
		const resumeSubAgent = vi
			.fn<DelegateSubAgentResumeRunner>()
			.mockResolvedValueOnce(
				suspendedApproval('/root/research_api_2', 'child-tool-call-2', 'https://example.com/next'),
			)
			.mockResolvedValueOnce({
				status: 'completed',
				taskPath: '/root/research_api_2',
				runId: 'child-run-1',
				threadId: 'child-thread-1',
				answer: 'all requests completed',
			});
		const tool = createDelegateSubAgentTool({
			runSubAgent,
			resumeSubAgent,
			cancelSubAgent: vi.fn(),
		});
		const suspend = vi.fn().mockResolvedValue(undefined);
		const firstContinuation = delegateContinuation({
			threadId: 'child-thread-1',
			taskPath: '/root/research_api_2',
			childCount: 2,
			resumeContext: { agentId: 'agent-1', versionId: 'version-1' },
		});

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'parent-tool-call-1',
			resumeData: { approved: true },
			suspendPayload: approvalSuspendPayload,
			continuation: firstContinuation,
			suspend,
		});
		expect(resumeSubAgent).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				taskPath: '/root/research_api_2',
				childCount: 2,
				parentRunId: 'parent-run-1',
				parentToolCallId: 'parent-tool-call-1',
				childRunId: 'child-run-1',
				childToolCallId: 'child-tool-call-1',
				childThreadId: 'child-thread-1',
				resumeContext: { agentId: 'agent-1', versionId: 'version-1' },
				resumeData: { approved: true },
			}),
			expect.objectContaining({
				runInlineSubAgent: expect.any(Function),
				emitChunk: expect.any(Function),
			}),
		);

		const secondSuspendPayload = {
			type: 'approval',
			toolName: 'http_request',
			args: { url: 'https://example.com/next' },
		};
		const secondContinuation = {
			...firstContinuation,
			toolCallId: 'child-tool-call-2',
		};
		expect(suspend).toHaveBeenCalledWith(secondSuspendPayload, {
			resumeSchema: approvalResumeSchema,
			continuation: secondContinuation,
		});

		await expect(
			tool.handler?.(input, {
				runId: 'parent-run-1',
				toolCallId: 'parent-tool-call-1',
				resumeData: { approved: true },
				suspendPayload: secondSuspendPayload,
				continuation: secondContinuation,
				suspend,
			}),
		).resolves.toMatchObject({ status: 'completed', answer: 'all requests completed' });

		expect(runSubAgent).not.toHaveBeenCalled();
		expect(resumeSubAgent.mock.calls.map(([request]) => request.childToolCallId)).toEqual([
			'child-tool-call-1',
			'child-tool-call-2',
		]);
	});

	it('forwards the parent execution counter but suppresses the child message count', async () => {
		const runSubAgent = vi
			.fn<DelegateSubAgentRunner>()
			.mockResolvedValue({ status: 'completed', taskPath: '/root/research_api', answer: 'done' });
		const tool = createDelegateSubAgentTool({ runSubAgent });
		const executionCounter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'tool-call-1',
			executionCounter,
		});

		const forwarded = runSubAgent.mock.calls[0]?.[0]?.parentExecutionCounter;
		forwarded?.incrementMessageCount();
		forwarded?.incrementToolCallCount();
		forwarded?.incrementTokenCount(42);

		// A delegation is not a fresh user turn, so it must not add to the parent's
		// message count — but its tokens and tool calls still roll up.
		expect(executionCounter.incrementMessageCount).not.toHaveBeenCalled();
		expect(executionCounter.incrementToolCallCount).toHaveBeenCalledOnce();
		expect(executionCounter.incrementTokenCount).toHaveBeenCalledWith(42);
	});

	it('forwards the parent persistence scope', async () => {
		const runSubAgent = vi
			.fn<DelegateSubAgentRunner>()
			.mockResolvedValue({ status: 'completed', taskPath: '/root/research_api', answer: 'done' });
		const tool = createDelegateSubAgentTool({ runSubAgent });

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			persistence: {
				threadId: 'parent-thread-1',
				resourceId: 'resource-1',
				hostMetadata: { tenant: 'tenant-1', scope: { id: 'scope-1' } },
			},
		});

		expect(runSubAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				parentThreadId: 'parent-thread-1',
				parentResourceId: 'resource-1',
				parentHostMetadata: { tenant: 'tenant-1', scope: { id: 'scope-1' } },
			}),
			expect.objectContaining({
				runInlineSubAgent: expect.any(Function),
			}),
		);
	});

	it('omits parent persistence fields when the parent run has no persistence scope', async () => {
		const runSubAgent = vi
			.fn<DelegateSubAgentRunner>()
			.mockResolvedValue({ status: 'completed', taskPath: '/root/research_api', answer: 'done' });
		const tool = createDelegateSubAgentTool({ runSubAgent });

		await tool.handler?.(input, { runId: 'parent-run-1' });

		expect(runSubAgent.mock.calls[0]?.[0]).not.toHaveProperty('parentThreadId');
		expect(runSubAgent.mock.calls[0]?.[0]).not.toHaveProperty('parentResourceId');
		expect(runSubAgent.mock.calls[0]?.[0]).not.toHaveProperty('parentAbortSignal');
		expect(runSubAgent.mock.calls[0]?.[0]).not.toHaveProperty('parentExecutionCounter');
		expect(runSubAgent.mock.calls[0]?.[0]).not.toHaveProperty('parentTelemetry');
	});

	it('forwards the parent telemetry from the tool context to the runner callback', async () => {
		const runSubAgent = vi
			.fn<DelegateSubAgentRunner>()
			.mockResolvedValue({ status: 'completed', taskPath: '/root/research_api', answer: 'done' });
		const tool = createDelegateSubAgentTool({ runSubAgent });
		const parentTelemetry = {
			enabled: true,
			recordInputs: true,
			recordOutputs: true,
			integrations: [],
			functionId: 'parent-agent',
		};

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			parentTelemetry,
		});

		expect(runSubAgent).toHaveBeenCalledWith(
			expect.objectContaining({ parentTelemetry }),
			expect.objectContaining({
				runInlineSubAgent: expect.any(Function),
			}),
		);
	});

	it('forwards the parent run abort signal to the runner callback', async () => {
		const runSubAgent = vi
			.fn<DelegateSubAgentRunner>()
			.mockResolvedValue({ status: 'completed', taskPath: '/root/research_api', answer: 'done' });
		const tool = createDelegateSubAgentTool({ runSubAgent });
		const controller = new AbortController();

		await tool.handler?.(input, { runId: 'parent-run-1', abortSignal: controller.signal });

		expect(runSubAgent).toHaveBeenCalledWith(
			expect.objectContaining({ parentAbortSignal: controller.signal }),
			expect.objectContaining({
				runInlineSubAgent: expect.any(Function),
			}),
		);
	});

	it('emits lifecycle events around runner callback execution', async () => {
		const events: AgentEventData[] = [];
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () =>
				await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api',
					runId: 'child-run-1',
					threadId: 'child-thread-1',
					answer: 'done',
					usage: {
						promptTokens: 3,
						completionTokens: 2,
						totalTokens: 5,
					},
					finishReason: 'stop',
				}),
		});

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'tool-call-1',
			emitEvent: (event) => events.push(event),
		});

		expect(events.map((event) => event.type)).toEqual([
			AgentEvent.SubAgentStarted,
			AgentEvent.SubAgentCompleted,
		]);
		expect(events[0]).toMatchObject({
			taskName: 'Research API',
			taskPath: '/root/research_api_0',
			parentRunId: 'parent-run-1',
			parentToolCallId: 'tool-call-1',
		});
		expect(events[1]).toMatchObject({
			status: 'completed',
			runId: 'child-run-1',
			threadId: 'child-thread-1',
			usage: { totalTokens: 5 },
			finishReason: 'stop',
		});
	});

	it('forwards only allowlisted child chunks, keeping args, results and nesting out', async () => {
		const events: AgentEventData[] = [];
		const tool = createDelegateSubAgentTool({
			runSubAgent: async (_request, helpers) => {
				helpers.emitChunk({ type: 'text-delta', id: 't-1', delta: 'hello' });
				helpers.emitChunk({
					type: 'tool-call',
					toolCallId: 'child-tc-1',
					toolName: 'web_search',
					input: { query: 'x'.repeat(5_000) },
				});
				helpers.emitChunk({
					type: 'tool-result',
					toolCallId: 'child-tc-1',
					toolName: 'web_search',
					output: { body: 'y'.repeat(5_000) },
				});
				helpers.emitChunk({
					type: 'subagent-started',
					taskName: 'nested',
					taskPath: '/root/research_api_0/nested_0',
					startedAt: 1,
				});
				return await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api_0',
					answer: 'done',
				});
			},
		});

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'tool-call-1',
			emitEvent: (event) => events.push(event),
		});

		const forwarded = events.filter((event) => event.type === AgentEvent.SubAgentChunk);
		expect(forwarded).toHaveLength(1);
		expect(forwarded[0]).toMatchObject({
			parentToolCallId: 'tool-call-1',
			chunk: { type: 'text-delta', delta: 'hello' },
		});
	});

	it('caps forwarded child text at the budget but keeps tool lifecycle flowing', async () => {
		const events: AgentEventData[] = [];
		const tool = createDelegateSubAgentTool({
			runSubAgent: async (_request, helpers) => {
				// Neither delta lands on the boundary, so the second must be trimmed
				// rather than forwarded whole.
				helpers.emitChunk({ type: 'text-delta', id: 't-1', delta: 'a'.repeat(15_000) });
				helpers.emitChunk({ type: 'text-delta', id: 't-1', delta: 'b'.repeat(15_000) });
				helpers.emitChunk({ type: 'reasoning-delta', id: 'r-1', delta: 'over budget' });
				helpers.emitChunk({
					type: 'tool-execution-end',
					toolCallId: 'child-tc-1',
					toolName: 'web_search',
					isError: false,
					endTime: 1,
				});
				return await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api_0',
					answer: 'done',
				});
			},
		});

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'tool-call-1',
			emitEvent: (event) => events.push(event),
		});

		const forwarded = events.filter((event) => event.type === AgentEvent.SubAgentChunk);
		expect(forwarded.map((event) => event.chunk.type)).toEqual([
			'text-delta',
			'text-delta',
			'tool-execution-end',
		]);
		const forwardedChars = forwarded.reduce(
			(total, event) => total + ('delta' in event.chunk ? event.chunk.delta.length : 0),
			0,
		);
		expect(forwardedChars).toBe(20_000);
	});

	it('defaults maxChildren to 10 when policy is omitted', () => {
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () =>
				await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api_0',
					answer: 'done',
				}),
		});

		expect(tool.systemInstruction).toContain('DELEGATION PARALLELISM');
		expect(tool.systemInstruction).toContain('Up to 10 child sub-agent runs');
	});

	it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects invalid maxChildren policy value %s',
		(maxChildren) => {
			expect(() =>
				createDelegateSubAgentTool({
					policy: { maxChildren },
					runSubAgent: async () =>
						await Promise.resolve({
							status: 'completed',
							taskPath: '/root/research_api_0',
							answer: 'done',
						}),
				}),
			).toThrow('delegate_subagent policy.maxChildren');
		},
	);

	it('describes maxChildren as a parallelism limit in model-facing instructions', () => {
		const tool = createDelegateSubAgentTool({
			policy: { maxChildren: 2 },
			runSubAgent: async () =>
				await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api_0',
					answer: 'done',
				}),
		});

		expect(tool.systemInstruction).toContain('DELEGATION PARALLELISM');
		expect(tool.systemInstruction).toContain('Up to 2 child sub-agent runs');
		expect(tool.systemInstruction).toContain('limits parallelism, not the total number');
	});

	it('does not promise inline provider tools when no resolver is configured', () => {
		const tool = createDelegateSubAgentTool();

		expect(tool.systemInstruction).toContain(
			'Inline children do not inherit provider-defined tools.',
		);
		expect(tool.systemInstruction).not.toContain('Provider-defined tools are loaded');
	});

	it('describes inline provider tools when a resolver is configured', () => {
		const tool = createDelegateSubAgentTool({
			resolveInlineSubAgentProviderTools: async () => await Promise.resolve([]),
		});

		expect(tool.systemInstruction).toContain(
			"Provider-defined tools are loaded for the inline child's selected model provider.",
		);
	});

	it('assigns distinct task paths for repeated delegations in the same parent run', async () => {
		const runSubAgent = vi.fn<DelegateSubAgentRunner>().mockResolvedValue({
			status: 'completed',
			taskPath: '/root/research_api',
			runId: 'child-run-1',
			answer: 'done',
		});
		const tool = createDelegateSubAgentTool({
			policy: { maxChildren: 1 },
			runSubAgent,
		});

		await expect(tool.handler?.(input, { runId: 'parent-run-1' })).resolves.toMatchObject({
			status: 'completed',
		});
		await expect(tool.handler?.(input, { runId: 'parent-run-1' })).resolves.toMatchObject({
			status: 'completed',
		});
		await expect(tool.handler?.(input, { runId: 'parent-run-2' })).resolves.toMatchObject({
			status: 'completed',
		});

		expect(runSubAgent).toHaveBeenCalledTimes(3);
		expect(runSubAgent.mock.calls[0]?.[0]).toMatchObject({ taskPath: '/root/research_api_0' });
		expect(runSubAgent.mock.calls[1]?.[0]).toMatchObject({ taskPath: '/root/research_api_1' });
		expect(runSubAgent.mock.calls[2]?.[0]).toMatchObject({ taskPath: '/root/research_api_0' });
	});

	it('returns a failed output when the runner callback throws', async () => {
		const events: AgentEventData[] = [];
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () => await Promise.reject(new Error('Runner failed')),
		});

		await expect(
			tool.handler?.(input, {
				runId: 'parent-run-1',
				emitEvent: (event) => events.push(event),
			}),
		).resolves.toMatchObject({
			status: 'failed',
			taskPath: '/root/research_api_0',
			answer: '',
			error: 'Runner failed',
		});
		expect(events[events.length - 1]).toMatchObject({
			type: AgentEvent.SubAgentCompleted,
			status: 'failed',
			error: 'Runner failed',
		});
	});

	it('rethrows an abort instead of reporting the delegation as failed', async () => {
		const events: AgentEventData[] = [];
		const abortError = new Error('This operation was aborted');
		abortError.name = 'AbortError';
		const controller = new AbortController();
		controller.abort();
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () => await Promise.reject(abortError),
		});

		await expect(
			tool.handler?.(input, {
				runId: 'parent-run-1',
				abortSignal: controller.signal,
				emitEvent: (event) => events.push(event),
			}),
		).rejects.toBe(abortError);
		expect(events[events.length - 1]).toMatchObject({
			type: AgentEvent.SubAgentCompleted,
			status: 'cancelled',
		});
	});

	it('reports an abort-shaped child error as failed while the parent signal is live', async () => {
		const abortError = new Error('This operation was aborted');
		abortError.name = 'AbortError';
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () => await Promise.reject(abortError),
		});

		await expect(
			tool.handler?.(input, {
				runId: 'parent-run-1',
				abortSignal: new AbortController().signal,
			}),
		).resolves.toMatchObject({
			status: 'failed',
			error: 'This operation was aborted',
		});
	});

	it('returns a failed output for invalid task names', async () => {
		const runSubAgent = vi.fn();
		const tool = createDelegateSubAgentTool({ runSubAgent });

		await expect(
			tool.handler?.({ ...input, taskName: '!!!' }, { runId: 'parent-run-1' }),
		).resolves.toMatchObject({
			status: 'failed',
			answer: '',
			error: 'Sub-agent task name must contain at least one alphanumeric character',
		});
		expect(runSubAgent).not.toHaveBeenCalled();
	});
});

describe('renderDelegateSubAgentPrompt', () => {
	it('includes the goal and omits unset sections', () => {
		const prompt = renderDelegateSubAgentPrompt({ goal: 'Find it.' });

		expect(prompt).toContain('YOUR TASK:\nFind it.');
		expect(prompt).not.toContain('CONTEXT:');
		expect(prompt).not.toContain('EXPECTED OUTPUT:');
	});

	it('includes context and expected output when provided', () => {
		const prompt = renderDelegateSubAgentPrompt({
			goal: 'Find it.',
			context: 'auth endpoints',
			expectedOutput: 'a summary',
		});

		expect(prompt).toContain('YOUR TASK:\nFind it.');
		expect(prompt).toContain('CONTEXT:\nauth endpoints');
		expect(prompt).toContain('EXPECTED OUTPUT:\na summary');
	});

	it('uses generic summary guidance for delegated work', () => {
		const prompt = renderDelegateSubAgentPrompt({ goal: 'Find it.' });

		expect(prompt).toContain('- What you did');
		expect(prompt).toContain('- What you found or accomplished');
		expect(prompt).toContain('- Important outputs, decisions, or evidence');
		expect(prompt).toContain('- Any issues, assumptions, or limitations');
		expect(prompt).toContain(
			'If the information above is insufficient, do your best with explicitly stated assumptions and note what was missing, rather than stopping to ask.',
		);
		expect(prompt).toContain(
			'Be thorough but concise -- your response is returned to the parent agent as a summary.',
		);
	});
});

describe('generateResultToDelegateSubAgentOutput', () => {
	it('maps a successful GenerateResult to the tool output', () => {
		const result: GenerateResult = {
			runId: 'child-run-1',
			messages: [
				{
					role: 'assistant',
					type: 'llm',
					content: [
						{ type: 'text', text: 'preamble' },
						{ type: 'text', text: 'answer' },
					],
				},
			],
			finishReason: 'stop',
			model: 'anthropic/claude-haiku-4-5',
			usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
			getState: () => ({
				status: 'success',
				messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				pendingToolCalls: {},
			}),
		};

		expect(
			generateResultToDelegateSubAgentOutput('/root/research_api_0', result, 'child-thread-1'),
		).toEqual({
			status: 'completed',
			taskPath: '/root/research_api_0',
			runId: 'child-run-1',
			threadId: 'child-thread-1',
			answer: 'preamble\nanswer',
			model: 'anthropic/claude-haiku-4-5',
			usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 },
			finishReason: 'stop',
		});
	});

	it('marks an errored result as failed', () => {
		const result: GenerateResult = {
			runId: 'child-run-2',
			messages: [],
			finishReason: 'error',
			error: new Error('boom'),
			getState: () => ({
				status: 'failed',
				messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				pendingToolCalls: {},
			}),
		};

		expect(generateResultToDelegateSubAgentOutput('/root/x_0', result)).toMatchObject({
			status: 'failed',
			answer: '',
			error: 'boom',
		});
	});

	it('maps a cancelled child run to cancelled, even though it also reports an error', () => {
		const result: GenerateResult = {
			runId: 'child-run-5',
			messages: [],
			finishReason: 'error',
			error: new Error('Aborted'),
			getState: () => ({
				status: 'cancelled',
				messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				pendingToolCalls: {},
			}),
		};

		expect(generateResultToDelegateSubAgentOutput('/root/x_0', result)).toMatchObject({
			status: 'cancelled',
		});
	});

	it('returns a failed delegate output for delegated child suspension stopgap', async () => {
		const { failedDelegatedChildSuspendOutput } = await import(
			'../tools/delegate-sub-agent-tool.js'
		);

		expect(failedDelegatedChildSuspendOutput('/root/x_0')).toEqual({
			status: 'failed',
			taskPath: '/root/x_0',
			answer: '',
			error: 'agents.chat.delegate.childSuspendUnsupported',
		});
		expect(failedDelegatedChildSuspendOutput('/root/x_0', 'anthropic/claude-haiku-4-5')).toEqual({
			status: 'failed',
			taskPath: '/root/x_0',
			answer: '',
			error: 'agents.chat.delegate.childSuspendUnsupported',
			model: 'anthropic/claude-haiku-4-5',
		});
	});

	it('maps a suspended child result to suspended with pendingSuspend metadata', () => {
		const result: GenerateResult = {
			runId: 'child-run-3',
			messages: [
				{
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'awaiting approval' }],
				},
			],
			finishReason: 'tool-calls',
			pendingSuspend: [
				{
					runId: 'child-run-3',
					toolCallId: 'tool-call-1',
					toolName: 'delete_file',
					input: { path: '/tmp/foo.txt' },
					suspendPayload: { message: 'Delete file?' },
				},
			],
			getState: () => {
				throw new Error('getState is not implemented');
			},
		};

		expect(generateResultToDelegateSubAgentOutput('/root/x_0', result)).toEqual({
			status: 'suspended',
			taskPath: '/root/x_0',
			runId: 'child-run-3',
			answer: 'awaiting approval',
			finishReason: 'tool-calls',
			pendingSuspend: result.pendingSuspend,
		});
	});

	it('prefers failed over suspended when the child result also has pendingSuspend', () => {
		const result: GenerateResult = {
			runId: 'child-run-4',
			messages: [],
			finishReason: 'error',
			error: new Error('child failed'),
			pendingSuspend: [
				{
					runId: 'child-run-4',
					toolCallId: 'tool-call-1',
					toolName: 'delete_file',
					input: {},
					suspendPayload: {},
				},
			],
			getState: () => ({
				status: 'failed',
				messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				pendingToolCalls: {},
			}),
		};

		expect(generateResultToDelegateSubAgentOutput('/root/x_0', result)).toMatchObject({
			status: 'failed',
			error: 'child failed',
		});
		expect(
			generateResultToDelegateSubAgentOutput('/root/x_0', result).pendingSuspend,
		).toBeUndefined();
	});
});
