import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { IExecutionDb, User } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE, SharedWorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ExecutionStatus, IDataObject, ITaskData, WorkflowExecuteMode } from 'n8n-workflow';

import type { ExecutionRedactionOptions } from '@/executions/execution-redaction';
import { userHasScopes } from '@/permissions.ee/check-access';

import { ExecutionRedactionService } from '../execution-redaction.service';

jest.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: jest.fn(),
}));

const mockUserHasScopes = jest.mocked(userHasScopes);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ownerUser = mock<User>({ id: 'owner-id', role: GLOBAL_OWNER_ROLE });
const memberUser = mock<User>({ id: 'member-id', role: GLOBAL_MEMBER_ROLE });

function createMockExecution(
	overrides: {
		mode?: WorkflowExecuteMode;
		redactionPolicy?: 'none' | 'all' | 'non-manual';
		runtimeRedaction?: { version: 1; policy: 'none' | 'all' | 'non-manual' } | undefined;
		workflowSettingsRedactionPolicy?: 'none' | 'all' | 'non-manual';
		runData?: Record<string, ITaskData[]>;
	} = {},
): IExecutionDb {
	const {
		mode = 'trigger',
		runtimeRedaction,
		workflowSettingsRedactionPolicy,
		redactionPolicy,
		runData = {},
	} = overrides;

	// Allow shorthand: if `redactionPolicy` is set, use it for runtimeRedaction
	const effectiveRuntimeRedaction =
		runtimeRedaction !== undefined
			? runtimeRedaction
			: redactionPolicy !== undefined
				? { version: 1 as const, policy: redactionPolicy }
				: undefined;

	// @ts-expect-error Partial mock
	return {
		id: 'execution-123',
		mode,
		createdAt: new Date('2024-01-01'),
		startedAt: new Date('2024-01-01'),
		stoppedAt: new Date('2024-01-01'),
		workflowId: 'workflow-123',
		finished: true,
		status: 'success' as ExecutionStatus,
		waitTill: null,
		data: {
			resultData: { runData },
			executionData: {
				contextData: {},
				nodeExecutionStack: [],
				metadata: {},
				waitingExecution: {},
				waitingExecutionSource: null,
				runtimeData: effectiveRuntimeRedaction
					? {
							version: 1 as const,
							establishedAt: Date.now(),
							source: mode,
							redaction: effectiveRuntimeRedaction,
						}
					: undefined,
			},
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
			settings: {
				...(workflowSettingsRedactionPolicy && {
					redactionPolicy: workflowSettingsRedactionPolicy,
				}),
			},
			staticData: {},
			activeVersionId: null,
		},
	} as IExecutionDb;
}

function createRunDataWithJson(json: IDataObject): Record<string, ITaskData[]> {
	return {
		'Node A': [
			{
				startTime: 0,
				executionIndex: 0,
				executionTime: 100,
				source: [],
				data: {
					main: [[{ json: { ...json } }]],
				},
			},
		],
	};
}

