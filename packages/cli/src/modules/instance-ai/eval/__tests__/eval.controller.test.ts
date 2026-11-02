import type {
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalCredentialAllowlistRequest,
	InstanceAiEvalCredentialTestTargetRequest,
	InstanceAiEvalExecutionResult,
	InstanceAiEvalLlmUsage,
	InstanceAiEvalRestoreThreadRequest,
	InstanceAiEvalThreadMemoryResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { meterEvalUsage, seedAgentBuilderTargetMetadata } from '@n8n/instance-ai';
import type { Scope } from '@n8n/permissions';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EvalAgentExecutionService } from '../agent-execution.service';
import type { EvalExecutionService } from '../execution.service';
import type { FailedExecutionPortabilityService } from '../failed-execution-portability.service';
import { EvalThreadCredentialAllowlistService } from '../thread-credential-allowlist.service';
import type { EvalThreadRestoreService } from '../thread-restore.service';
import type { InstanceAiMemoryService } from '../../instance-ai-memory.service';
import type { InstanceAiSettingsService } from '../../instance-ai-settings.service';
import { InstanceAiEvalController } from '../eval.controller';
import type { InstanceAiService } from '../../instance-ai.service';

vi.mock('@n8n/instance-ai', () => ({
	// Shape is the instance-ai package's contract (covered by its own tests); the
	// controller only owns which targets it feeds in and that it persists the result.
	seedAgentBuilderTargetMetadata: vi.fn((targets: unknown) => ({ boundTargets: targets })),
	// Real behaviour matters here: `updateThread` merges, so the rollback has to
	// name the binding keys rather than hand back the prior snapshot.
	clearedAgentBuilderTargetMetadata: vi.fn((prior: Record<string, unknown> | undefined) => ({
		...(prior ?? {}),
		boundTargets: prior?.boundTargets,
	})),
	meterEvalUsage: vi.fn(async (fn: () => Promise<unknown>) => ({
		result: await fn(),
		usage: [],
	})),
}));

vi.mock('../execution.service', () => ({
	EvalExecutionService: vi.fn(),
}));

const USER_ID = 'user-1';
const THREAD_ID = 'thread-1';

const routeMetadata = Container.get(ControllerRegistryMetadata);

function scopeOf(handlerName: string): { scope: Scope; globalOnly: boolean } | undefined {
	const route = routeMetadata.getRouteMetadata(
		InstanceAiEvalController as unknown as Parameters<typeof routeMetadata.getRouteMetadata>[0],
		handlerName,
	);
	return route.accessScope;
}

const MOCK_RESPONDER_USAGE: InstanceAiEvalLlmUsage = {
	agent: 'eval-mock-responder',
	model: 'anthropic/claude-sonnet-4-6',
	calls: 2,
	uncachedInputTokens: 1200,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	outputTokens: 300,
};

