import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { User, WorkflowRepository } from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import type { IRun } from 'n8n-workflow';
import { createEmptyRunExecutionData, ManualExecutionCancelledError } from 'n8n-workflow';

import { McpService } from '../mcp.service';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

describe('McpService', () => {
	let mcpService: McpService;
	let activeExecutions: ActiveExecutions;
	let executionsConfig: ExecutionsConfig;
	let instanceSettings: InstanceSettings;
	let logger: Logger;

	beforeEach(() => {
		activeExecutions = mockInstance(ActiveExecutions);
		executionsConfig = mockInstance(ExecutionsConfig, {
			mode: 'regular',
		});
		instanceSettings = mockInstance(InstanceSettings, {
			hostId: 'test-host-id',
		});
		logger = mockLogger();

		mcpService = new McpService(
			logger,
			executionsConfig,
			instanceSettings,
			mockInstance(WorkflowFinderService),
			mockInstance(WorkflowRepository),
			mockInstance(WorkflowService),
			mockInstance(UrlService),
			mockInstance(CredentialsService),
			activeExecutions,
			mockInstance(GlobalConfig, {
				endpoints: { webhook: '/webhook', webhookTest: '/webhook-test' },
			}),
			mockInstance(Telemetry),
			mockInstance(WorkflowRunner),
			mockInstance(RoleService),
			mockInstance(ProjectService),
		);
	});

	describe('Queue Mode Detection', () => {
		it('should return false for isQueueMode when mode is regular', () => {
			expect(mcpService.isQueueMode).toBe(false);
		});

		it('should return true for isQueueMode when mode is queue', () => {
			// Create a new service with queue mode enabled
			const queueExecutionsConfig = mockInstance(ExecutionsConfig, {
				mode: 'queue',
			});

			const queueMcpService = new McpService(
				mockLogger(),
				queueExecutionsConfig,
				instanceSettings,
				mockInstance(WorkflowFinderService),
				mockInstance(WorkflowRepository),
				mockInstance(WorkflowService),
				mockInstance(UrlService),
				mockInstance(CredentialsService),
				activeExecutions,
				mockInstance(GlobalConfig, {
					endpoints: { webhook: '/webhook', webhookTest: '/webhook-test' },
				}),
				mockInstance(Telemetry),
				mockInstance(WorkflowRunner),
				mockInstance(RoleService),
				mockInstance(ProjectService),
			);

			expect(queueMcpService.isQueueMode).toBe(true);
		});
	});

	describe('Pending Response Management', () => {
		describe('createPendingResponse', () => {
			it('should create a pending response with a deferred promise', () => {
				const executionId = 'exec-123';
				const deferred = mcpService.createPendingResponse(executionId);

				expect(deferred).toBeDefined();
				expect(deferred.promise).toBeInstanceOf(Promise);
				expect(deferred.resolve).toBeInstanceOf(Function);
				expect(deferred.reject).toBeInstanceOf(Function);
				expect(mcpService.pendingExecutionCount).toBe(1);
			});

			it('should track multiple pending responses', () => {
				mcpService.createPendingResponse('exec-1');
				mcpService.createPendingResponse('exec-2');
				mcpService.createPendingResponse('exec-3');

				expect(mcpService.pendingExecutionCount).toBe(3);
			});
		});

		describe('handleWorkerResponse', () => {
			it('should resolve pending promise with run data', async () => {
				const executionId = 'exec-456';
				const deferred = mcpService.createPendingResponse(executionId);

				const runData: IRun = {
					status: 'success',
					mode: 'trigger',
					startedAt: new Date(),
					finished: true,
					storedAt: 'db',
					data: createEmptyRunExecutionData(),
				};

				mcpService.handleWorkerResponse(executionId, runData);

				const result = await deferred.promise;
				expect(result).toBe(runData);
				expect(mcpService.pendingExecutionCount).toBe(0);
			});

			it('should resolve pending promise with undefined for failed execution', async () => {
				const executionId = 'exec-789';
				const deferred = mcpService.createPendingResponse(executionId);

				mcpService.handleWorkerResponse(executionId, undefined);

				const result = await deferred.promise;
				expect(result).toBeUndefined();
				expect(mcpService.pendingExecutionCount).toBe(0);
			});

			it('should ignore responses for unknown executions and log warning', () => {
				// Should not throw
				mcpService.handleWorkerResponse('unknown-exec', undefined);
				expect(mcpService.pendingExecutionCount).toBe(0);
				expect(logger.warn).toHaveBeenCalledWith('Received MCP response for unknown execution', {
					executionId: 'unknown-exec',
				});
			});
		});

		describe('removePendingResponse', () => {
			it('should remove a pending response and log debug message', () => {
				const executionId = 'exec-remove';
				mcpService.createPendingResponse(executionId);
				expect(mcpService.pendingExecutionCount).toBe(1);

				mcpService.removePendingResponse(executionId);
				expect(mcpService.pendingExecutionCount).toBe(0);
				expect(logger.debug).toHaveBeenCalledWith('Removed pending MCP response', { executionId });
			});

			it('should handle removing non-existent response gracefully without logging', () => {
				// Should not throw
				mcpService.removePendingResponse('non-existent');
				expect(mcpService.pendingExecutionCount).toBe(0);
				// Should not log debug for non-existent response
				expect(logger.debug).not.toHaveBeenCalledWith(
					'Removed pending MCP response',
					expect.anything(),
				);
			});
		});

		describe('cancelPendingExecution', () => {
			it('should reject pending promise with cancellation error', async () => {
				const executionId = 'exec-cancel';
				const deferred = mcpService.createPendingResponse(executionId);

				// Attach error handler before cancelling to prevent unhandled rejection
				const errorPromise = deferred.promise.catch((error) => error);

				mcpService.cancelPendingExecution(executionId, 'User cancelled');

				const error = await errorPromise;
				expect(error).toBeInstanceOf(ManualExecutionCancelledError);
				expect(mcpService.pendingExecutionCount).toBe(0);
			});

			it('should attempt to stop active execution', async () => {
				const executionId = 'exec-active';
				const deferred = mcpService.createPendingResponse(executionId);
				(activeExecutions.has as jest.Mock).mockReturnValue(true);

				// Attach error handler to prevent unhandled rejection
				deferred.promise.catch(() => {});

				mcpService.cancelPendingExecution(executionId);

				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(
					executionId,
					expect.any(ManualExecutionCancelledError),
				);
			});

			it('should handle cancelling non-existent execution gracefully', () => {
				// Should not throw
				mcpService.cancelPendingExecution('non-existent');
			});
		});

		describe('cancelAllPendingExecutions', () => {
			it('should cancel all pending executions', async () => {
				const deferred1 = mcpService.createPendingResponse('exec-1');
				const deferred2 = mcpService.createPendingResponse('exec-2');
				const deferred3 = mcpService.createPendingResponse('exec-3');

				// Attach error handlers before cancelling to prevent unhandled rejections
				const errorPromise1 = deferred1.promise.catch((error) => error);
				const errorPromise2 = deferred2.promise.catch((error) => error);
				const errorPromise3 = deferred3.promise.catch((error) => error);

				expect(mcpService.pendingExecutionCount).toBe(3);

				mcpService.cancelAllPendingExecutions('Shutdown');

				expect(mcpService.pendingExecutionCount).toBe(0);

				const error1 = await errorPromise1;
				const error2 = await errorPromise2;
				const error3 = await errorPromise3;

				expect(error1).toBeInstanceOf(ManualExecutionCancelledError);
				expect(error2).toBeInstanceOf(ManualExecutionCancelledError);
				expect(error3).toBeInstanceOf(ManualExecutionCancelledError);
			});
		});
	});

	describe('getServer', () => {
		it('should create MCP server with registered tools', async () => {
			const user = Object.assign(new User(), { id: 'user-1' });

			const server = await mcpService.getServer(user);

			expect(server).toBeDefined();
			// Verify server has expected MCP server methods
			expect(typeof server.connect).toBe('function');
			expect(typeof server.close).toBe('function');
			expect(typeof server.registerTool).toBe('function');
		});
	});
});
