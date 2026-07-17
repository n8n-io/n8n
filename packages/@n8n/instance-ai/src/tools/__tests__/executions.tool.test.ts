import type { InstanceAiPermissions } from '@n8n/api-types';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, ExecutionResult } from '../../types';
import { createExecutionsTool } from '../executions.tool';

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
			list: vi.fn().mockResolvedValue([]),
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
		},
		credentialService: {} as never,
		nodeService: {} as never,
		dataTableService: {} as never,
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
					message: 'Execute My Workflow (ID: wf-1)',
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
					message: 'Execute wf-42 (ID: wf-42)',
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

			it('admin requireRunWorkflowApproval overrides the session grant', async () => {
				const context = createMockContext({
					permissions: {},
					sessionApprovedToolKeys: new Set(['executions:run:wf-1']),
					requireRunWorkflowApproval: true,
				});

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

		describe('allowedRunWorkflowIds scope', () => {
			it('runs without HITL when always_allow + workflow id is in the allow-list', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					allowedRunWorkflowIds: new Set(['wf-1']),
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
				expect(context.executionService.run).toHaveBeenCalledWith('wf-1', undefined, {
					timeout: undefined,
				});
			});

			it('still requires HITL approval when always_allow is set but workflow id is NOT in the allow-list', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					allowedRunWorkflowIds: new Set(['wf-other']),
				});
				(context.workflowService.get as Mock).mockResolvedValue({ name: 'Off-scope WF' });
				const suspendFn = vi.fn();

				const tool = createExecutionsTool(context);
				const result = await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).toHaveBeenCalled();
				expect(context.executionService.run).not.toHaveBeenCalled();
				expect(result).toBeUndefined();
			});

			it('runs without HITL when always_allow + workflow name is in the allow-list', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					allowedRunWorkflowIds: new Set(['wf-recorded']),
					allowedRunWorkflowNames: new Set(['Replay Created WF']),
				});
				(context.workflowService.get as Mock).mockResolvedValue({ name: 'Replay Created WF' });
				(context.executionService.run as Mock).mockResolvedValue({
					executionId: 'exec-1',
					status: 'success',
				});
				const suspendFn = vi.fn();

				const tool = createExecutionsTool(context);
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-replayed' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).not.toHaveBeenCalled();
				expect(context.executionService.run).toHaveBeenCalledWith('wf-replayed', undefined, {
					timeout: undefined,
				});
			});

			it('matches workflow-name allow-list case-insensitively', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					allowedRunWorkflowIds: new Set(['wf-recorded']),
					allowedRunWorkflowNames: new Set(['full execution test']),
				});
				(context.workflowService.get as Mock).mockResolvedValue({
					name: 'Full Execution Test',
				});
				(context.executionService.run as Mock).mockResolvedValue({
					executionId: 'exec-1',
					status: 'success',
				});
				const suspendFn = vi.fn();

				const tool = createExecutionsTool(context);
				await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-replayed' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).not.toHaveBeenCalled();
				expect(context.executionService.run).toHaveBeenCalledWith('wf-replayed', undefined, {
					timeout: undefined,
				});
			});

			it('runs the current replay workflow by name when the recorded workflow id no longer resolves', async () => {
				const originalE2ETests = process.env.E2E_TESTS;
				process.env.E2E_TESTS = 'true';

				try {
					const context = createMockContext({
						permissions: { runWorkflow: 'always_allow' },
						allowedRunWorkflowIds: new Set(['wf-recorded']),
						allowedRunWorkflowNames: new Set(['Replay Created WF']),
					});
					(context.workflowService.get as Mock).mockRejectedValue(new Error('not found'));
					(context.workflowService.list as Mock).mockResolvedValue([
						{ id: 'wf-current', name: 'Replay Created WF' },
					]);
					(context.executionService.run as Mock).mockResolvedValue({
						executionId: 'exec-1',
						status: 'success',
					});
					const suspendFn = vi.fn();

					const tool = createExecutionsTool(context);
					await executeTool(
						tool,
						{ action: 'run' as const, workflowId: 'wf-recorded' },
						createAgentCtx({ suspend: suspendFn }) as never,
					);

					expect(context.workflowService.list).toHaveBeenCalledWith({
						query: 'Replay Created WF',
						limit: 10,
					});
					expect(suspendFn).not.toHaveBeenCalled();
					expect(context.executionService.run).toHaveBeenCalledWith('wf-current', undefined, {
						timeout: undefined,
					});
				} finally {
					if (originalE2ETests === undefined) {
						delete process.env.E2E_TESTS;
					} else {
						process.env.E2E_TESTS = originalE2ETests;
					}
				}
			});

			it('still requires HITL when neither workflow id nor name is in the allow-list', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					allowedRunWorkflowIds: new Set(['wf-recorded']),
					allowedRunWorkflowNames: new Set(['Allowed WF']),
				});
				(context.workflowService.get as Mock).mockResolvedValue({ name: 'Other WF' });
				const suspendFn = vi.fn();

				const tool = createExecutionsTool(context);
				const result = await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-replayed' },
					createAgentCtx({ suspend: suspendFn }) as never,
				);

				expect(suspendFn).toHaveBeenCalled();
				expect(context.executionService.run).not.toHaveBeenCalled();
				expect(result).toBeUndefined();
			});

			it('requires HITL when a checkpoint run represents an explicit user-requested execution', async () => {
				const context = createMockContext({
					permissions: { runWorkflow: 'always_allow' },
					allowedRunWorkflowIds: new Set(['wf-1']),
					requireRunWorkflowApproval: true,
				});
				const agentCtx = createAgentCtx();

				const tool = createExecutionsTool(context);
				const result = await executeTool(
					tool,
					{ action: 'run' as const, workflowId: 'wf-1' },
					agentCtx as never,
				);

				expect(agentCtx.suspend).toHaveBeenCalled();
				expect(context.executionService.run).not.toHaveBeenCalled();
				expect(result).toBeUndefined();
			});
		});

		describe('aiCreatedWorkflowIds scope (no explicit allow-list)', () => {
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
				items: [{ key: 'value' }],
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
				items: [],
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
