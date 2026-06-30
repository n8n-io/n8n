import { LicenseState, Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { IRunExecutionData, ITaskData, WorkflowExecuteMode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ScopeForbiddenError } from '@/errors/response-errors/scope-forbidden.error';
import type { EventService } from '@/events/event.service';
import type {
	ExecutionRedactionOptions,
	RedactableExecution,
} from '@/executions/execution-redaction';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ExecutionRedactionService } from '../execution-redaction.service';
import { FullItemRedactionStrategy } from '../strategies/full-item-redaction.strategy';

describe('ExecutionRedactionService', () => {
	const logger = mockInstance(Logger);
	const licenseState = mockInstance(LicenseState);
	const workflowFinderService = mockInstance(WorkflowFinderService);
	const eventService = mock<EventService>();
	const fullItemRedactionStrategy = mockInstance(FullItemRedactionStrategy);

	let service: ExecutionRedactionService;

	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
		role: 'global:owner',
	} as unknown as User;

	beforeEach(() => {
		vi.clearAllMocks();
		licenseState.isDataRedactionLicensed.mockReturnValue(true);
		service = new ExecutionRedactionService(
			logger,
			licenseState,
			workflowFinderService,
			eventService,
			fullItemRedactionStrategy,
		);
		// Default: user lacks execution:reveal scope
		workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());
		fullItemRedactionStrategy.apply.mockResolvedValue(undefined);
	});

	const makeExecution = (
		overrides: {
			mode?: WorkflowExecuteMode;
			workflowId?: string;
			policy?: 'none' | 'all' | 'non-manual';
			channels?: { production: boolean; manual: boolean };
			workflowSettingsPolicy?: 'none' | 'all' | 'non-manual';
			withRuntimeData?: boolean;
			withDynamicCredentials?: boolean;
			executedByUserId?: string | null;
		} = {},
	): RedactableExecution => {
		const {
			mode = 'manual',
			workflowId = 'workflow-123',
			policy,
			channels,
			workflowSettingsPolicy,
			withRuntimeData = true,
			withDynamicCredentials = false,
			executedByUserId = null,
		} = overrides;

		const executionData: IRunExecutionData['executionData'] = {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: null,
		};

		if (withRuntimeData && (policy !== undefined || channels !== undefined)) {
			const redaction = channels
				? { version: 2 as const, production: channels.production, manual: channels.manual }
				: { version: 1 as const, policy: policy! };
			executionData.runtimeData = {
				version: 1 as const,
				establishedAt: Date.now(),
				source: mode,
				redaction,
				...(withDynamicCredentials ? { credentials: 'encrypted-credential-context' } : {}),
			};
		} else if (withDynamicCredentials) {
			executionData.runtimeData = {
				version: 1 as const,
				establishedAt: Date.now(),
				source: mode,
				credentials: 'encrypted-credential-context',
			};
		}

		// Stamp the executing user onto runtimeData, mirroring what
		// `establishExecutionContext` does for manual runs. Ensure runtimeData
		// exists even when no policy/dynamic-credentials block created it.
		if (executedByUserId !== null) {
			executionData.runtimeData = {
				version: 1 as const,
				establishedAt: Date.now(),
				source: mode,
				...executionData.runtimeData,
				executedByUserId,
			};
		}

		const runData = withDynamicCredentials
			? {
					SomeNode: [{ startTime: 0, executionTime: 0, usedDynamicCredentials: true } as ITaskData],
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
				nodes: [],
			},
		} as unknown as RedactableExecution;
	};

	describe('processExecution (single-item wrapper)', () => {
		it('delegates to processExecutions and returns the same execution', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			const options: ExecutionRedactionOptions = { user: mockUser };

			const spy = vi.spyOn(service, 'processExecutions');
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

		it('skips data-less executions and still processes the rest', async () => {
			// A queued (`status: new`) execution row whose `executionData.data`
			// has not been written yet returns `data: undefined` from the
			// repository's unflatten path. Surfaces under parallel evaluation
			// when several rows linger in `new` state long enough for FE
			// polling to catch them. The service must short-circuit those
			// rows without crashing the rest of the batch.
			const populated = makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-1' });
			const dataless = {
				id: 'queued-1',
				mode: 'trigger' as WorkflowExecuteMode,
				workflowId: 'wf-2',
				data: undefined,
				workflowData: { settings: {}, nodes: [] },
			} as unknown as RedactableExecution;
			const options: ExecutionRedactionOptions = { user: mockUser };

			await expect(
				service.processExecutions([dataless, populated], options),
			).resolves.toBeUndefined();

			// The populated row still triggered the DB scope check, the
			// data-less one did not contribute its workflow id to the query.
			const [calledIds] = workflowFinderService.findWorkflowIdsWithScopeForUser.mock.calls[0];
			expect(new Set(calledIds)).toEqual(new Set(['wf-1']));
		});

		it('skips data-less executions on the reveal-success path (audit-emit)', async () => {
			// Reveal-success audit loop reads `resolvePolicy(execution)`, which
			// dereferences `.data.executionData`. With a data-less row in the
			// batch, the success path used to 500 even though the data-less
			// row had no payload to reveal. Verify the audit event fires for
			// the populated row and not for the data-less one.
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf-1']));
			const populated = makeExecution({ policy: 'all', mode: 'trigger', workflowId: 'wf-1' });
			const dataless = {
				id: 'queued-1',
				mode: 'trigger' as WorkflowExecuteMode,
				workflowId: 'wf-2',
				data: undefined,
				workflowData: { settings: {}, nodes: [] },
			} as unknown as RedactableExecution;
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
			};

			await expect(
				service.processExecutions([dataless, populated], options),
			).resolves.toBeUndefined();

			const revealedCalls = eventService.emit.mock.calls.filter(
				([eventName]) => eventName === 'execution-data-revealed',
			);
			expect(revealedCalls).toHaveLength(1);
			expect(revealedCalls[0][1]).toEqual(
				expect.objectContaining({ executionId: populated.id, workflowId: 'wf-1' }),
			);
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
	});

	describe('reveal path (redactExecutionData === false)', () => {
		it('throws ScopeForbiddenError with structured error when neither policy nor user allows reveal', async () => {
			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			const error: ScopeForbiddenError = await service
				.processExecution(execution, { user: mockUser, redactExecutionData: false })
				.catch((e) => e);

			expect(error).toBeInstanceOf(ScopeForbiddenError);
			expect(error.httpStatusCode).toBe(403);
			expect(error.meta.errorCode).toBe('EXECUTION_REVEAL_FORBIDDEN');
			expect(error.meta.requiredScope).toBe('execution:reveal');
			expect(error.hint).toBeDefined();
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
			).rejects.toThrow(ScopeForbiddenError);

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

		it('throws ScopeForbiddenError if any execution in batch is not allowed and emits reveal-failure event', async () => {
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

			await expect(service.processExecutions(executions, options)).rejects.toThrow(
				ScopeForbiddenError,
			);
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

		it('clears items for a production execution when V2 snapshot redacts production', async () => {
			const execution = makeExecution({
				channels: { production: true, manual: false },
				mode: 'trigger',
			});
			await service.processExecution(execution, { user: mockUser });
			// production channel on + non-manual mode → reconstructs 'non-manual' → clears
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('does not clear a manual execution when V2 snapshot redacts production only', async () => {
			const execution = makeExecution({
				channels: { production: true, manual: false },
				mode: 'manual',
			});
			await service.processExecution(execution, { user: mockUser });
			// 'non-manual' policy exempts manual executions
			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});

		it('clears a manual execution when V2 snapshot redacts both channels', async () => {
			const execution = makeExecution({
				channels: { production: true, manual: true },
				mode: 'manual',
			});
			await service.processExecution(execution, { user: mockUser });
			// reconstructs 'all' → clears regardless of mode
			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('does not clear when V2 snapshot redacts neither channel', async () => {
			const execution = makeExecution({
				channels: { production: false, manual: false },
				mode: 'trigger',
			});
			await service.processExecution(execution, { user: mockUser });
			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});
	});

	describe('license enforcement', () => {
		it('should treat policy as none when data-redaction license is missing', async () => {
			licenseState.isDataRedactionLicensed.mockReturnValue(false);

			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });

			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});

		it('should apply policy when data-redaction license is present', async () => {
			licenseState.isDataRedactionLicensed.mockReturnValue(true);

			const execution = makeExecution({ policy: 'all', mode: 'trigger' });
			await service.processExecution(execution, { user: mockUser });

			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});
	});

	describe('dynamic credentials forced redaction', () => {
		it('includes FullItemRedactionStrategy even when policy is none', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
			});
			await service.processExecution(execution, { user: mockUser });

			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('passes userCanReveal: false regardless of permissions', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
			});
			await service.processExecution(execution, { user: mockUser });

			const [, context] = fullItemRedactionStrategy.apply.mock.calls[0];
			expect(context.userCanReveal).toBe(false);
		});

		it('passes enforceDynCredRedaction: true in context so strategy sets correct reason', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
			});
			await service.processExecution(execution, { user: mockUser });

			const [, context] = fullItemRedactionStrategy.apply.mock.calls[0];
			expect(context.enforceDynCredRedaction).toBe(true);
		});

		it('throws ForbiddenError on reveal path', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
			});

			await expect(
				service.processExecution(execution, { user: mockUser, redactExecutionData: false }),
			).rejects.toThrow(ForbiddenError);
		});

		it('does not force-redact when execution has no dynamic credentials', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: false,
			});
			await service.processExecution(execution, { user: mockUser });

			// policy=none, no dynamic creds → no FullItemRedactionStrategy
			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});

		it('scrubs runtimeData.credentials from the execution data', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
			});

			// Verify credentials exist before processing
			expect(execution.data.executionData?.runtimeData?.credentials).toBe(
				'encrypted-credential-context',
			);

			await service.processExecution(execution, { user: mockUser });

			// Credentials must be scrubbed from the response
			expect(execution.data.executionData?.runtimeData?.credentials).toBeUndefined();
		});
	});

	describe('dynamic credentials owner access', () => {
		it('skips force redaction when requesting user ran the execution', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
				executedByUserId: mockUser.id,
			});

			await service.processExecution(execution, { user: mockUser });

			expect(fullItemRedactionStrategy.apply).not.toHaveBeenCalled();
		});

		it('still force-redacts when a different user requested the data', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
				executedByUserId: 'another-user-id',
			});

			await service.processExecution(execution, { user: mockUser });

			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('still force-redacts when the execution has no recorded executing user', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
				executedByUserId: null,
			});

			await service.processExecution(execution, { user: mockUser });

			expect(fullItemRedactionStrategy.apply).toHaveBeenCalledTimes(1);
		});

		it('allows the executing user to reveal their own data', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
				executedByUserId: mockUser.id,
			});

			await expect(
				service.processExecution(execution, { user: mockUser, redactExecutionData: false }),
			).resolves.toBeDefined();
		});

		it('rejects reveal for a different user even with execution:reveal scope', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
				executedByUserId: 'another-user-id',
			});

			await expect(
				service.processExecution(execution, { user: mockUser, redactExecutionData: false }),
			).rejects.toThrow(ForbiddenError);
		});

		it('rejects reveal when no executing user is recorded, regardless of scope', async () => {
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(
				new Set(['workflow-123']),
			);
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
				executedByUserId: null,
			});

			await expect(
				service.processExecution(execution, { user: mockUser, redactExecutionData: false }),
			).rejects.toThrow(ForbiddenError);
		});

		it('still scrubs runtimeData.credentials when the owner views their data', async () => {
			const execution = makeExecution({
				policy: 'none',
				mode: 'manual',
				withDynamicCredentials: true,
				executedByUserId: mockUser.id,
			});

			expect(execution.data.executionData?.runtimeData?.credentials).toBe(
				'encrypted-credential-context',
			);

			await service.processExecution(execution, { user: mockUser });

			expect(execution.data.executionData?.runtimeData?.credentials).toBeUndefined();
		});
	});
});
