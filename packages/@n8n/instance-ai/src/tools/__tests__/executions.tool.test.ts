import type { InstanceAiPermissions } from '@n8n/api-types';

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
		workflowService: {} as never,
		executionService: {
			list: jest.fn(),
			getStatus: jest.fn(),
			run: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {} as never,
		nodeService: {} as never,
		dataTableService: {} as never,
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function createAgentCtx(opts: { resumeData?: unknown; suspend?: jest.Mock } = {}) {
	return {
		agent: {
			resumeData: opts.resumeData,
			suspend: opts.suspend ?? jest.fn(),
		},
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
			(context.executionService.list as jest.Mock).mockResolvedValue(executions);

			const tool = createExecutionsTool(context);
			const result = await tool.execute!({ action: 'list' as const }, {} as never);

			expect(context.executionService.list).toHaveBeenCalledWith({
				workflowId: undefined,
				status: undefined,
				limit: undefined,
			});
			expect(result).toEqual({ executions });
		});

		it('should pass filters to executionService.list', async () => {
			const context = createMockContext();
			(context.executionService.list as jest.Mock).mockResolvedValue([]);

			const tool = createExecutionsTool(context);
			await tool.execute!(
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
			(context.executionService.getStatus as jest.Mock).mockResolvedValue(executionStatus);

			const tool = createExecutionsTool(context);
			const result = await tool.execute!(
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
			const result = await tool.execute!(
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

		it('should suspend for confirmation when approval is needed (default permission)', async () => {
			const suspendFn = jest.fn();
			const context = createMockContext({
				permissions: {},
			});

			const tool = createExecutionsTool(context);
			await tool.execute!(
				{
					action: 'run' as const,
					workflowId: 'wf-1',
					workflowName: 'My Workflow',
				},
				createAgentCtx({ suspend: suspendFn }) as never,
			);

			expect(suspendFn).toHaveBeenCalled();
			const suspendPayload = suspendFn.mock.calls[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					message: expect.stringContaining('My Workflow'),
					severity: 'warning',
					requestId: expect.any(String),
				}),
			);
		});

		it('should use workflowId in message when workflowName is not provided', async () => {
			const suspendFn = jest.fn();
			const context = createMockContext({ permissions: {} });

			const tool = createExecutionsTool(context);
			await tool.execute!(
				{ action: 'run' as const, workflowId: 'wf-42' },
				createAgentCtx({ suspend: suspendFn }) as never,
			);

			expect(suspendFn).toHaveBeenCalled();
			const suspendPayload = suspendFn.mock.calls[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					message: expect.stringContaining('wf-42'),
				}),
			);
		});

		it('should return denied when resumed with approval=false', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createExecutionsTool(context);
			const result = await tool.execute!(
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
			(context.executionService.run as jest.Mock).mockResolvedValue(executionResult);

			const tool = createExecutionsTool(context);
			const result = await tool.execute!(
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

		it('should execute immediately when permission is always_allow', async () => {
			const executionResult: ExecutionResult = {
				executionId: 'exec-456',
				status: 'success',
			};
			const context = createMockContext({
				permissions: { runWorkflow: 'always_allow' },
			});
			(context.executionService.run as jest.Mock).mockResolvedValue(executionResult);

			const suspendFn = jest.fn();
			const tool = createExecutionsTool(context);
			const result = await tool.execute!(
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
			});
			(context.executionService.run as jest.Mock).mockResolvedValue({
				executionId: 'exec-1',
				status: 'success',
			});

			const tool = createExecutionsTool(context);
			await tool.execute!(
				{ action: 'run' as const, workflowId: 'wf-1' },
				createAgentCtx() as never,
			);

			expect(context.executionService.run).toHaveBeenCalledWith('wf-1', undefined, {
				timeout: undefined,
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
			(context.executionService.getDebugInfo as jest.Mock).mockResolvedValue(debugInfo);

			const tool = createExecutionsTool(context);
			const result = await tool.execute!(
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
			(context.executionService.getNodeOutput as jest.Mock).mockResolvedValue(nodeOutput);

			const tool = createExecutionsTool(context);
			const result = await tool.execute!(
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
			(context.executionService.getNodeOutput as jest.Mock).mockResolvedValue({
				nodeName: 'Set',
				items: [],
				totalItems: 0,
				returned: { from: 0, to: 0 },
			});

			const tool = createExecutionsTool(context);
			await tool.execute!(
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

	// ── stop ────────────────────────────────────────────────────────────────

	describe('stop action', () => {
		it('should call executionService.stop with execution ID', async () => {
			const stopResult = { success: true, message: 'Execution cancelled' };
			const context = createMockContext();
			(context.executionService.stop as jest.Mock).mockResolvedValue(stopResult);

			const tool = createExecutionsTool(context);
			const result = await tool.execute!(
				{ action: 'stop' as const, executionId: 'exec-running' },
				{} as never,
			);

			expect(context.executionService.stop).toHaveBeenCalledWith('exec-running');
			expect(result).toEqual(stopResult);
		});
	});
});