function createOptions(
	overrides: Partial<ExecutionRedactionOptions> = {},
): ExecutionRedactionOptions {
	return {
		user: ownerUser,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExecutionRedactionService', () => {
	const logger = mockInstance(Logger);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	let service: ExecutionRedactionService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new ExecutionRedactionService(logger, sharedWorkflowRepository);

		// Default: workflow is shared in one project
		sharedWorkflowRepository.findBy.mockResolvedValue([
			{ projectId: 'project-123', workflowId: 'workflow-123' } as never,
		]);

		// Default: userHasScopes returns false (member without scope)
		mockUserHasScopes.mockResolvedValue(false);
	});

	// -----------------------------------------------------------------------
	// Policy = none / undefined
	// -----------------------------------------------------------------------

	describe('when policy is "none" or absent', () => {
		it('should not redact when runtimeData policy is "none"', async () => {
			const execution = createMockExecution({
				redactionPolicy: 'none',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(execution, createOptions());

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
		});

		it('should not redact when no runtimeData and no workflow settings', async () => {
			const execution = createMockExecution({
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(execution, createOptions());

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
		});

		it('should not redact when workflow settings policy is "none" (no runtimeData)', async () => {
			const execution = createMockExecution({
				workflowSettingsRedactionPolicy: 'none',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(execution, createOptions());

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
		});
	});

	// -----------------------------------------------------------------------
	// Policy = all
	// -----------------------------------------------------------------------

	describe('when policy is "all"', () => {
		const modes: WorkflowExecuteMode[] = ['manual', 'chat', 'trigger', 'webhook'];

		it.each(modes)('should redact execution in %s mode', async (mode) => {
			const execution = createMockExecution({
				mode,
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(execution, createOptions());

			const item = result.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});
	});

	// -----------------------------------------------------------------------
	// Policy = non-manual
	// -----------------------------------------------------------------------

	describe('when policy is "non-manual"', () => {
		const exemptModes: WorkflowExecuteMode[] = ['manual', 'chat'];

		it.each(exemptModes)('should NOT redact execution in %s mode', async (mode) => {
			const execution = createMockExecution({
				mode,
				redactionPolicy: 'non-manual',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(execution, createOptions());

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
		});

		const nonExemptModes: WorkflowExecuteMode[] = [
			'trigger',
			'webhook',
			'retry',
			'error',
			'integrated',
			'internal',
			'evaluation',
		];

		it.each(nonExemptModes)('should redact execution in %s mode', async (mode) => {
			const execution = createMockExecution({
				mode,
				redactionPolicy: 'non-manual',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(execution, createOptions());

			const item = result.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});
	});

	// -----------------------------------------------------------------------
	// Reveal flow
	// -----------------------------------------------------------------------

	describe('reveal via redactExecutionData=false', () => {
		it('should return unredacted data when user has execution:reveal scope', async () => {
			mockUserHasScopes.mockResolvedValueOnce(true);

			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ user: ownerUser, redactExecutionData: false }),
			);

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
			expect(mockUserHasScopes).toHaveBeenCalledWith(ownerUser, ['execution:reveal'], false, {
				projectId: 'project-123',
			});
		});

		it('should return unredacted data when project admin has scope', async () => {
			mockUserHasScopes.mockResolvedValueOnce(true);

			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ user: memberUser, redactExecutionData: false }),
			);

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
		});

		it('should redact when user lacks execution:reveal scope', async () => {
			mockUserHasScopes.mockResolvedValue(false);

			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ user: memberUser, redactExecutionData: false }),
			);

			const item = result.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});

		it('should redact when redactExecutionData is undefined (default)', async () => {
			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ redactExecutionData: undefined }),
			);

			const item = result.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});
	});

	// -----------------------------------------------------------------------
	// Redaction content
	// -----------------------------------------------------------------------

	describe('redaction content', () => {
		it('should redact all nodes in runData', async () => {
			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: {
					'Node A': [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 50,
							source: [],
							data: { main: [[{ json: { a: 1 } }]] },
						},
					],
					'Node B': [
						{
							startTime: 50,
							executionIndex: 1,
							executionTime: 50,
							source: [],
							data: { main: [[{ json: { b: 2 } }]] },
						},
					],
				},
			});

			await service.processExecution(execution, createOptions());

			const itemA = execution.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(itemA.json).toEqual({});
			expect(itemA.redaction).toEqual({ redacted: true });
			const itemB = execution.data.resultData.runData['Node B'][0].data!.main[0]![0];
			expect(itemB.json).toEqual({});
			expect(itemB.redaction).toEqual({ redacted: true });
		});

		it('should handle empty runData without error', async () => {
			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: {},
			});

			const result = await service.processExecution(execution, createOptions());

			expect(result).toBe(execution);
		});

		it('should remove binary data', async () => {
			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: {
					'Node A': [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 50,
							source: [],
							data: {
								main: [
									[
										{
											json: { file: 'data' },
											binary: { data: { mimeType: 'text/plain', data: 'abc', fileSize: '3' } },
										},
									],
								],
							},
						},
					],
				},
			});

			await service.processExecution(execution, createOptions());

			const item = execution.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
			expect(item.binary).toBeUndefined();
		});

		it('should redact inputOverride data', async () => {
			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: {
					'Node A': [
						{
							startTime: 0,
							executionIndex: 0,
							executionTime: 50,
							source: [],
							data: { main: [[{ json: { out: 1 } }]] },
							inputOverride: { main: [[{ json: { in: 1 } }]] },
						},
					],
				},
			});

			await service.processExecution(execution, createOptions());

			const item = execution.data.resultData.runData['Node A'][0].inputOverride!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});

		it('should mutate in place and return same reference', async () => {
			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(execution, createOptions());

			expect(result).toBe(execution);
			const item = execution.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});
	});

	// -----------------------------------------------------------------------
	// canUserReveal (scope-based)
	// -----------------------------------------------------------------------

	describe('canUserReveal', () => {
		it('should allow user with global execution:reveal scope', async () => {
			mockUserHasScopes.mockResolvedValueOnce(true);

			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ user: ownerUser, redactExecutionData: false }),
			);

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
			expect(sharedWorkflowRepository.findBy).toHaveBeenCalledWith({
				workflowId: 'workflow-123',
			});
		});

		it('should allow project admin with execution:reveal scope', async () => {
			mockUserHasScopes.mockResolvedValueOnce(true);

			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ user: memberUser, redactExecutionData: false }),
			);

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
		});

		it('should deny reveal for member without execution:reveal scope', async () => {
			mockUserHasScopes.mockResolvedValue(false);

			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ user: memberUser, redactExecutionData: false }),
			);

			const item = result.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});

		it('should deny reveal when workflow is not shared to any project', async () => {
			sharedWorkflowRepository.findBy.mockResolvedValueOnce([]);

			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ user: memberUser, redactExecutionData: false }),
			);

			const item = result.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
			expect(mockUserHasScopes).not.toHaveBeenCalled();
		});

		it('should check all projects when workflow is in multiple projects', async () => {
			sharedWorkflowRepository.findBy.mockResolvedValueOnce([
				{ projectId: 'project-1', workflowId: 'workflow-123' } as never,
				{ projectId: 'project-2', workflowId: 'workflow-123' } as never,
			]);
			// First project: no scope. Second project: has scope.
			mockUserHasScopes.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

			const execution = createMockExecution({
				redactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			const result = await service.processExecution(
				execution,
				createOptions({ user: memberUser, redactExecutionData: false }),
			);

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
			expect(mockUserHasScopes).toHaveBeenCalledTimes(2);
			expect(mockUserHasScopes).toHaveBeenCalledWith(memberUser, ['execution:reveal'], false, {
				projectId: 'project-1',
			});
			expect(mockUserHasScopes).toHaveBeenCalledWith(memberUser, ['execution:reveal'], false, {
				projectId: 'project-2',
			});
		});
	});

	// -----------------------------------------------------------------------
	// Edge cases
	// -----------------------------------------------------------------------

	describe('edge cases', () => {
		it('should fall back to workflow settings when no runtimeData', async () => {
			const execution = createMockExecution({
				workflowSettingsRedactionPolicy: 'all',
				runData: createRunDataWithJson({ secret: 'value' }),
			});
			// Ensure runtimeData is absent
			execution.data.executionData!.runtimeData = undefined;

			await service.processExecution(execution, createOptions());

			const item = execution.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});

		it('should default to "none" when no settings at all', async () => {
			const execution = createMockExecution({
				runData: createRunDataWithJson({ secret: 'value' }),
			});
			execution.data.executionData!.runtimeData = undefined;
			execution.workflowData.settings = {};

			const result = await service.processExecution(execution, createOptions());

			expect(result.data.resultData.runData['Node A'][0].data!.main[0]![0].json).toEqual({
				secret: 'value',
			});
		});

		it('should handle undefined runData gracefully', async () => {
			const execution = createMockExecution({ redactionPolicy: 'all' });
			// @ts-expect-error Testing undefined runData
			execution.data.resultData.runData = undefined;

			const result = await service.processExecution(execution, createOptions());

			expect(result).toBe(execution);
		});

		it('should prefer runtimeData policy over workflowData.settings', async () => {
			const execution = createMockExecution({
				runtimeRedaction: { version: 1, policy: 'all' },
				workflowSettingsRedactionPolicy: 'none',
				runData: createRunDataWithJson({ secret: 'value' }),
			});

			await service.processExecution(execution, createOptions());

			const item = execution.data.resultData.runData['Node A'][0].data!.main[0]![0];
			expect(item.json).toEqual({});
			expect(item.redaction).toEqual({ redacted: true });
		});
	});
});
