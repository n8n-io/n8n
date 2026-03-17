import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { IRunExecutionData, WorkflowExecuteMode } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import type {
	ExecutionRedactionOptions,
	RedactableExecution,
} from '@/executions/execution-redaction';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ExecutionRedactionService } from '../execution-redaction.service';
import { FullItemRedactionStrategy } from '../strategies/full-item-redaction.strategy';
import { NodeDefinedFieldRedactionStrategy } from '../strategies/node-defined-field-redaction.strategy';

describe('ExecutionRedactionService', () => {
	const logger = mockInstance(Logger);
	const workflowFinderService = mockInstance(WorkflowFinderService);
	const eventService = mock<EventService>();
	const fullItemRedactionStrategy = mockInstance(FullItemRedactionStrategy);
	const nodeDefinedFieldRedactionStrategy = mockInstance(NodeDefinedFieldRedactionStrategy);

	let service: ExecutionRedactionService;

	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		role: 'global:owner',
	} as unknown as User;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new ExecutionRedactionService(
			logger,
			workflowFinderService,
			eventService,
			fullItemRedactionStrategy,
			nodeDefinedFieldRedactionStrategy,
		);
		// Default: user lacks execution:reveal scope
		workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());
		fullItemRedactionStrategy.apply.mockResolvedValue(undefined);
		nodeDefinedFieldRedactionStrategy.apply.mockResolvedValue(undefined);
	});

	const makeExecution = (
		overrides: {
			mode?: WorkflowExecuteMode;
			workflowId?: string;
			policy?: 'none' | 'all' | 'non-manual';
			workflowSettingsPolicy?: 'none' | 'all' | 'non-manual';
			withRuntimeData?: boolean;
		} = {},
	): RedactableExecution => {
		const {
			mode = 'manual',
			workflowId = 'workflow-123',
			policy,
			workflowSettingsPolicy,
			withRuntimeData = true,
		} = overrides;

		const executionData: IRunExecutionData['executionData'] = {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: null,
		};

		if (withRuntimeData && policy !== undefined) {
			executionData.runtimeData = {
				version: 1 as const,
				establishedAt: Date.now(),
				source: mode,
				redaction: { version: 1 as const, policy },
			};
		}

		return {
			id: 'execution-123',
			mode,
			workflowId,
			data: {
				version: 1,
				resultData: { runData: {} },
				executionData,
			},
			workflowData: {
				settings: workflowSettingsPolicy ? { redactionPolicy: workflowSettingsPolicy } : {},
				nodes: [],
			},
		} as unknown as RedactableExecution;
	};

	describe('processExecution (single-item wrapper)', () => {
		it('delegates to processExecutions and returns the same execution', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			const options: ExecutionRedactionOptions = { user: mockUser };

			const spy = jest.spyOn(service, 'processExecutions');
			const result = await service.processExecution(execution, options);

			expect(spy).toHaveBeenCalledWith([execution], options);
			expect(result).toBe(execution);
		});
	});

	describe('processExecutions (batch)', () => {
		it('does nothing for an empty array', async () => {
			const options: ExecutionRedactionOptions = { user: mockUser };
			await service.processExecutions([], options);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('uses a single DB query for N executions (policy-driven)', async () => {
			const executions = [
				makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-1' }),
				makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-2' }),
				makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-1' }),
			];
			const options: ExecutionRedactionOptions = { user: mockUser };

			await service.processExecutions(executions, options);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledTimes(1);
			const [calledIds] = workflowFinderService.findWorkflowIdsWithScopeForUser.mock.calls[0];
			expect(new Set(calledIds)).toEqual(new Set(['wf-1', 'wf-2']));
		});

		it('does not call DB when all executions pass policyAllowsReveal (policy=none)', async () => {
			const executions = [
				makeExecution({ policy: 'none', mode: 'trigger' }),
				makeExecution({ policy: 'none', mode: 'manual' }),
			];
			const options: ExecutionRedactionOptions = { user: mockUser };

			await service.processExecutions(executions, options);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('calls FullItemRedactionStrategy only for executions needing redaction in a mixed list', async () => {
			const noneExecution = makeExecution({
				policy: 'none',
				mode: 'trigger',
				workflowId: 'wf-none',
			});
			const allExecution = makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-all' });
			const nonManualManual = makeExecution({
				policy: 'non-manual',
				mode: 'manual',
				workflowId: 'wf-nm',
			});
			const nonManualTrigger = makeExecution({
				policy: 'non-manual',
				mode: 'trigger',
				workflowId: 'wf-nm',
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			await service.processExecutions(
				[noneExecution, allExecution, nonManualManual, nonManualTrigger],
				options,
			);

			// Only wf-all and wf-nm needed DB check
			const [calledIds] = workflowFinderService.findWorkflowIdsWithScopeForUser.mock.calls[0];
			expect(new Set(calledIds)).toEqual(new Set(['wf-all', 'wf-nm']));

			// FullItemRedactionStrategy called only for allExecution and nonManualTrigger
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(2);
			// NodeDefinedFieldRedactionStrategy called for all 4
			expect(nodeDefinedFieldRedactionStrategy.apply).toHaveBeenCalledTimes(4);
		});

		it('uses a single DB query for N executions when redactExecutionData === true', async () => {
			const executions = [
				makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-1' }),
				makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-2' }),
			];
			const options: ExecutionRedactionOptions = { user: mockUser, redactExecutionData: true };

			await service.processExecutions(executions, options);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledTimes(1);
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(2);
		});
	});

	describe('keepOriginal mode', () => {
		it('clones only executions that need redaction, preserving original references for others', async () => {
			const noneExecution = makeExecution({
				policy: 'none',
				mode: 'trigger',
				workflowId: 'wf-none',
			});
			const allExecution = makeExecution({
				policy: 'all',
				mode: 'trigger',
				workflowId: 'wf-all',
			});
			const nonManualManual = makeExecution({
				policy: 'non-manual',
				mode: 'manual',
				workflowId: 'wf-nm',
			});

			// FullItemRedactionStrategy.requiresRedaction always returns true when in the pipeline
			fullItemRedactionStrategy.requiresRedaction.mockReturnValue(true);
			// NodeDefinedFieldRedactionStrategy.requiresRedaction returns false (no sensitive fields)
			nodeDefinedFieldRedactionStrategy.requiresRedaction.mockReturnValue(false);

			const executions = [noneExecution, allExecution, nonManualManual];
			const options: ExecutionRedactionOptions = { user: mockUser, keepOriginal: true };

			await service.processExecutions(executions, options);

			// policy=none → FullItemRedaction not in pipeline → no requiresRedaction=true → same reference
			expect(executions[0]).toBe(noneExecution);

			// policy=all → FullItemRedaction in pipeline → requiresRedaction=true → cloned
			expect(executions[1]).not.toBe(allExecution);

			// policy=non-manual + mode=manual → FullItemRedaction not in pipeline → same reference
			expect(executions[2]).toBe(nonManualManual);
		});
	});

	describe('FullItemRedactionStrategy inclusion', () => {
		it('is included when redactExecutionData === true (regardless of policy)', async () => {
			const execution = makeExecution({ policy: 'none', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser, redactExecutionData: true });
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('is included when policy is "all" and mode is manual', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'manual' });
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('is included when policy is "all" and mode is trigger', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('is included when policy is "non-manual" and mode is trigger', async () => {
			const execution = makeExecution({ policy: 'non-manual', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('is included when policy is "non-manual" and mode is webhook', async () => {
			const execution = makeExecution({ policy: 'non-manual', mode: 'webhook' });
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('is NOT included when policy is "none"', async () => {
			const execution = makeExecution({ policy: 'none', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});

		it('is NOT included when policy is "non-manual" and mode is manual', async () => {
			const execution = makeExecution({ policy: 'non-manual', mode: 'manual' });
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});

		it('is NOT included on reveal path (redactExecutionData === false)', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser, redactExecutionData: false });
			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});
	});

	describe('NodeDefinedFieldRedactionStrategy inclusion', () => {
		it('is always included when redacting', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });
			expect(nodeDefinedFieldRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('is included even when policy is "none" (no item clearing)', async () => {
			const execution = makeExecution({ policy: 'none', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });
			expect(nodeDefinedFieldRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('is included on reveal path (redactExecutionData === false)', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser, redactExecutionData: false });
			expect(nodeDefinedFieldRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});
	});

	describe('strategy ordering', () => {
		it('runs FullItemRedactionStrategy before NodeDefinedFieldRedactionStrategy', async () => {
			const callOrder: string[] = [];
			fullItemRedactionStrategy.apply.mockImplementation(async () => {
				callOrder.push('full');
			});
			nodeDefinedFieldRedactionStrategy.apply.mockImplementation(async () => {
				callOrder.push('node-defined');
			});

			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });

			expect(callOrder).toEqual(['full', 'node-defined']);
		});
	});

	describe('context passed to strategies', () => {
		it('passes redactExecutionData from options', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser, redactExecutionData: true });

			const [, context] = fullItemRedactionStrategy.apply.mock.calls[0];
			expect(context.redactExecutionData).toBe(true);
		});

		it('passes userCanReveal: true when user has permission', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });

			const [, context] = fullItemRedactionStrategy.apply.mock.calls[0];
			expect(context.userCanReveal).toBe(true);
		});

		it('passes userCanReveal: false when user lacks permission', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });

			const [, context] = fullItemRedactionStrategy.apply.mock.calls[0];
			expect(context.userCanReveal).toBe(false);
		});

		it('passes userCanReveal: true when policyAllowsReveal (policy=none)', async () => {
			const execution = makeExecution({ policy: 'none', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });

			const [, context] = nodeDefinedFieldRedactionStrategy.apply.mock.calls[0];
			expect(context.userCanReveal).toBe(true);
		});

		it('passes userCanReveal: true when policyAllowsReveal (policy=non-manual, mode=manual)', async () => {
			const execution = makeExecution({ policy: 'non-manual', mode: 'manual' });
			await service.processExecution(execution, { user: mockUser });

			const [, context] = nodeDefinedFieldRedactionStrategy.apply.mock.calls[0];
			expect(context.userCanReveal).toBe(true);
		});
	});

	describe('reveal path (redactExecutionData === false)', () => {
		it('throws ForbiddenError when neither policy nor user allows reveal', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await expect(
				service.processExecution(execution, { user: mockUser, redactExecutionData: false }),
			).rejects.toThrow(ForbiddenError);
		});

		it('does not throw when policy allows reveal (policy=none)', async () => {
			const execution = makeExecution({ policy: 'none', mode: 'trigger' });
			await expect(
				service.processExecution(execution, { user: mockUser, redactExecutionData: false }),
			).resolves.toBeDefined();
		});

		it('does not throw when policy allows reveal (policy=non-manual, mode=manual)', async () => {
			const execution = makeExecution({ policy: 'non-manual', mode: 'manual' });
			await expect(
				service.processExecution(execution, { user: mockUser, redactExecutionData: false }),
			).resolves.toBeDefined();
		});

		it('does not throw when user has reveal permission', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await expect(
				service.processExecution(execution, { user: mockUser, redactExecutionData: false }),
			).resolves.toBeDefined();
		});

		it('emits execution-data-revealed when user is allowed to reveal', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });

			await service.processExecution(execution, {
				user: mockUser,
				redactExecutionData: false,
				ipAddress: '1.2.3.4',
				userAgent: 'TestAgent/1.0',
			});

			expect(eventService.emit).toHaveBeenCalledWith('execution-data-revealed', {
				user: mockUser,
				executionId: execution.id,
				workflowId: execution.workflowId,
				ipAddress: '1.2.3.4',
				userAgent: 'TestAgent/1.0',
				redactionPolicy: 'all',
			});
		});

		it('emits execution-data-reveal-failure when user is forbidden', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });

			await expect(
				service.processExecution(execution, {
					user: mockUser,
					redactExecutionData: false,
					ipAddress: '1.2.3.4',
					userAgent: 'TestAgent/1.0',
				}),
			).rejects.toThrow(ForbiddenError);

			expect(eventService.emit).toHaveBeenCalledWith('execution-data-reveal-failure', {
				user: mockUser,
				executionId: execution.id,
				workflowId: execution.workflowId,
				ipAddress: '1.2.3.4',
				userAgent: 'TestAgent/1.0',
				redactionPolicy: 'all',
				rejectionReason: 'User lacks execution:reveal scope for this workflow',
			});
			expect(eventService.emit).not.toHaveBeenCalledWith(
				'execution-data-revealed',
				expect.anything(),
			);
		});

		it('does not call DB and does not throw when all executions pass policyAllowsReveal', async () => {
			const executions = [
				makeExecution({ policy: 'none', mode: 'trigger' }),
				makeExecution({ policy: 'non-manual', mode: 'manual' }),
			];
			const options: ExecutionRedactionOptions = { user: mockUser, redactExecutionData: false };

			await expect(service.processExecutions(executions, options)).resolves.toBeUndefined();
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('throws ForbiddenError if any execution in batch is not allowed and emits reveal-failure event', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));

			const executions = [
				makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-1' }),
				makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-2' }),
			];
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
				ipAddress: '1.2.3.4',
				userAgent: 'TestAgent/1.0',
			};

			await expect(service.processExecutions(executions, options)).rejects.toThrow(ForbiddenError);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledTimes(1);

			expect(eventService.emit).toHaveBeenCalledWith('execution-data-reveal-failure', {
				user: mockUser,
				executionId: executions[1].id,
				workflowId: 'wf-2',
				ipAddress: '1.2.3.4',
				userAgent: 'TestAgent/1.0',
				redactionPolicy: 'all',
				rejectionReason: 'User lacks execution:reveal scope for this workflow',
			});
		});
	});

	describe('DB call optimisation', () => {
		it('does not call findWorkflowIdsWithScopeForUser when policyAllowsReveal (policy=none)', async () => {
			const execution = makeExecution({ policy: 'none', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('does not call findWorkflowIdsWithScopeForUser when policyAllowsReveal (policy=non-manual, mode=manual)', async () => {
			const execution = makeExecution({ policy: 'non-manual', mode: 'manual' });
			await service.processExecution(execution, { user: mockUser });
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('calls findWorkflowIdsWithScopeForUser once when policy does not inherently allow reveal', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledTimes(1);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
				['workflow-123'],
				mockUser,
				['execution:reveal'],
			);
		});
	});

	describe('policy resolution precedence', () => {
		it('prefers runtimeData policy over workflow settings (runtime=none overrides settings=all)', async () => {
			const execution = makeExecution({
				policy: 'none',
				workflowSettingsPolicy: 'all',
				mode: 'trigger',
			});
			await service.processExecution(execution, { user: mockUser });
			// runtimeData policy=none → no item clearing despite workflow settings=all
			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});

		it('falls back to workflow settings when runtimeData is missing', async () => {
			const execution = makeExecution({
				withRuntimeData: false,
				workflowSettingsPolicy: 'all',
				mode: 'trigger',
			});
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('defaults to none when both runtimeData and workflow settings are missing', async () => {
			const execution = makeExecution({ withRuntimeData: false, mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});
	});
});
