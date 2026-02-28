import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { IExecutionDb, User } from '@n8n/db';
import { SharedWorkflowRepository } from '@n8n/db';
import type { ExecutionStatus, IRunExecutionData, WorkflowExecuteMode } from 'n8n-workflow';

import type { ExecutionRedactionOptions } from '@/executions/execution-redaction';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { ExecutionRedactionService } from '../execution-redaction.service';

jest.mock('@/permissions.ee/check-access');

const mockedUserHasScopes = jest.mocked(userHasScopes);

describe('ExecutionRedactionService', () => {
	const logger = mockInstance(Logger);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
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
		service = new ExecutionRedactionService(logger, sharedWorkflowRepository);
	});

	const createMockExecution = (
		overrides: {
			mode?: WorkflowExecuteMode;
			policy?: 'none' | 'all' | 'non-manual';
			workflowSettingsPolicy?: 'none' | 'all' | 'non-manual';
			withRuntimeData?: boolean;
			withRunData?: boolean;
		} = {},
	): IExecutionDb => {
		const {
			mode = 'manual',
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
							executionStatus: 'success' as const,
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

		// @ts-expect-error - Partial mock data for testing
		return {
			id: 'execution-123',
			mode,
			createdAt: new Date('2024-01-01'),
			startedAt: new Date('2024-01-01'),
			stoppedAt: new Date('2024-01-01'),
			workflowId: 'workflow-123',
			finished: true,
			retryOf: undefined,
			retrySuccessId: undefined,
			status: 'success' as ExecutionStatus,
			waitTill: null,
			storedAt: 'db',
			data: {
				version: 1,
				resultData: { runData },
				executionData,
			},
			workflowData: {
				id: 'workflow-123',
				name: 'Test Workflow',
				active: false,
				isArchived: false,
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-01'),
				nodes: [],
				connections: {},
				settings: workflowSettingsPolicy ? { redactionPolicy: workflowSettingsPolicy } : {},
				staticData: {},
				activeVersionId: null,
			},
		} as IExecutionDb;
	};

	describe('redactExecutionData === true (explicit redact)', () => {
		it('should apply redaction regardless of policy', async () => {
			const execution = createMockExecution({
				policy: 'none',
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
		});
	});

	describe('redactExecutionData === false (explicit reveal)', () => {
		it('should return unmodified execution when user has reveal permission', async () => {
			sharedWorkflowRepository.findBy.mockResolvedValue([{ projectId: 'project-1' } as never]);
			mockedUserHasScopes.mockResolvedValue(true);

			const execution = createMockExecution({
				policy: 'all',
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
		});

		it('should throw ForbiddenError when user lacks reveal permission', async () => {
			sharedWorkflowRepository.findBy.mockResolvedValue([{ projectId: 'project-1' } as never]);
			mockedUserHasScopes.mockResolvedValue(false);

			const execution = createMockExecution({ policy: 'all' });
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
			};

			await expect(service.processExecution(execution, options)).rejects.toThrow(ForbiddenError);
		});

		it('should throw ForbiddenError when no shared workflows exist', async () => {
			sharedWorkflowRepository.findBy.mockResolvedValue([]);

			const execution = createMockExecution({ policy: 'all' });
			const options: ExecutionRedactionOptions = {
				user: mockUser,
				redactExecutionData: false,
			};

			await expect(service.processExecution(execution, options)).rejects.toThrow(ForbiddenError);
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
		});
	});
});
