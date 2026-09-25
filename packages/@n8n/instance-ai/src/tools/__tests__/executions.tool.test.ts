import type { InstanceAiPermissions } from '@n8n/api-types';
import type { Mock } from 'vitest';
import type { z } from 'zod';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, ExecutionResult } from '../../types';
import type { VerificationClaim } from '../../workflow-loop/workflow-loop-state';
import { createExecutionsTool } from '../executions.tool';
import { recordLiveRunVerification } from '../orchestration/verification/record-live-run';

vi.mock('../orchestration/verification/record-live-run', () => ({
	recordLiveRunVerification: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock helpers ───────────────────────────────────────────────────────────────

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			get: vi.fn().mockResolvedValue({ id: 'wf-1', name: 'Fetched Name' }),
			list: vi.fn().mockResolvedValue({ workflows: [], total: 0, totalInScope: 0 }),
			getWorkflowHead: vi
				.fn()
				.mockResolvedValue({ versionId: 'draft-1', activeVersionId: null, updatedAt: 0 }),
		} as unknown as InstanceAiContext['workflowService'],
		executionService: {
			list: vi.fn(),
			getStatus: vi.fn(),
			run: vi.fn(),
			getResult: vi.fn(),
			stop: vi.fn(),
			getDebugInfo: vi.fn(),
			getNodeOutput: vi.fn(),
			getResolvedNodeParameters: vi.fn(),
			runStep: vi.fn(),
		},
		credentialService: {} as never,
		nodeService: {} as never,
		dataTableService: {} as never,
		logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function createAgentCtx(opts: { resumeData?: unknown; suspend?: Mock } = {}) {
	return {
		resumeData: opts.resumeData,
		suspend: opts.suspend ?? vi.fn(),
	};
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('executions tool', () => {
	it.each([true, false])(
		'resumes a saved execution without a summary when approved=%s',
		async (approved) => {
			const context = createMockContext();
			vi.mocked(context.executionService.run).mockResolvedValue({
				executionId: 'exec-1',
				status: 'success',
			});
			const tool = createExecutionsTool(context);
			const savedInput = { action: 'run', workflowId: 'wf-1', inputData: { orderId: 'order-1' } };
			const input: unknown = (tool.inputSchema as z.ZodType).parse(savedInput);
			const suspend = vi.fn();
			const result = await executeTool(tool, input, { resumeData: { approved }, suspend });

			expect(input).toEqual(savedInput);
			expect(suspend).not.toHaveBeenCalled();
			if (approved) {
				expect(result).toMatchObject({ executionId: 'exec-1', status: 'success' });
				expect(context.executionService.run).toHaveBeenCalledWith('wf-1', savedInput.inputData, {
					timeout: undefined,
				});
			} else {
				expect(result).toMatchObject({ denied: true });
				expect(context.executionService.run).not.toHaveBeenCalled();
			}
		},
	);

	it('preserves a live execution summary through input validation', async () => {
		const context = createMockContext();
		vi.mocked(context.workflowService.get).mockResolvedValue({ name: 'Orders' } as never);
		const tool = createExecutionsTool(context);
		const input: unknown = (tool.inputSchema as z.ZodType).parse({
			action: 'run',
			workflowId: 'wf-1',
			approvalSummary: 'Send a Slack notification for order 42',
		});
		const suspend = vi.fn();
		await executeTool(tool, input, { suspend });
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Send a Slack notification for order 42',
				resourceName: 'Orders',
				severity: 'warning',
			}),
		);
		expect(context.executionService.run).not.toHaveBeenCalled();
	});

	// ── list ────────────────────────────────────────────────────────────────

	describe('list action', () => {
		it('should call executionService.list and return executions', async () => {
			const executions = [
				{
					id: 'exec-1',
					workflowId: 'wf-1',
					workflowName: 'Test WF',
					status: 'success',
					startedAt: '2024-01-01T00:00:00Z',
					mode: 'manual',
				},
			];
			const context = createMockContext();
			(context.executionService.list as Mock).mockResolvedValue(executions);

			const tool = createExecutionsTool(context);
			const result = await executeTool(tool, { action: 'list' as const }, {} as never);

			expect(context.executionService.list).toHaveBeenCalledWith({
				workflowId: undefined,
				status: undefined,
				limit: undefined,
			});
			expect(result).toEqual({ executions });
		});

		it('should pass filters to executionService.list', async () => {
			const context = createMockContext();
			(context.executionService.list as Mock).mockResolvedValue([]);

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{
					action: 'list' as const,
					workflowId: 'wf-42',
					status: 'error',
					limit: 5,
				},
				{} as never,
			);

			expect(context.executionService.list).toHaveBeenCalledWith({
				workflowId: 'wf-42',
				status: 'error',
				limit: 5,
			});
		});

		it('should report the version each run used next to the published one', async () => {
			const context = createMockContext();
			(context.workflowService.getWorkflowHead as Mock).mockResolvedValue({
				versionId: 'draft-2',
				activeVersionId: 'published-1',
				updatedAt: 0,
			});
			(context.executionService.list as Mock).mockResolvedValue([
				{
					id: 'exec-live',
					workflowId: 'wf-1',
					workflowName: 'Test WF',
					status: 'success',
					startedAt: '2024-01-01T00:00:00Z',
					mode: 'trigger',
					workflowVersionId: 'published-1',
				},
				{
					id: 'exec-draft',
					workflowId: 'wf-1',
					workflowName: 'Test WF',
					status: 'success',
					startedAt: '2024-01-01T00:00:00Z',
					mode: 'manual',
					workflowVersionId: 'draft-2',
				},
			]);

			const tool = createExecutionsTool(context);
			const result = await executeTool<{
				executions: Array<{ id: string; workflowVersionId?: string | null }>;
				workflow?: { activeVersionId: string | null; draftVersionId: string };
			}>(tool, { action: 'list' as const, workflowId: 'wf-1' }, {} as never);

			expect(result.workflow).toEqual({
				activeVersionId: 'published-1',
				draftVersionId: 'draft-2',
			});
			expect(result.executions[0]).toMatchObject({
				id: 'exec-live',
				workflowVersionId: 'published-1',
			});
			expect(result.executions[1]).toMatchObject({
				id: 'exec-draft',
				workflowVersionId: 'draft-2',
			});
		});

		it('should report a null published version while the workflow is unpublished', async () => {
			const context = createMockContext();
			(context.executionService.list as Mock).mockResolvedValue([]);

			const tool = createExecutionsTool(context);
			const result = await executeTool<{
				workflow?: { activeVersionId: string | null; draftVersionId: string };
			}>(tool, { action: 'list' as const, workflowId: 'wf-1' }, {} as never);

			expect(result.workflow).toEqual({ activeVersionId: null, draftVersionId: 'draft-1' });
		});

		it('should skip the version lookup for an instance-wide list', async () => {
			const context = createMockContext();
			(context.executionService.list as Mock).mockResolvedValue([]);

			const tool = createExecutionsTool(context);
			const result = await executeTool(tool, { action: 'list' as const }, {} as never);

			expect(context.workflowService.getWorkflowHead).not.toHaveBeenCalled();
			expect(result).toEqual({ executions: [] });
		});

		it('should still return the executions when the version lookup fails', async () => {
			const context = createMockContext();
			(context.workflowService.getWorkflowHead as Mock).mockRejectedValue(new Error('no access'));
			(context.executionService.list as Mock).mockResolvedValue([]);

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'list' as const, workflowId: 'wf-1' },
				{} as never,
			);

			expect(result).toEqual({ executions: [] });
			expect(context.logger.warn).toHaveBeenCalled();
		});
	});

	// ── get ─────────────────────────────────────────────────────────────────

	describe('get action', () => {
		it('should call executionService.getStatus with execution ID', async () => {
			const executionStatus: ExecutionResult = {
				executionId: 'exec-1',
				status: 'running',
			};
			const context = createMockContext();
			(context.executionService.getStatus as Mock).mockResolvedValue(executionStatus);

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'get' as const, executionId: 'exec-1' },
				{} as never,
			);

			expect(context.executionService.getStatus).toHaveBeenCalledWith('exec-1');
			expect(result).toEqual(executionStatus);
		});
	});

	// ── run ─────────────────────────────────────────────────────────────────

	describe('run action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { runWorkflow: 'blocked' },
			});

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'run' as const, workflowId: 'wf-1' },
				createAgentCtx() as never,
			);

			expect(result).toEqual({
				executionId: '',
				status: 'error',
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(context.executionService.run).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({
				permissions: {},
			});
			(context.workflowService.get as Mock).mockResolvedValue({
				id: 'wf-1',
				name: 'My Workflow',
			});

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{
					action: 'run' as const,
					workflowId: 'wf-1',
				},
				createAgentCtx({ suspend: suspendFn }) as never,
			);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf-1');
			expect(suspendFn).toHaveBeenCalled();
			const suspendPayload = suspendFn.mock.calls[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					message: 'Run this workflow live',
					resourceName: 'My Workflow',
					severity: 'warning',
					requestId: expect.any(String),
				}),
			);
		});

		it('should fall back to workflowId in message when lookup fails', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({ permissions: {} });
			(context.workflowService.get as Mock).mockRejectedValue(new Error('not found'));

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{ action: 'run' as const, workflowId: 'wf-42' },
				createAgentCtx({ suspend: suspendFn }) as never,
			);

			expect(suspendFn).toHaveBeenCalled();
			const suspendPayload = suspendFn.mock.calls[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					message: 'Run this workflow live',
					resourceName: 'wf-42',
				}),
			);
		});

		it('should return denied when resumed with approval=false', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'run' as const, workflowId: 'wf-1' },
				createAgentCtx({ resumeData: { approved: false } }) as never,
			);

			expect(result).toEqual({
				executionId: '',
				status: 'error',
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.executionService.run).not.toHaveBeenCalled();
		});

		it('should execute workflow when resumed with approval=true', async () => {
			const executionResult: ExecutionResult = {
				executionId: 'exec-123',
				status: 'success',
			};
			const context = createMockContext({ permissions: {} });
			(context.executionService.run as Mock).mockResolvedValue(executionResult);

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'run' as const,
					workflowId: 'wf-1',
					inputData: { key: 'value' },
					timeout: 30_000,
				},
				createAgentCtx({ resumeData: { approved: true } }) as never,
			);

			expect(context.executionService.run).toHaveBeenCalledWith(
				'wf-1',
				{ key: 'value' },
				{ timeout: 30_000 },
			);
			expect(result).toEqual(executionResult);
		});

		it('should execute immediately when always_allow + workflow was created by the agent', async () => {
			const executionResult: ExecutionResult = {
				executionId: 'exec-456',
				status: 'success',
			};
			const context = createMockContext({
				permissions: { runWorkflow: 'always_allow' },
				aiCreatedWorkflowIds: new Set(['wf-1']),
			});
			(context.executionService.run as Mock).mockResolvedValue(executionResult);

			const suspendFn = vi.fn();
			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'run' as const, workflowId: 'wf-1' },
				createAgentCtx({ suspend: suspendFn }) as never,
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.executionService.run).toHaveBeenCalledWith('wf-1', undefined, {
				timeout: undefined,
			});
			expect(result).toEqual(executionResult);
		});

		it('should pass undefined inputData when not provided', async () => {
			const context = createMockContext({
				permissions: { runWorkflow: 'always_allow' },
				aiCreatedWorkflowIds: new Set(['wf-1']),
			});
			(context.executionService.run as Mock).mockResolvedValue({
				executionId: 'exec-1',
				status: 'success',
			});

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{ action: 'run' as const, workflowId: 'wf-1' },
				createAgentCtx() as never,
			);

			expect(context.executionService.run).toHaveBeenCalledWith('wf-1', undefined, {
				timeout: undefined,
			});
		});

		it('forwards the requested trigger node so a multi-trigger workflow runs the right branch', async () => {
			const context = createMockContext({
				permissions: { runWorkflow: 'always_allow' },
				aiCreatedWorkflowIds: new Set(['wf-1']),
			});
			(context.executionService.run as Mock).mockResolvedValue({
				executionId: 'exec-1',
				status: 'success',
			});

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{ action: 'run' as const, workflowId: 'wf-1', triggerNodeName: 'Weekly 5pm' },
				createAgentCtx() as never,
			);

			expect(context.executionService.run).toHaveBeenCalledWith(
				'wf-1',
				undefined,
				expect.objectContaining({ triggerNodeName: 'Weekly 5pm' }),
			);
		});

		describe('live run verification', () => {
			const runResult = { executionId: 'exec-1', status: 'success' as const };

			function createAllowedContext() {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					aiCreatedWorkflowIds: new Set(['wf-1']),
				});
				(context.executionService.run as Mock).mockResolvedValue(runResult);
				return context;
			}

			it('returns the recorded claim with the run result', async () => {
				const context = createAllowedContext();
				const claim: VerificationClaim = {
					level: 'verified',
					plannedNodeCount: 1,
					reachedNodeCount: 1,
					nodesNotReached: [],
					simulatedNodes: [],
					pinnedNodes: [],
					unprovenTargets: [],
					publishReady: true,
					liveTestRecommended: false,
				};
				vi.mocked(recordLiveRunVerification).mockResolvedValueOnce(claim);

				const tool = createExecutionsTool(context);
				const result = await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1', triggerNodeName: 'Every Morning' },
					createAgentCtx() as never,
				);

				expect(result).toEqual({ ...runResult, verificationClaim: claim });
				expect(recordLiveRunVerification).toHaveBeenCalledWith({
					context,
					workflowId: 'wf-1',
					triggerNodeName: 'Every Morning',
					result: runResult,
				});
			});

			it('returns the plain run result when no claim was recorded', async () => {
				const context = createAllowedContext();

				const tool = createExecutionsTool(context);
				const result = await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					createAgentCtx() as never,
				);

				expect(result).toEqual(runResult);
			});
		});

		describe('session grant (always allow)', () => {
			it('runs without HITL when the workflow has a session grant', async () => {
				const context = createMockContext({
					permissions: {},
					sessionApprovedToolKeys: new Set(['executions:run:wf-1']),
				});
				(context.executionService.run as Mock).mockResolvedValue({
					executionId: 'exec-1',
					status: 'success',
				});

				const suspendFn = vi.fn();
				const tool = createExecutionsTool(context);
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).not.toHaveBeenCalled();
				expect(context.executionService.run).toHaveBeenCalled();
			});

			it('still requires HITL for a different workflow than the one granted', async () => {
				const context = createMockContext({
					permissions: {},
					sessionApprovedToolKeys: new Set(['executions:run:wf-1']),
				});

				const suspendFn = vi.fn();
				const tool = createExecutionsTool(context);
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-2' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).toHaveBeenCalled();
			});

			it('persists a grant when resumed with scope=session', async () => {
				const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
				const context = createMockContext({ permissions: {}, grantSessionToolApproval });
				(context.executionService.run as Mock).mockResolvedValue({
					executionId: 'exec-1',
					status: 'success',
				});

				const tool = createExecutionsTool(context);
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					createAgentCtx({ resumeData: { approved: true, scope: 'session' } }) as never,
				);

				expect(grantSessionToolApproval).toHaveBeenCalledWith('executions:run:wf-1');
				expect(context.executionService.run).toHaveBeenCalled();
			});

			it('does not persist a grant when resumed with a one-time approval', async () => {
				const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
				const context = createMockContext({ permissions: {}, grantSessionToolApproval });
				(context.executionService.run as Mock).mockResolvedValue({
					executionId: 'exec-1',
					status: 'success',
				});

				const tool = createExecutionsTool(context);
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					createAgentCtx({ resumeData: { approved: true } }) as never,
				);

				expect(grantSessionToolApproval).not.toHaveBeenCalled();
			});

			it('honors a grant recorded mid-session for a later run of the same workflow', async () => {
				// Mirrors the service wiring: the grant callback adds to the same set the tool reads,
				// so a workflow approved "always" earlier in the run isn't re-asked later in the run.
				const granted = new Set<string>();
				const context = createMockContext({
					permissions: {},
					sessionApprovedToolKeys: granted,
					grantSessionToolApproval: async (key: string) => {
						await Promise.resolve();
						granted.add(key);
					},
				});
				(context.executionService.run as Mock).mockResolvedValue({
					executionId: 'exec-1',
					status: 'success',
				});
				const tool = createExecutionsTool(context);

				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					createAgentCtx({ resumeData: { approved: true, scope: 'session' } }) as never,
				);
				expect(granted.has('executions:run:wf-1')).toBe(true);

				const suspendFn = vi.fn();
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);
				expect(suspendFn).not.toHaveBeenCalled();
			});
		});

		describe('aiCreatedWorkflowIds scope', () => {
			it('runs without HITL when always_allow + workflow was created by the agent', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					aiCreatedWorkflowIds: new Set(['wf-built']),
				});
				(context.executionService.run as Mock).mockResolvedValue({
					executionId: 'exec-1',
					status: 'success',
				});
				const suspendFn = vi.fn();

				const tool = createExecutionsTool(context);
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-built' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).not.toHaveBeenCalled();
				expect(context.executionService.run).toHaveBeenCalledWith('wf-built', undefined, {
					timeout: undefined,
				});
			});

			it('still requires HITL for a pre-existing workflow the agent did not create', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					aiCreatedWorkflowIds: new Set(['wf-built']),
				});
				(context.workflowService.get as Mock).mockResolvedValue({ name: 'Pre-existing WF' });
				const suspendFn = vi.fn();

				const tool = createExecutionsTool(context);
				const result = await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-preexisting' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).toHaveBeenCalled();
				expect(context.executionService.run).not.toHaveBeenCalled();
				expect(result).toBeUndefined();
			});

			it('requires HITL when always_allow is set but the agent created nothing', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
				});
				(context.workflowService.get as Mock).mockResolvedValue({ name: 'Some WF' });
				const suspendFn = vi.fn();

				const tool = createExecutionsTool(context);
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).toHaveBeenCalled();
				expect(context.executionService.run).not.toHaveBeenCalled();
			});
		});
	});

	// ── debug ───────────────────────────────────────────────────────────────

	// ── run-step ────────────────────────────────────────────────────────────

	describe('run-step action', () => {
		const stepInput = {
			action: 'run-step' as const,
			workflowId: 'wf-1',
			nodeName: 'Send Slack message',
		};

		it('returns denied when the admin blocked workflow runs', async () => {
			const context = createMockContext({ permissions: { runWorkflow: 'blocked' } });

			const tool = createExecutionsTool(context);
			const result = await executeTool(tool, stepInput, createAgentCtx() as never);

			expect(result).toEqual({
				executionId: '',
				status: 'error',
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(context.executionService.runStep).not.toHaveBeenCalled();
		});

		it('reports unavailable when the host did not wire step execution', async () => {
			const context = createMockContext({ permissions: {} });
			delete (context.executionService as { runStep?: unknown }).runStep;

			const tool = createExecutionsTool(context);
			const result = await executeTool(tool, stepInput, createAgentCtx() as never);

			expect(result).toEqual({
				executionId: '',
				status: 'error',
				denied: true,
				reason: 'Running a single node is not available on this instance',
			});
		});

		it('suspends for confirmation naming the node and the workflow', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({ permissions: {} });
			(context.workflowService.get as Mock).mockResolvedValue({ id: 'wf-1', name: 'My Workflow' });

			const tool = createExecutionsTool(context);
			await executeTool(tool, stepInput, createAgentCtx({ suspend: suspendFn }) as never);

			expect(suspendFn).toHaveBeenCalled();
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					message: 'Run the node "Send Slack message" in My Workflow',
					severity: 'warning',
				}),
			);
			expect(context.executionService.runStep).not.toHaveBeenCalled();
		});

		it('returns denied when the user rejects the prompt', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				stepInput,
				createAgentCtx({ resumeData: { approved: false } }) as never,
			);

			expect(result).toEqual({
				executionId: '',
				status: 'error',
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.executionService.runStep).not.toHaveBeenCalled();
		});

		it('passes every input option through once approved', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{
					...stepInput,
					reuseExecutionId: 'exec-9',
					mockInput: [{ text: 'hi' }],
					toolArguments: { title: 'Login fails' },
					versionId: 'v-2',
					timeout: 30_000,
				},
				createAgentCtx({ resumeData: { approved: true } }) as never,
			);

			expect(context.executionService.runStep).toHaveBeenCalledWith(
				'wf-1',
				'Send Slack message',
				expect.objectContaining({
					reuseExecutionId: 'exec-9',
					mockInput: [{ text: 'hi' }],
					toolArguments: { title: 'Login fails' },
					versionId: 'v-2',
					timeout: 30_000,
				}),
			);
		});

		it('accepts a bare string as the tool arguments', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{ ...stepInput, toolArguments: 'Napoleon' },
				createAgentCtx({ resumeData: { approved: true } }) as never,
			);

			// A tool with one free-text input takes the query directly, not wrapped.
			expect(context.executionService.runStep).toHaveBeenCalledWith(
				'wf-1',
				'Send Slack message',
				expect.objectContaining({ toolArguments: 'Napoleon' }),
			);
		});

		it('persists a per-node grant when the user picks "always allow"', async () => {
			const grantSessionToolApproval = vi.fn();
			const context = createMockContext({ permissions: {}, grantSessionToolApproval });

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				stepInput,
				createAgentCtx({ resumeData: { approved: true, scope: 'session' } }) as never,
			);

			expect(grantSessionToolApproval).toHaveBeenCalledWith(
				'executions:run-step:wf-1:Send Slack message',
			);
		});

		it('skips the prompt for a node already granted in this session', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({
				permissions: {},
				sessionApprovedToolKeys: new Set(['executions:run-step:wf-1:Send Slack message']),
			});

			const tool = createExecutionsTool(context);
			await executeTool(tool, stepInput, createAgentCtx({ suspend: suspendFn }) as never);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.executionService.runStep).toHaveBeenCalled();
		});

		it('still prompts for a different node of the same workflow', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({
				permissions: {},
				sessionApprovedToolKeys: new Set(['executions:run-step:wf-1:Other node']),
			});

			const tool = createExecutionsTool(context);
			await executeTool(tool, stepInput, createAgentCtx({ suspend: suspendFn }) as never);

			expect(suspendFn).toHaveBeenCalled();
			expect(context.executionService.runStep).not.toHaveBeenCalled();
		});

		it('accepts a whole-workflow run grant, which is the wider permission', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({
				permissions: {},
				sessionApprovedToolKeys: new Set(['executions:run:wf-1']),
			});

			const tool = createExecutionsTool(context);
			await executeTool(tool, stepInput, createAgentCtx({ suspend: suspendFn }) as never);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.executionService.runStep).toHaveBeenCalled();
		});

		it('skips the prompt for an agent-created workflow under always_allow', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({
				permissions: { runWorkflow: 'always_allow' },
				aiCreatedWorkflowIds: new Set(['wf-1']),
			});

			const tool = createExecutionsTool(context);
			await executeTool(tool, stepInput, createAgentCtx({ suspend: suspendFn }) as never);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.executionService.runStep).toHaveBeenCalled();
		});

		it('prompts for a workflow the agent did not create', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({
				permissions: { runWorkflow: 'always_allow' },
				aiCreatedWorkflowIds: new Set(['wf-other']),
			});

			const tool = createExecutionsTool(context);
			await executeTool(tool, stepInput, createAgentCtx({ suspend: suspendFn }) as never);

			expect(suspendFn).toHaveBeenCalled();
		});
	});

	describe('debug action', () => {
		it('should call executionService.getDebugInfo with execution ID', async () => {
			const debugInfo = {
				executionId: 'exec-fail',
				status: 'error' as const,
				failedNode: {
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					error: 'Connection refused',
				},
				nodeTrace: [
					{
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						status: 'error' as const,
					},
				],
			};
			const context = createMockContext();
			(context.executionService.getDebugInfo as Mock).mockResolvedValue(debugInfo);

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'debug' as const, executionId: 'exec-fail' },
				{} as never,
			);

			expect(context.executionService.getDebugInfo).toHaveBeenCalledWith('exec-fail');
			expect(result).toEqual(debugInfo);
		});
	});

	// ── get-node-output ─────────────────────────────────────────────────────

	describe('get-node-output action', () => {
		it('should call executionService.getNodeOutput with parameters', async () => {
			const nodeOutput = {
				nodeName: 'Set',
				outputs: [{ index: 0, totalItems: 1, items: [{ key: 'value' }] }],
				totalItems: 1,
				returned: { from: 0, to: 0 },
			};
			const context = createMockContext();
			(context.executionService.getNodeOutput as Mock).mockResolvedValue(nodeOutput);

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'get-node-output' as const,
					executionId: 'exec-1',
					nodeName: 'Set',
					startIndex: 0,
					maxItems: 10,
				},
				{} as never,
			);

			expect(context.executionService.getNodeOutput).toHaveBeenCalledWith('exec-1', 'Set', {
				startIndex: 0,
				maxItems: 10,
			});
			expect(result).toEqual(nodeOutput);
		});

		it('should pass undefined options when not provided', async () => {
			const context = createMockContext();
			(context.executionService.getNodeOutput as Mock).mockResolvedValue({
				nodeName: 'Set',
				outputs: [],
				totalItems: 0,
				returned: { from: 0, to: 0 },
			});

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{
					action: 'get-node-output' as const,
					executionId: 'exec-1',
					nodeName: 'Set',
				},
				{} as never,
			);

			expect(context.executionService.getNodeOutput).toHaveBeenCalledWith('exec-1', 'Set', {
				startIndex: undefined,
				maxItems: undefined,
			});
		});
	});

	// ── get-resolved-node-parameters ────────────────────────────────────────

	describe('get-resolved-node-parameters action', () => {
		it('should call executionService.getResolvedNodeParameters with all options', async () => {
			const resolution = {
				nodeName: 'HTTP Request',
				runIndex: 0,
				itemIndex: 0,
				parameters: { url: '=https://example.com/api/{{ $json.id }}' },
				resolved: { url: 'https://example.com/api/123' },
				failedExpressions: [],
				emptyResolutions: [],
			};
			const context = createMockContext();
			(context.executionService.getResolvedNodeParameters as Mock).mockResolvedValue(resolution);

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'get-resolved-node-parameters' as const,
					executionId: 'exec-1',
					nodeName: 'HTTP Request',
					itemIndex: 2,
					runIndex: 1,
				},
				{} as never,
			);

			expect(context.executionService.getResolvedNodeParameters).toHaveBeenCalledWith(
				'exec-1',
				'HTTP Request',
				{ itemIndex: 2, runIndex: 1 },
			);
			expect(result).toEqual(resolution);
		});

		it('should pass undefined options when itemIndex/runIndex are omitted', async () => {
			const context = createMockContext();
			(context.executionService.getResolvedNodeParameters as Mock).mockResolvedValue({
				nodeName: 'Set',
				runIndex: 0,
				itemIndex: 0,
				parameters: {},
				resolved: {},
				failedExpressions: [],
				emptyResolutions: [],
			});

			const tool = createExecutionsTool(context);
			await executeTool(
				tool,
				{
					action: 'get-resolved-node-parameters' as const,
					executionId: 'exec-1',
					nodeName: 'Set',
				},
				{} as never,
			);

			expect(context.executionService.getResolvedNodeParameters).toHaveBeenCalledWith(
				'exec-1',
				'Set',
				{ itemIndex: undefined, runIndex: undefined },
			);
		});

		it('should pass through suppressed responses verbatim', async () => {
			const suppressed = {
				nodeName: 'HTTP Request',
				runIndex: 0,
				itemIndex: 0,
				parameters: null,
				resolved: null,
				failedExpressions: [],
				emptyResolutions: [],
				suppressed: 'parameter-values-disabled',
			};
			const context = createMockContext();
			(context.executionService.getResolvedNodeParameters as Mock).mockResolvedValue(suppressed);

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'get-resolved-node-parameters' as const,
					executionId: 'exec-1',
					nodeName: 'HTTP Request',
				},
				{} as never,
			);

			expect(result).toEqual(suppressed);
		});
	});

	// ── stop ────────────────────────────────────────────────────────────────

	describe('stop action', () => {
		it('should call executionService.stop with execution ID', async () => {
			const stopResult = { success: true, message: 'Execution cancelled' };
			const context = createMockContext();
			(context.executionService.stop as Mock).mockResolvedValue(stopResult);

			const tool = createExecutionsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'stop' as const, executionId: 'exec-running' },
				{} as never,
			);

			expect(context.executionService.stop).toHaveBeenCalledWith('exec-running');
			expect(result).toEqual(stopResult);
		});
	});
});