describe('InstanceAiEvalController', () => {
	const instanceAiService = mock<InstanceAiService>();
	const memoryService = mock<InstanceAiMemoryService>();
	const settingsService = mock<InstanceAiSettingsService>();
	const evalExecutionService = mock<EvalExecutionService>();
	const evalAgentExecutionService = mock<EvalAgentExecutionService>();
	const evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
	const evalThreadRestore = mock<EvalThreadRestoreService>();
	const failedExecutionPortability = mock<FailedExecutionPortabilityService>();

	const controller = new InstanceAiEvalController(
		instanceAiService,
		memoryService,
		settingsService,
		evalExecutionService,
		evalAgentExecutionService,
		evalCredentialAllowlists,
		evalThreadRestore,
		failedExecutionPortability,
	);

	const req = mock<AuthenticatedRequest>({ user: { id: USER_ID } });
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.isInstanceAiEnabled.mockReturnValue(true);
	});

	it.each([
		'executeWithLlmMock',
		'executeAgentWithLlmMock',
		'setThreadCredentialAllowlist',
		'setThreadCredentialTestTarget',
		'getEvalThreadMemory',
		'restoreEvalThread',
		'seedEvalDataTableRows',
		'exportExecution',
		'restoreExecution',
	])('%s requires the instanceAi:manage scope', (handlerName) => {
		expect(scopeOf(handlerName)).toEqual({ scope: 'instanceAi:manage', globalOnly: true });
	});

	describe('executeWithLlmMock', () => {
		it('should return the model usage of the run with its result', async () => {
			const runResult = { executionId: 'exec-1', success: true } as InstanceAiEvalExecutionResult;
			evalExecutionService.executeWithLlmMock.mockResolvedValue(runResult);
			vi.mocked(meterEvalUsage).mockImplementationOnce(async (fn) => ({
				result: await fn(),
				usage: [MOCK_RESPONDER_USAGE],
			}));

			const result = await controller.executeWithLlmMock(req, res, 'wf-1', {});

			expect(result).toEqual({ ...runResult, llmUsage: [MOCK_RESPONDER_USAGE] });
			expect(evalExecutionService.executeWithLlmMock).toHaveBeenCalledWith('wf-1', req.user, {});
		});
	});

	describe('executeAgentWithLlmMock', () => {
		it('should return the model usage of the run with its result', async () => {
			const runResult = { runId: 'run-1', success: true } as InstanceAiEvalAgentExecutionResult;
			evalAgentExecutionService.executeWithLlmMock.mockResolvedValue(runResult);
			vi.mocked(meterEvalUsage).mockImplementationOnce(async (fn) => ({
				result: await fn(),
				usage: [MOCK_RESPONDER_USAGE],
			}));
			const payload = { projectId: 'project-1' };

			const result = await controller.executeAgentWithLlmMock(req, res, 'agent-1', payload);

			expect(result).toEqual({ ...runResult, llmUsage: [MOCK_RESPONDER_USAGE] });
			expect(evalAgentExecutionService.executeWithLlmMock).toHaveBeenCalledWith(
				'agent-1',
				req.user,
				payload,
			);
		});
	});

	describe('setThreadCredentialAllowlist', () => {
		const payload = { threadId: THREAD_ID, credentialIds: ['cred-1', 'cred-2'] };

		it('should pin the allowlist for an owned thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');

			const result = await controller.setThreadCredentialAllowlist(
				req,
				res,
				payload as InstanceAiEvalCredentialAllowlistRequest,
			);

			expect(result).toEqual({ ok: true });
			expect(evalCredentialAllowlists.get(THREAD_ID)).toEqual(['cred-1', 'cred-2']);
		});

		it('should reject a thread that does not exist', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(
				controller.setThreadCredentialAllowlist(
					req,
					res,
					payload as InstanceAiEvalCredentialAllowlistRequest,
				),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('setThreadCredentialTestTarget', () => {
		const target = {
			credentialType: 'slackApi',
			baseUrl: 'http://stand-in.test:4100',
			urlField: 'url',
		};
		const payload = { threadId: THREAD_ID, ...target };

		it('should set the test target for an owned thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');

			const result = await controller.setThreadCredentialTestTarget(
				req,
				res,
				payload as InstanceAiEvalCredentialTestTargetRequest,
			);

			expect(result).toEqual({ ok: true });
			expect(evalCredentialAllowlists.getTestTarget(THREAD_ID, 'slackApi')).toEqual(target);
		});

		it('should reject a thread that does not exist', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(
				controller.setThreadCredentialTestTarget(
					req,
					res,
					payload as InstanceAiEvalCredentialTestTargetRequest,
				),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('getEvalThreadMemory', () => {
		const memory: InstanceAiEvalThreadMemoryResponse = {
			observations: [{ marker: 'critical', text: 'Posting via HTTP Request', tokenCount: 7 }],
			cursor: { lastObservedMessageId: 'm137', lastObservedAt: '2020-01-01T00:00:00.000Z' },
		};

		it('should return the memory of an owned thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			instanceAiService.getThreadMemory.mockResolvedValue(memory);

			const result = await controller.getEvalThreadMemory(req, res, THREAD_ID);

			expect(result).toEqual(memory);
			expect(instanceAiService.getThreadMemory).toHaveBeenCalledWith(USER_ID, THREAD_ID);
		});

		it("should reject another user's thread", async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(controller.getEvalThreadMemory(req, res, THREAD_ID)).rejects.toThrow(
				ForbiddenError,
			);
			expect(instanceAiService.getThreadMemory).not.toHaveBeenCalled();
		});

		it('should reject a thread that does not exist', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(controller.getEvalThreadMemory(req, res, THREAD_ID)).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('failed execution portability', () => {
		it('exports from the thread project', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue('project-1');

			await controller.exportExecution(req, res, { threadId: THREAD_ID, executionId: '42' });

			expect(failedExecutionPortability.exportExecution).toHaveBeenCalledWith(
				expect.objectContaining({ id: USER_ID }),
				'project-1',
				'42',
			);
		});

		it('refuses a restore into a thread with no project', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue(undefined);

			await expect(
				controller.restoreExecution(req, res, {
					threadId: THREAD_ID,
					workflowId: 'wf-1',
					envelope: mock(),
				}),
			).rejects.toThrow(BadRequestError);
			expect(failedExecutionPortability.restoreExecution).not.toHaveBeenCalled();
		});
	});

	describe('restoreEvalThread', () => {
		const seedMessages = [
			{ id: 'm1', type: 'llm', role: 'user', content: [], createdAt: '2026-01-01T00:00:00.000Z' },
		];
		const seedWorkflow = { id: 'wf-1', name: 'Seeded', nodes: [], connections: {} };
		const payload = {
			threadId: THREAD_ID,
			messages: seedMessages,
			workflows: [seedWorkflow],
		} as InstanceAiEvalRestoreThreadRequest;

		beforeEach(() => {
			evalThreadRestore.restoreAgents.mockResolvedValue([]);
			evalThreadRestore.publishSeedWorkflows.mockResolvedValue([]);
			evalThreadRestore.restoreFolders.mockResolvedValue(new Map());
			// The allowlist service is real and shared: drop what the allowlist tests pinned.
			evalCredentialAllowlists.clearThread(THREAD_ID);
		});

		it('should recreate referenced workflows in the thread project, then seed messages', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue('project-1');
			memoryService.restoreThreadMessages.mockResolvedValue({ restored: 1 });
			evalThreadRestore.restoreDataTables.mockResolvedValue(new Map());

			const result = await controller.restoreEvalThread(req, res, payload);

			expect(evalThreadRestore.restoreWorkflows).toHaveBeenCalledWith(
				[seedWorkflow],
				'project-1',
				expect.objectContaining({ id: USER_ID }),
				expect.any(Map),
				undefined,
				expect.any(Map),
			);
			expect(memoryService.restoreThreadMessages).toHaveBeenCalledWith(
				USER_ID,
				THREAD_ID,
				seedMessages,
			);
			expect(result).toEqual({
				ok: true,
				threadId: THREAD_ID,
				restored: 1,
				workflowIds: ['wf-1'],
				dataTableIds: [],
				agentIds: [],
				folderIds: [],
			});
		});

		it('should recreate data tables first and pass their id map to workflow restore', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue('project-1');
			memoryService.restoreThreadMessages.mockResolvedValue({ restored: 1 });
			const idMap = new Map([['dt-old-1234', 'dt-new']]);
			evalThreadRestore.restoreDataTables.mockResolvedValue(idMap);

			const dataTable = {
				id: 'dt-old-1234',
				name: 'FAQs',
				columns: [{ name: 'a', type: 'string' as const }],
			};
			const result = await controller.restoreEvalThread(req, res, {
				...payload,
				dataTables: [dataTable],
			} as InstanceAiEvalRestoreThreadRequest);

			expect(evalThreadRestore.restoreDataTables).toHaveBeenCalledWith([dataTable], 'project-1', {
				uniquifyNames: true,
			});
			expect(evalThreadRestore.restoreWorkflows).toHaveBeenCalledWith(
				[seedWorkflow],
				'project-1',
				expect.objectContaining({ id: USER_ID }),
				idMap,
				undefined,
				expect.any(Map),
			);
			expect(result).toMatchObject({ dataTableIds: ['dt-new'] });
		});

		it('should hand the pinned credential allowlist to the workflow restore', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue('project-1');
			memoryService.restoreThreadMessages.mockResolvedValue({ restored: 1 });
			evalThreadRestore.restoreDataTables.mockResolvedValue(new Map());
			evalCredentialAllowlists.set(THREAD_ID, ['cred-1', 'cred-2']);

			await controller.restoreEvalThread(req, res, payload);

			expect(evalThreadRestore.restoreWorkflows).toHaveBeenCalledWith(
				[seedWorkflow],
				'project-1',
				expect.objectContaining({ id: USER_ID }),
				expect.any(Map),
				new Set(['cred-1', 'cred-2']),
				expect.any(Map),
			);
		});

		it('seeds data tables only (no messages) under exact names when uniquifyNames is false (TRUST-311)', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue('project-1');
			evalThreadRestore.restoreDataTables.mockResolvedValue(new Map([['dt-old-1234', 'dt-new']]));

			const dataTable = {
				id: 'dt-old-1234',
				name: 'Job Applications',
				columns: [{ name: 'application_id', type: 'string' as const }],
				rows: [{ application_id: 'row_001' }],
			};
			const result = await controller.restoreEvalThread(req, res, {
				threadId: THREAD_ID,
				messages: [],
				dataTables: [dataTable],
				uniquifyNames: false,
			} as InstanceAiEvalRestoreThreadRequest);

			expect(evalThreadRestore.restoreDataTables).toHaveBeenCalledWith([dataTable], 'project-1', {
				uniquifyNames: false,
			});
			// No messages to restore — the message write is skipped.
			expect(memoryService.restoreThreadMessages).not.toHaveBeenCalled();
			expect(result).toMatchObject({ restored: 0, dataTableIds: ['dt-new'] });
		});

		it('publishes the flagged seeds before the messages, so a refused publish strands nothing', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue('project-1');
			evalThreadRestore.restoreDataTables.mockResolvedValue(new Map());
			evalThreadRestore.restoreWorkflows.mockResolvedValue(['wf-1']);
			evalThreadRestore.publishSeedWorkflows.mockRejectedValueOnce(
				new Error('Workflow has no trigger'),
			);

			await expect(controller.restoreEvalThread(req, res, payload)).rejects.toThrow(
				'Workflow has no trigger',
			);

			// The messages cannot be rolled back, so they are not written yet.
			expect(memoryService.restoreThreadMessages).not.toHaveBeenCalled();
			expect(evalThreadRestore.deleteWorkflows).toHaveBeenCalledWith(['wf-1']);
		});

		it('unpublishes a re-applied published seed when a later step fails', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue('project-1');
			evalThreadRestore.restoreDataTables.mockResolvedValue(new Map());
			// The seed id already existed in the project, so the restore created nothing.
			evalThreadRestore.restoreWorkflows.mockResolvedValue([]);
			evalThreadRestore.publishSeedWorkflows.mockResolvedValue(['wf-1']);
			evalThreadRestore.restoreAgents.mockRejectedValueOnce(new Error('agents down'));

			await expect(controller.restoreEvalThread(req, res, payload)).rejects.toThrow('agents down');

			// Not in the created list, so the delete never sees it: the unpublish must.
			expect(evalThreadRestore.unpublishWorkflows).toHaveBeenCalledWith(['wf-1']);
			expect(evalThreadRestore.deleteWorkflows).toHaveBeenCalledWith([]);
		});

		it('should roll back created workflows and data tables when a later step fails', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue('project-1');
			evalThreadRestore.restoreDataTables.mockResolvedValue(new Map([['dt-old-1234', 'dt-new']]));
			evalThreadRestore.restoreWorkflows.mockResolvedValue(['wf-1']);
			memoryService.restoreThreadMessages.mockRejectedValue(new Error('boom'));

			await expect(controller.restoreEvalThread(req, res, payload)).rejects.toThrow('boom');

			expect(evalThreadRestore.deleteWorkflows).toHaveBeenCalledWith(['wf-1']);
			expect(evalThreadRestore.deleteDataTables).toHaveBeenCalledWith(['dt-new'], 'project-1');
		});

		describe('with seeded folders', () => {
			const folder = { id: 'odwFolder0001', name: 'ODW' };
			const placedWorkflow = { ...seedWorkflow, parentFolderId: 'odwFolder0001' };
			const folderPayload = {
				threadId: THREAD_ID,
				messages: seedMessages,
				folders: [folder],
				workflows: [placedWorkflow],
			} as InstanceAiEvalRestoreThreadRequest;

			beforeEach(() => {
				memoryService.checkThreadOwnership.mockResolvedValue('owned');
				memoryService.getThreadProjectId.mockResolvedValue('project-1');
				memoryService.restoreThreadMessages.mockResolvedValue({ restored: 1 });
				evalThreadRestore.restoreDataTables.mockResolvedValue(new Map());
			});

			it('creates the folders first, hands their id map to the workflow restore and returns the created ids', async () => {
				const folderIdMap = new Map([['odwFolder0001', 'real-odw']]);
				evalThreadRestore.restoreFolders.mockResolvedValue(folderIdMap);

				const result = await controller.restoreEvalThread(req, res, folderPayload);

				expect(evalThreadRestore.restoreFolders).toHaveBeenCalledWith(
					[folder],
					'project-1',
					req.user,
				);
				expect(evalThreadRestore.restoreWorkflows).toHaveBeenCalledWith(
					[placedWorkflow],
					'project-1',
					expect.objectContaining({ id: USER_ID }),
					expect.any(Map),
					undefined,
					folderIdMap,
				);
				// Folders before data tables, data tables before workflows.
				const order = [
					evalThreadRestore.restoreFolders,
					evalThreadRestore.restoreDataTables,
					evalThreadRestore.restoreWorkflows,
				].map((fn) => fn.mock.invocationCallOrder[0]);
				expect(order).toEqual([...order].sort((a, b) => a - b));
				expect(result).toMatchObject({ folderIds: ['real-odw'] });
			});

			it('rolls the folders back after the workflows and data tables when a later step fails', async () => {
				evalThreadRestore.restoreFolders.mockResolvedValue(
					new Map([['odwFolder0001', 'real-odw']]),
				);
				evalThreadRestore.restoreDataTables.mockResolvedValue(new Map([['dt-old-1234', 'dt-new']]));
				evalThreadRestore.restoreWorkflows.mockResolvedValue(['wf-1']);
				memoryService.restoreThreadMessages.mockRejectedValue(new Error('boom'));

				await expect(controller.restoreEvalThread(req, res, folderPayload)).rejects.toThrow('boom');

				expect(evalThreadRestore.deleteFolders).toHaveBeenCalledWith(
					[folder],
					new Map([['odwFolder0001', 'real-odw']]),
					'project-1',
					req.user,
				);
				// A folder delete cascades to the workflows inside it, so the workflows
				// must already be gone by their own path (unpublished, then deleted).
				const order = [
					evalThreadRestore.deleteWorkflows,
					evalThreadRestore.deleteDataTables,
					evalThreadRestore.deleteFolders,
				].map((fn) => fn.mock.invocationCallOrder[0]);
				expect(order).toEqual([...order].sort((a, b) => a - b));
			});

			it('rolls the folders back when the data tables fail', async () => {
				evalThreadRestore.restoreFolders.mockResolvedValue(
					new Map([['odwFolder0001', 'real-odw']]),
				);
				evalThreadRestore.restoreDataTables.mockRejectedValueOnce(new Error('table refused'));

				await expect(controller.restoreEvalThread(req, res, folderPayload)).rejects.toThrow(
					'table refused',
				);

				expect(evalThreadRestore.deleteFolders).toHaveBeenCalledWith(
					[folder],
					new Map([['odwFolder0001', 'real-odw']]),
					'project-1',
					req.user,
				);
				expect(evalThreadRestore.restoreWorkflows).not.toHaveBeenCalled();
			});

			it('refuses a workflow placed in a folder the seed does not declare, before creating anything', async () => {
				await expect(
					controller.restoreEvalThread(req, res, {
						...folderPayload,
						folders: [],
					} as InstanceAiEvalRestoreThreadRequest),
				).rejects.toThrow(BadRequestError);

				expect(evalThreadRestore.restoreFolders).not.toHaveBeenCalled();
				expect(evalThreadRestore.restoreDataTables).not.toHaveBeenCalled();
			});

			it('creates no folders and reports none for a seed without them', async () => {
				const result = await controller.restoreEvalThread(req, res, payload);

				expect(evalThreadRestore.restoreFolders).toHaveBeenCalledWith([], 'project-1', req.user);
				expect(result).toMatchObject({ folderIds: [] });
			});
		});

		describe('with seeded agents', () => {
			const seedAgent = {
				id: 'agent-seed-1',
				config: {
					name: 'Support Triage',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Triage inbound tickets.',
				},
			};
			const agentPayload = {
				...payload,
				agents: [seedAgent],
			} as InstanceAiEvalRestoreThreadRequest;

			beforeEach(() => {
				memoryService.checkThreadOwnership.mockResolvedValue('owned');
				memoryService.getThreadProjectId.mockResolvedValue('project-1');
				memoryService.restoreThreadMessages.mockResolvedValue({ restored: 1 });
				evalThreadRestore.restoreDataTables.mockResolvedValue(new Map());
				evalThreadRestore.restoreAgents.mockResolvedValue(['agent-seed-1']);
			});

			it('should hand the pinned credential allowlist to the agent restore', async () => {
				evalCredentialAllowlists.set(THREAD_ID, ['cred-openai']);

				await controller.restoreEvalThread(req, res, agentPayload);

				expect(evalThreadRestore.restoreAgents).toHaveBeenCalledWith(
					[seedAgent],
					'project-1',
					expect.objectContaining({ id: expect.any(String) }),
					expect.any(Map),
					new Set(['cred-openai']),
				);
			});

			it('should recreate the agent and bind the thread to it', async () => {
				const result = await controller.restoreEvalThread(req, res, agentPayload);

				// The data-table id map goes through too, so an agent node tool's table
				// references land on the tables this restore just created.
				expect(evalThreadRestore.restoreAgents).toHaveBeenCalledWith(
					[seedAgent],
					'project-1',
					expect.objectContaining({ id: expect.any(String) }),
					expect.any(Map),
					undefined,
				);
				// Refs and ordering are reconstructed from the seeded history, so the
				// messages are handed in alongside the agents.
				expect(seedAgentBuilderTargetMetadata).toHaveBeenCalledWith(
					[
						{
							agentId: 'agent-seed-1',
							projectId: 'project-1',
							name: 'Support Triage',
							// Fallback ref; the helper prefers the model-authored one.
							ref: 'Support Triage',
						},
					],
					agentPayload.messages,
				);
				expect(memoryService.updateThread).toHaveBeenCalledWith(THREAD_ID, {
					metadata: { boundTargets: expect.any(Array) },
				});
				expect(result).toMatchObject({ agentIds: ['agent-seed-1'] });
			});

			it('should not touch the thread binding for a seed with no agents', async () => {
				evalThreadRestore.restoreAgents.mockResolvedValue([]);

				await controller.restoreEvalThread(req, res, payload);

				expect(memoryService.updateThread).not.toHaveBeenCalled();
			});

			it('rejects a bad binding before any message is committed', async () => {
				// The binding is built (and validated) ahead of the message write, so a
				// refused one — two seed agents whose refs collide — fails while the
				// restore is still fully rollback-able. There is no per-message delete,
				// so committing first would strand them in the thread.
				vi.mocked(seedAgentBuilderTargetMetadata).mockImplementationOnce(() => {
					throw new UserError('both address as "support-triage"');
				});

				await expect(controller.restoreEvalThread(req, res, agentPayload)).rejects.toThrow(
					/both address as/,
				);

				expect(memoryService.restoreThreadMessages).not.toHaveBeenCalled();
				expect(evalThreadRestore.deleteAgents).toHaveBeenCalledWith(
					['agent-seed-1'],
					'project-1',
					expect.objectContaining({ id: expect.any(String) }),
				);
			});

			it('should roll the binding back when the message write fails', async () => {
				// The binding is written BEFORE the messages and undone on failure, so a
				// message failure can't leave a binding pointing at agents the rollback
				// just deleted — and the thread's prior metadata is restored exactly,
				// not blanked.
				memoryService.getThreadMetadata.mockResolvedValue({ somethingElse: 'keep me' });
				memoryService.restoreThreadMessages.mockRejectedValue(new Error('boom'));

				await expect(controller.restoreEvalThread(req, res, agentPayload)).rejects.toThrow('boom');

				expect(evalThreadRestore.deleteAgents).toHaveBeenCalledWith(
					['agent-seed-1'],
					'project-1',
					expect.objectContaining({ id: expect.any(String) }),
				);
				// The prior metadata survives AND the binding key is cleared — handing
				// back only the snapshot would leave the thread bound to agents the
				// rollback just deleted, because updateThread merges.
				expect(memoryService.updateThread).toHaveBeenLastCalledWith(THREAD_ID, {
					metadata: { somethingElse: 'keep me', boundTargets: undefined },
				});
			});

			it('should not touch the thread when the binding write itself fails', async () => {
				memoryService.getThreadMetadata.mockResolvedValue({});
				memoryService.updateThread.mockRejectedValueOnce(new Error('metadata down'));

				await expect(controller.restoreEvalThread(req, res, agentPayload)).rejects.toThrow(
					'metadata down',
				);

				// No messages were written, and the artifacts are rolled back.
				expect(memoryService.restoreThreadMessages).not.toHaveBeenCalled();
				expect(evalThreadRestore.deleteAgents).toHaveBeenCalledWith(
					['agent-seed-1'],
					'project-1',
					expect.objectContaining({ id: expect.any(String) }),
				);
			});
		});

		it('should reject a thread that does not exist', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(controller.restoreEvalThread(req, res, payload)).rejects.toThrow(NotFoundError);
			expect(evalThreadRestore.restoreWorkflows).not.toHaveBeenCalled();
		});

		it("should reject another user's thread", async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(controller.restoreEvalThread(req, res, payload)).rejects.toThrow(ForbiddenError);
		});

		it('should reject a thread without a project binding', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			memoryService.getThreadProjectId.mockResolvedValue(undefined);

			await expect(controller.restoreEvalThread(req, res, payload)).rejects.toThrow(
				BadRequestError,
			);
			expect(evalThreadRestore.restoreWorkflows).not.toHaveBeenCalled();
		});
	});
});
