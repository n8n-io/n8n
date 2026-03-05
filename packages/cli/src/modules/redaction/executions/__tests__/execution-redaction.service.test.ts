import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type {
	ExecutionError,
	ExecutionStatus,
	INode,
	IRunExecutionData,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { ExpressionError, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import type {
	ExecutionRedactionOptions,
	RedactableExecution,
} from '@/executions/execution-redaction';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ExecutionRedactionService } from '../execution-redaction.service';

describe('ExecutionRedactionService', () => {
	const logger = mockInstance(Logger);
	const workflowFinderService = mockInstance(WorkflowFinderService);
	const eventService = mock<EventService>();
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
		service = new ExecutionRedactionService(logger, workflowFinderService, eventService);
		// Default: user lacks execution:reveal scope → canReveal: false
		workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());
	});

	const createMockExecution = (
		overrides: {
			mode?: WorkflowExecuteMode;
			workflowId?: string;
			policy?: 'none' | 'all' | 'non-manual';
			workflowSettingsPolicy?: 'none' | 'all' | 'non-manual';
			withRuntimeData?: boolean;
			withRunData?: boolean;
		} = {},
	): RedactableExecution => {
		const {
			mode = 'manual',
			workflowId = 'workflow-123',
			policy,
			workflowSettingsPolicy,
			withRuntimeData = true,
			withRunData = false,
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

		const runData = withRunData
			? {
					TestNode: [
						{
							startTime: 0,
							executionTime: 100,
							executionStatus: 'success' as ExecutionStatus,
							data: {
								main: [
									[
										{
											json: { secret: 'sensitive-data' },
											binary: { file: { mimeType: 'text/plain', data: 'abc' } },
										},
									],
								],
							},
							source: [],
						},
					],
				}
			: {};

		return {
			id: 'execution-123',
			mode,
			workflowId,
			data: {
				version: 1,
				resultData: { runData },
				executionData,
			},
			workflowData: {
				settings: workflowSettingsPolicy ? { redactionPolicy: workflowSettingsPolicy } : {},
			},
		} as unknown as RedactableExecution;
	};

	describe('processExecution (single-item wrapper)', () => {
		it('should delegate to processExecutions and return the same execution', async () => {
			const execution = createMockExecution({ policy: 'all', mode: 'trigger', withRunData: true });
			const options: ExecutionRedactionOptions = { user: mockUser };

			const spy = jest.spyOn(service, 'processExecutions');
			const result = await service.processExecution(execution, options);

			expect(spy).toHaveBeenCalledWith([execution], options);
			expect(result).toBe(execution);
		});
	});

	describe('processExecutions (batch)', () => {
		it('should do nothing for an empty array', async () => {
			const options: ExecutionRedactionOptions = { user: mockUser };
			await service.processExecutions([], options);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('should use a single DB query for N executions (policy-driven)', async () => {
			const executions = [
				createMockExecution({
					policy: 'all',
					mode: 'trigger',
					workflowId: 'wf-1',
					withRunData: true,
				}),
				createMockExecution({
					policy: 'all',
					mode: 'trigger',
					workflowId: 'wf-2',
					withRunData: true,
				}),
				createMockExecution({
					policy: 'all',
					mode: 'trigger',
					workflowId: 'wf-1',
					withRunData: true,
				}),
			];
			const options: ExecutionRedactionOptions = { user: mockUser };

			await service.processExecutions(executions, options);

			// Should be called exactly once with the unique workflow IDs
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledTimes(1);
			const [calledIds] = workflowFinderService.findWorkflowIdsWithScopeForUser.mock.calls[0];
			expect(new Set(calledIds)).toEqual(new Set(['wf-1', 'wf-2']));
		});

		it('should not call DB when all executions pass policyAllowsReveal (policy=none)', async () => {
			const executions = [
				createMockExecution({ policy: 'none', mode: 'trigger', withRunData: true }),
				createMockExecution({ policy: 'none', mode: 'manual', withRunData: true }),
			];
			const options: ExecutionRedactionOptions = { user: mockUser };

			await service.processExecutions(executions, options);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
			// No redaction applied
			for (const execution of executions) {
				expect(execution.data.redactionInfo).toBeUndefined();
			}
		});

		it('should redact only executions that need redaction in a mixed list', async () => {
			const noneExecution = createMockExecution({
				policy: 'none',
				mode: 'trigger',
				workflowId: 'wf-none',
				withRunData: true,
			});
			const allExecution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				workflowId: 'wf-all',
				withRunData: true,
			});
			const nonManualManual = createMockExecution({
				policy: 'non-manual',
				mode: 'manual',
				workflowId: 'wf-nm',
				withRunData: true,
			});
			const nonManualTrigger = createMockExecution({
				policy: 'non-manual',
				mode: 'trigger',
				workflowId: 'wf-nm',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			await service.processExecutions(
				[noneExecution, allExecution, nonManualManual, nonManualTrigger],
				options,
			);

			expect(noneExecution.data.redactionInfo).toBeUndefined();
			expect(nonManualManual.data.redactionInfo).toBeUndefined();
			expect(allExecution.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
			expect(nonManualTrigger.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});

			// Only wf-all and wf-nm needed DB check
			const [calledIds] = workflowFinderService.findWorkflowIdsWithScopeForUser.mock.calls[0];
			expect(new Set(calledIds)).toEqual(new Set(['wf-all', 'wf-nm']));
		});

		it('should set canReveal: true for executions whose workflow is in the reveal set', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));

			const execution1 = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				workflowId: 'wf-1',
				withRunData: true,
			});
			const execution2 = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				workflowId: 'wf-2',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			await service.processExecutions([execution1, execution2], options);

			expect(execution1.data.redactionInfo?.canReveal).toBe(true);
			expect(execution2.data.redactionInfo?.canReveal).toBe(false);
		});

		describe('redactExecutionData === true (explicit redact)', () => {
			it('should redact all executions', async () => {
				const executions = [
					createMockExecution({
						policy: 'none',
						mode: 'manual',
						workflowId: 'wf-1',
						withRunData: true,
					}),
					createMockExecution({
						policy: 'all',
						mode: 'trigger',
						workflowId: 'wf-2',
						withRunData: true,
					}),
				];
				const options: ExecutionRedactionOptions = { user: mockUser, redactExecutionData: true };

				await service.processExecutions(executions, options);

				for (const execution of executions) {
					expect(execution.data.redactionInfo?.isRedacted).toBe(true);
					expect(execution.data.redactionInfo?.reason).toBe('user_requested');
				}
			});

			it('should not call DB when all executions pass policyAllowsReveal', async () => {
				const executions = [
					createMockExecution({ policy: 'none', mode: 'trigger', withRunData: true }),
				];
				const options: ExecutionRedactionOptions = { user: mockUser, redactExecutionData: true };

				await service.processExecutions(executions, options);

				expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
				expect(executions[0].data.redactionInfo?.canReveal).toBe(true);
			});

			it('should use a single DB query for N executions needing check', async () => {
				const executions = [
					createMockExecution({
						policy: 'all',
						mode: 'trigger',
						workflowId: 'wf-1',
						withRunData: true,
					}),
					createMockExecution({
						policy: 'all',
						mode: 'trigger',
						workflowId: 'wf-2',
						withRunData: true,
					}),
				];
				const options: ExecutionRedactionOptions = { user: mockUser, redactExecutionData: true };

				await service.processExecutions(executions, options);

				expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledTimes(1);
			});
		});

		describe('redactExecutionData === false (explicit reveal)', () => {
			it('should not call DB and not throw when all executions pass policyAllowsReveal', async () => {
				const executions = [
					createMockExecution({ policy: 'none', mode: 'trigger', withRunData: true }),
					createMockExecution({ policy: 'non-manual', mode: 'manual', withRunData: true }),
				];
				const options: ExecutionRedactionOptions = { user: mockUser, redactExecutionData: false };

				await expect(service.processExecutions(executions, options)).resolves.toBeUndefined();
				expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
			});

			it('should use a single DB query and throw ForbiddenError if any execution is not allowed', async () => {
				workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));

				const executions = [
					createMockExecution({
						policy: 'all',
						mode: 'trigger',
						workflowId: 'wf-1',
						withRunData: true,
					}),
					createMockExecution({
						policy: 'all',
						mode: 'trigger',
						workflowId: 'wf-2',
						withRunData: true,
					}),
				];
				const options: ExecutionRedactionOptions = { user: mockUser, redactExecutionData: false };

				await expect(service.processExecutions(executions, options)).rejects.toThrow(
					ForbiddenError,
				);
				expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledTimes(1);
			});

			it('should resolve when user has reveal scope for all executions needing check', async () => {
				workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
					new Set(['wf-1', 'wf-2']),
				);

				const executions = [
					createMockExecution({
						policy: 'all',
						mode: 'trigger',
						workflowId: 'wf-1',
						withRunData: true,
					}),
					createMockExecution({
						policy: 'all',
						mode: 'trigger',
						workflowId: 'wf-2',
						withRunData: true,
					}),
				];
				const options: ExecutionRedactionOptions = { user: mockUser, redactExecutionData: false };

				await expect(service.processExecutions(executions, options)).resolves.toBeUndefined();
			});
		});
	});

	describe('redactExecutionData === true (explicit redact)', () => {
		it('should apply redaction regardless of policy', async () => {
			const execution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: true,
			};

			const result = await service.processExecution(execution, options);

			const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.binary).toBeUndefined();
			expect(item.redaction).toEqual({ redacted: true, reason: 'user_requested' });
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'user_requested',
				canReveal: false,
			});
		});

		it('should set canReveal: true when policy allows reveal (policy=none)', async () => {
			// policy='none' means policyAllowsReveal=true → no DB query, canReveal=true
			const execution = createMockExecution({
				policy: 'none',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: true,
			};

			const result = await service.processExecution(execution, options);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'user_requested',
				canReveal: true,
			});
		});

		it('should set canReveal: true when policy allows reveal (policy=non-manual, mode=manual)', async () => {
			const execution = createMockExecution({
				policy: 'non-manual',
				mode: 'manual',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: true,
			};

			const result = await service.processExecution(execution, options);

			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'user_requested',
				canReveal: true,
			});
		});

		it('should set canReveal: true when user has reveal permission', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);

			const execution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: true,
			};

			const result = await service.processExecution(execution, options);

			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'user_requested',
				canReveal: true,
			});
		});
	});

	describe('redactExecutionData === false (explicit reveal)', () => {
		it('should return unmodified execution when user has reveal permission', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);

			const execution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
			};

			const result = await service.processExecution(execution, options);

			expect(result.data.resultData.runData.TestNode[0].data!.main[0]![0].json).toEqual({
				secret: 'sensitive-data',
			});
			expect(result.data.redactionInfo).toBeUndefined();
		});

		it('should return unmodified execution when policy allows reveal (policy=none), even without permission', async () => {
			const execution = createMockExecution({
				policy: 'none',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
			};

			const result = await service.processExecution(execution, options);

			expect(result.data.resultData.runData.TestNode[0].data!.main[0]![0].json).toEqual({
				secret: 'sensitive-data',
			});
			expect(result.data.redactionInfo).toBeUndefined();
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('should return unmodified execution when policy allows reveal (policy=non-manual, mode=manual), even without permission', async () => {
			const execution = createMockExecution({
				policy: 'non-manual',
				mode: 'manual',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
			};

			const result = await service.processExecution(execution, options);

			expect(result.data.resultData.runData.TestNode[0].data!.main[0]![0].json).toEqual({
				secret: 'sensitive-data',
			});
			expect(result.data.redactionInfo).toBeUndefined();
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('should throw ForbiddenError when user lacks reveal permission', async () => {
			const execution = createMockExecution({ policy: 'all', mode: 'trigger' });
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
			};

			await expect(service.processExecution(execution, options)).rejects.toThrow(ForbiddenError);
		});

		it('should emit execution-data-revealed when user is allowed to reveal', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);

			const execution = createMockExecution({ policy: 'all', mode: 'trigger', withRunData: true });
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
				ipAddress: '1.2.3.4',
				userAgent: 'TestAgent/1.0',
			};

			await service.processExecution(execution, options);

			expect(eventService.emit).toHaveBeenCalledWith('execution-data-revealed', {
				user: mockUser,
				executionId: execution.id,
				workflowId: execution.workflowId,
				ipAddress: '1.2.3.4',
				userAgent: 'TestAgent/1.0',
				redactionPolicy: 'all',
			});
		});

		it('should not emit execution-data-revealed when user is forbidden', async () => {
			// workflowFinderService returns null (default in beforeEach) → no permission
			const execution = createMockExecution({ policy: 'all', mode: 'trigger' });
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
			};

			await expect(service.processExecution(execution, options)).rejects.toThrow(ForbiddenError);

			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('redactExecutionData === undefined (policy-based)', () => {
		it('should return unmodified when policy is none', async () => {
			const execution = createMockExecution({
				policy: 'none',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			expect(result.data.resultData.runData.TestNode[0].data!.main[0]![0].json).toEqual({
				secret: 'sensitive-data',
			});
			expect(result.data.redactionInfo).toBeUndefined();
		});

		it('should return unmodified when policy is non-manual and mode is manual', async () => {
			const execution = createMockExecution({
				policy: 'non-manual',
				mode: 'manual',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			expect(result.data.resultData.runData.TestNode[0].data!.main[0]![0].json).toEqual({
				secret: 'sensitive-data',
			});
			expect(result.data.redactionInfo).toBeUndefined();
		});

		it('should redact when policy is non-manual and mode is trigger', async () => {
			const execution = createMockExecution({
				policy: 'non-manual',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.binary).toBeUndefined();
			expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
		});

		it('should set canReveal: true when policy is non-manual, mode is trigger, and user has permission', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);

			const execution = createMockExecution({
				policy: 'non-manual',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: true,
			});
		});

		it('should redact when policy is non-manual and mode is webhook', async () => {
			const execution = createMockExecution({
				policy: 'non-manual',
				mode: 'webhook',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
		});

		it('should redact when policy is all and mode is manual', async () => {
			const execution = createMockExecution({
				policy: 'all',
				mode: 'manual',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
		});

		it('should set canReveal: true when policy is all, mode is manual, and user has permission', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);

			const execution = createMockExecution({
				policy: 'all',
				mode: 'manual',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: true,
			});
		});

		it('should redact when policy is all and mode is trigger', async () => {
			const execution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
		});

		it('should set canReveal: true when policy is all, mode is trigger, and user has permission', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);

			const execution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: true,
			});
		});

		it('should default to none when runtimeData and workflow settings are missing', async () => {
			const execution = createMockExecution({
				withRuntimeData: false,
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			expect(result.data.resultData.runData.TestNode[0].data!.main[0]![0].json).toEqual({
				secret: 'sensitive-data',
			});
			expect(result.data.redactionInfo).toBeUndefined();
		});

		it('should fall back to workflow settings when runtimeData is missing', async () => {
			const execution = createMockExecution({
				withRuntimeData: false,
				workflowSettingsPolicy: 'all',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
		});
	});

	describe('error redaction', () => {
		const mockNode = {
			id: 'node-1',
			name: 'TestNode',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		} as INode;

		describe('item-level error (INodeExecutionData.error)', () => {
			it('should redact NodeApiError with httpCode and preserve type and httpCode', async () => {
				const error = new NodeApiError(mockNode, { message: 'Not Found' }, { httpCode: '404' });
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: true,
				});
				execution.data.resultData.runData.TestNode[0].data!.main[0]![0].error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
				expect(item.error).toBeUndefined();
				expect(item.redaction?.error).toEqual({ type: 'NodeApiError', httpCode: '404' });
			});

			it('should preserve httpCode: null when NodeApiError has no http code', async () => {
				const error = new NodeApiError(mockNode, { message: 'Unknown Error' });
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: true,
				});
				execution.data.resultData.runData.TestNode[0].data!.main[0]![0].error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
				expect(item.error).toBeUndefined();
				expect(item.redaction?.error).toEqual({ type: 'NodeApiError', httpCode: null });
			});

			it('should redact NodeOperationError without httpCode', async () => {
				const error = new NodeOperationError(mockNode, 'Operation failed');
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: true,
				});
				execution.data.resultData.runData.TestNode[0].data!.main[0]![0].error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
				expect(item.error).toBeUndefined();
				expect(item.redaction?.error).toEqual({ type: 'NodeOperationError' });
				expect(item.redaction?.error).not.toHaveProperty('httpCode');
			});

			it('should not add error key to redaction when item has no error', async () => {
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: true,
				});
				// item has no error field
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				const item = result.data.resultData.runData.TestNode[0].data!.main[0]![0];
				expect(item.error).toBeUndefined();
				expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
				expect(item.redaction).not.toHaveProperty('error');
			});
		});

		describe('task-level error (ITaskData.error)', () => {
			it('should redact NodeApiError on task and preserve type and httpCode', async () => {
				const error = new NodeApiError(mockNode, { message: 'Server Error' }, { httpCode: '500' });
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: true,
				});
				execution.data.resultData.runData.TestNode[0].error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				const taskData = result.data.resultData.runData.TestNode[0];
				expect(taskData.error).toBeUndefined();
				expect(taskData.redactedError).toEqual({ type: 'NodeApiError', httpCode: '500' });
			});

			it('should redact ExpressionError on task without httpCode', async () => {
				const error = new ExpressionError('Expression evaluation failed');
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: true,
				});
				execution.data.resultData.runData.TestNode[0].error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				const taskData = result.data.resultData.runData.TestNode[0];
				expect(taskData.error).toBeUndefined();
				expect(taskData.redactedError).toEqual({ type: 'ExpressionError' });
				expect(taskData.redactedError).not.toHaveProperty('httpCode');
			});

			it('should not set redactedError on task when task has no error', async () => {
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: true,
				});
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				const taskData = result.data.resultData.runData.TestNode[0];
				expect(taskData.error).toBeUndefined();
				expect(taskData.redactedError).toBeUndefined();
			});
		});

		describe('workflow-level error (resultData.error)', () => {
			it('should redact resultData.error and preserve type', async () => {
				const error = new NodeOperationError(mockNode, 'Workflow operation failed');
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: false,
				});
				execution.data.resultData.error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				expect(result.data.resultData.error).toBeUndefined();
				expect(result.data.resultData.redactedError).toEqual({ type: 'NodeOperationError' });
			});

			it('should redact NodeApiError in resultData and preserve httpCode', async () => {
				const error = new NodeApiError(mockNode, { message: 'Forbidden' }, { httpCode: '403' });
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: false,
				});
				execution.data.resultData.error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				expect(result.data.resultData.error).toBeUndefined();
				expect(result.data.resultData.redactedError).toEqual({
					type: 'NodeApiError',
					httpCode: '403',
				});
			});

			it('should not set redactedError in resultData when no error is present', async () => {
				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: false,
				});
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				expect(result.data.resultData.error).toBeUndefined();
				expect(result.data.resultData.redactedError).toBeUndefined();
			});
		});

		describe('deserialized plain objects (after DB round-trip)', () => {
			it('should use error.name for type when error is a deserialized NodeApiError', async () => {
				const error = {
					name: 'NodeApiError',
					message: 'Not Found',
					timestamp: Date.now(),
					lineNumber: undefined,
					description: null,
					context: {},
					cause: undefined,
				} as unknown as ExecutionError;

				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: false,
				});
				execution.data.resultData.error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				expect(result.data.resultData.error).toBeUndefined();
				expect(result.data.resultData.redactedError).toEqual({
					type: 'NodeApiError',
					httpCode: null,
				});
			});

			it('should use error.name for deserialized NodeOperationError without httpCode', async () => {
				const error = {
					name: 'NodeOperationError',
					message: 'Operation failed',
					timestamp: Date.now(),
					lineNumber: undefined,
					description: null,
					context: {},
					cause: undefined,
				} as unknown as ExecutionError;

				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: false,
				});
				execution.data.resultData.error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				expect(result.data.resultData.error).toBeUndefined();
				expect(result.data.resultData.redactedError).toEqual({ type: 'NodeOperationError' });
				expect(result.data.resultData.redactedError).not.toHaveProperty('httpCode');
			});

			it('should use error.name for deserialized ExpressionError without httpCode', async () => {
				const error = {
					name: 'ExpressionError',
					message: 'Expression evaluation failed',
					timestamp: Date.now(),
					lineNumber: undefined,
					description: null,
					context: {},
					cause: undefined,
				} as unknown as ExecutionError;

				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: false,
				});
				execution.data.resultData.error = error;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				expect(result.data.resultData.error).toBeUndefined();
				expect(result.data.resultData.redactedError).toEqual({ type: 'ExpressionError' });
				expect(result.data.resultData.redactedError).not.toHaveProperty('httpCode');
			});

			it('should preserve httpCode from spread plain object (pre-DB serialization)', async () => {
				const liveError = new NodeApiError(mockNode, { message: 'Not Found' }, { httpCode: '404' });
				const spreadError = { ...liveError } as unknown as ExecutionError;

				const execution = createMockExecution({
					policy: 'all',
					mode: 'trigger',
					withRunData: false,
				});
				execution.data.resultData.error = spreadError;
				const options: ExecutionRedactionOptions = { user: mockUser };

				const result = await service.processExecution(execution, options);

				expect(result.data.resultData.error).toBeUndefined();
				expect(result.data.resultData.redactedError).toEqual({
					type: 'NodeApiError',
					httpCode: '404',
				});
			});
		});
	});

	describe('resolvePolicy precedence', () => {
		it('should prefer runtimeData policy over workflow settings', async () => {
			const execution = createMockExecution({
				policy: 'none',
				workflowSettingsPolicy: 'all',
				mode: 'trigger',
				withRunData: true,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			// runtimeData says 'none', so no redaction despite workflow settings saying 'all'
			expect(result.data.resultData.runData.TestNode[0].data!.main[0]![0].json).toEqual({
				secret: 'sensitive-data',
			});
			expect(result.data.redactionInfo).toBeUndefined();
		});
	});

	describe('applyRedaction behavior', () => {
		it('should handle empty runData gracefully', async () => {
			const execution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				withRunData: false,
			});
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			expect(result).toBe(execution);
		});

		it('should redact inputOverride data', async () => {
			const execution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				withRunData: true,
			});
			// Add inputOverride to the task data
			execution.data.resultData.runData.TestNode[0].inputOverride = {
				main: [[{ json: { override: 'secret' }, binary: { f: { mimeType: 'x', data: 'y' } } }]],
			};
			const options: ExecutionRedactionOptions = { user: mockUser };

			const result = await service.processExecution(execution, options);

			const overrideItem = result.data.resultData.runData.TestNode[0].inputOverride!.main[0]![0];
			expect(overrideItem.json).toEqual({});
			expect(overrideItem.binary).toBeUndefined();
			expect(overrideItem.redaction).toEqual({
				redacted: true,
				reason: 'workflow_redaction_policy',
			});
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
		});

		it('should handle large executions with 1000+ items efficiently', async () => {
			const items = Array.from({ length: 1500 }, (_, i) => ({
				json: { id: i, secret: `sensitive-data-${i}`, nested: { key: `value-${i}` } },
				binary: { file: { mimeType: 'text/plain', data: `data-${i}` } },
			}));

			const execution = createMockExecution({
				policy: 'all',
				mode: 'trigger',
				withRunData: false,
			});
			execution.data.resultData.runData = {
				LargeNode: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 100,
						executionStatus: 'success' as const,
						data: { main: [items] },
						source: [],
					},
				],
			};
			const options: ExecutionRedactionOptions = { user: mockUser };

			const start = performance.now();
			const result = await service.processExecution(execution, options);
			const elapsed = performance.now() - start;

			const redactedItems = result.data.resultData.runData.LargeNode[0].data!.main[0]!;
			expect(redactedItems).toHaveLength(1500);
			for (const item of redactedItems) {
				expect(item.json).toEqual({});
				expect(item.binary).toBeUndefined();
				expect(item.redaction).toEqual({ redacted: true, reason: 'workflow_redaction_policy' });
			}

			// Redaction of 1500 items should complete well under 100ms
			expect(elapsed).toBeLessThan(100);
			expect(result.data.redactionInfo).toEqual({
				isRedacted: true,
				reason: 'workflow_redaction_policy',
				canReveal: false,
			});
		});
	});
});
