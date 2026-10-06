import type { Mock } from 'vitest';
import { z } from 'zod';

vi.mock('@n8n/instance-ai', () => {
	return {
		workflowLoopStateSchema: z.string(),
		attemptRecordSchema: z.object({}),
		workflowBuildOutcomeSchema: z.string(),
		// Shape is the instance-ai package's contract (covered by its own tests); the
		// controller only owns which targets it feeds in and that it persists the result.
		seedAgentBuilderTargetMetadata: vi.fn((targets: unknown) => ({ boundTargets: targets })),
		// Real behaviour matters here: `updateThread` merges, so the rollback has to
		// name the binding keys rather than hand back the prior snapshot.
		clearedAgentBuilderTargetMetadata: vi.fn((prior: Record<string, unknown> | undefined) => ({
			...(prior ?? {}),
			boundTargets: prior?.boundTargets,
		})),
	};
});

vi.mock('../eval/execution.service', () => ({
	EvalExecutionService: vi.fn(),
}));

import type {
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiEvalCredentialAllowlistRequest,
	InstanceAiEvalRestoreThreadRequest,
	InstanceAiEvalThreadMemoryResponse,
	InstanceAiEnsureThreadRequest,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiRenameThreadRequestDto,
	InstanceAiEnsureThreadResponse,
	InstanceAiThreadInfo,
	InstanceAiThreadTabsState,
} from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { seedAgentBuilderTargetMetadata } from '@n8n/instance-ai';
import {
	InstanceAiPersistPendingAgentRequest,
	InstanceAiThreadTabsRequestDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest, User, UserRepository } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import type { Request, Response } from 'express';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { UrlService } from '@n8n/backend-services';

import type { InstanceAiBrowserSessionService } from '../browser/instance-ai-browser-session.service';
import type { EvalAgentExecutionService } from '../eval/agent-execution.service';
import type { EvalExecutionService } from '../eval/execution.service';
import { EvalThreadCredentialAllowlistService } from '../eval/thread-credential-allowlist.service';
import type { EvalThreadRestoreService } from '../eval/thread-restore.service';
import type { LocalGateway } from '../filesystem/local-gateway';
import type { InstanceAiGatewayService } from '../instance-ai-gateway.service';
import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import type { InstanceAiOnboardingService } from '../onboarding';
import type { InstanceAiPendingAgentService } from '../instance-ai-pending-agent.service';
import type { InstanceAiThreadTabsService } from '../instance-ai-thread-tabs.service';
import type { InstanceAiModelCatalogService } from '../instance-ai-model-catalog.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiController } from '../instance-ai.controller';
import type { InstanceAiService } from '../instance-ai.service';
import type { InstanceAiErrorReporterService } from '../instance-ai-error-reporter.service';

const USER_ID = 'user-1';
const THREAD_ID = 'thread-1';

const routeMetadata = Container.get(ControllerRegistryMetadata);

// Scope metadata helper, reads the decorator metadata that @GlobalScope writes at class-definition time.
function scopeOf(handlerName: string): { scope: Scope; globalOnly: boolean } | undefined {
	const route = routeMetadata.getRouteMetadata(
		InstanceAiController as unknown as Parameters<typeof routeMetadata.getRouteMetadata>[0],
		handlerName,
	);
	return route.accessScope;
}

describe('InstanceAiController', () => {
	const instanceAiService = mock<InstanceAiService>();
	const gatewayService = mock<InstanceAiGatewayService>();
	const browserSessionService = mock<InstanceAiBrowserSessionService>();
	const memoryService = mock<InstanceAiMemoryService>();
	const pendingAgentService = mock<InstanceAiPendingAgentService>();
	const settingsService = mock<InstanceAiSettingsService>();
	const modelCatalogService = mock<InstanceAiModelCatalogService>();
	const moduleRegistry = mock<ModuleRegistry>();
	const push = mock<Push>();
	const publisher = mock<Publisher>();
	const urlService = mock<UrlService>();
	const globalConfig = mock<GlobalConfig>({
		instanceAi: { gatewayApiKey: 'static-key' },
		editorBaseUrl: 'http://localhost:5678',
		port: 5678,
	});

	const userRepository = mock<UserRepository>();
	const credentialsService = mock<CredentialsService>();
	const projectService = mock<ProjectService>();
	const instanceAiErrorReporter = mock<InstanceAiErrorReporterService>();

	const evalCredentialAllowlists = new EvalThreadCredentialAllowlistService();
	const evalThreadRestore = mock<EvalThreadRestoreService>();
	const onboarding = mock<InstanceAiOnboardingService>();
	const threadTabsService = mock<InstanceAiThreadTabsService>();

	const controller = new InstanceAiController(
		instanceAiService,
		gatewayService,
		browserSessionService,
		memoryService,
		onboarding,
		pendingAgentService,
		settingsService,
		modelCatalogService,
		mock<EvalExecutionService>(),
		mock<EvalAgentExecutionService>(),
		evalCredentialAllowlists,
		evalThreadRestore,
		moduleRegistry,
		push,
		urlService,
		userRepository,
		credentialsService,
		projectService,
		instanceAiErrorReporter,
		publisher,
		globalConfig,
		threadTabsService,
	);

	const req = mock<AuthenticatedRequest>({ user: { id: USER_ID } });
	const res = mock<Response>();

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.isInstanceAiEnabled.mockReturnValue(true);
		settingsService.isModelConfigured.mockResolvedValue(true);
		instanceAiService.getLiveRun.mockResolvedValue({ status: 'idle', runIds: [] });
	});

	describe('executeWithLlmMock', () => {
		it('should require instanceAi:eval scope', () => {
			expect(scopeOf('executeWithLlmMock')).toEqual({ scope: 'instanceAi:eval', globalOnly: true });
		});
	});

	describe('setThreadCredentialAllowlist', () => {
		const payload = { threadId: THREAD_ID, credentialIds: ['cred-1', 'cred-2'] };

		it('should require instanceAi:eval scope', () => {
			expect(scopeOf('setThreadCredentialAllowlist')).toEqual({
				scope: 'instanceAi:eval',
				globalOnly: true,
			});
		});

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

	describe('getEvalThreadMemory', () => {
		const memory: InstanceAiEvalThreadMemoryResponse = {
			observations: [{ marker: 'critical', text: 'Posting via HTTP Request', tokenCount: 7 }],
			cursor: { lastObservedMessageId: 'm137', lastObservedAt: '2020-01-01T00:00:00.000Z' },
		};

		it('should require instanceAi:eval scope', () => {
			expect(scopeOf('getEvalThreadMemory')).toEqual({
				scope: 'instanceAi:eval',
				globalOnly: true,
			});
		});

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

		it('should require instanceAi:eval scope', () => {
			expect(scopeOf('restoreEvalThread')).toEqual({ scope: 'instanceAi:eval', globalOnly: true });
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
				expect(evalThreadRestore.deleteAgents).toHaveBeenCalledWith(['agent-seed-1'], 'project-1');
			});

			it('should roll the binding back when the message write fails', async () => {
				// The binding is written BEFORE the messages and undone on failure, so a
				// message failure can't leave a binding pointing at agents the rollback
				// just deleted — and the thread's prior metadata is restored exactly,
				// not blanked.
				memoryService.getThreadMetadata.mockResolvedValue({ somethingElse: 'keep me' });
				memoryService.restoreThreadMessages.mockRejectedValue(new Error('boom'));

				await expect(controller.restoreEvalThread(req, res, agentPayload)).rejects.toThrow('boom');

				expect(evalThreadRestore.deleteAgents).toHaveBeenCalledWith(['agent-seed-1'], 'project-1');
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
				expect(evalThreadRestore.deleteAgents).toHaveBeenCalledWith(['agent-seed-1'], 'project-1');
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

	describe('getAdminSettings', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('getAdminSettings')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});
	});

	describe('getModelCatalog', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('getModelCatalog')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});

		it('should return the model catalog service response', async () => {
			const response = { models: { anthropic: [], openai: [], openrouter: [] } };
			modelCatalogService.getModels.mockResolvedValue(response);

			await expect(controller.getModelCatalog(req)).resolves.toEqual(response);
		});
	});

	describe('updateAdminSettings', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('updateAdminSettings')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});

		it('should disconnect all gateways when enabled is set to false', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({ enabled: false } as never);
			gatewayService.disconnectAllGateways.mockReturnValue(['user-a', 'user-b']);
			const payload = { enabled: false } as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(gatewayService.disconnectAllGateways).toHaveBeenCalled();
			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'instanceAiGatewayStateChanged',
					data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
				}),
				['user-a', 'user-b'],
			);
		});

		it('should disconnect all gateways when localGatewayDisabled is set to true', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: true,
				localGatewayDisabled: true,
			} as never);
			gatewayService.disconnectAllGateways.mockReturnValue(['user-c']);
			const payload = { localGatewayDisabled: true } as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(gatewayService.disconnectAllGateways).toHaveBeenCalled();
			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'instanceAiGatewayStateChanged',
				}),
				['user-c'],
			);
		});

		it('should not disconnect gateways when enabling features', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: true,
				localGatewayDisabled: false,
			} as never);
			const payload = {
				enabled: true,
				localGatewayDisabled: false,
			} as InstanceAiAdminSettingsUpdateRequest;

			await controller.updateAdminSettings(req, res, payload);

			expect(gatewayService.disconnectAllGateways).not.toHaveBeenCalled();
		});

		it('should publish settings reloads and refresh affected module settings', async () => {
			settingsService.updateAdminSettings.mockResolvedValue({ enabled: true } as never);

			await controller.updateAdminSettings(req, res, { enabled: true });

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-instance-ai-settings',
			});
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('agents');
		});

		it('should publish and attempt every local side effect when one fails', async () => {
			const refreshError = new Error('refresh failed');
			settingsService.updateAdminSettings.mockResolvedValue({
				enabled: false,
				browserUseEnabled: false,
				localGatewayDisabled: true,
			} as never);
			moduleRegistry.refreshModuleSettings.mockRejectedValueOnce(refreshError);
			gatewayService.disconnectAllGateways.mockReturnValue([]);

			await expect(
				controller.updateAdminSettings(req, res, { enabled: false }),
			).resolves.toBeDefined();
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-instance-ai-settings',
			});
			expect(browserSessionService.shutdown).toHaveBeenCalled();
			expect(gatewayService.disconnectAllGateways).toHaveBeenCalled();
			expect(instanceAiErrorReporter.report).toHaveBeenCalledWith(refreshError, {
				component: 'settings-side-effects',
				threadId: 'admin-settings',
			});
		});

		it('should report a publish failure after applying committed settings', async () => {
			const committedSettings = {
				enabled: false,
				browserUseEnabled: false,
				localGatewayDisabled: true,
			};
			const publishError = new Error('publish failed');
			settingsService.updateAdminSettings.mockResolvedValue(committedSettings as never);
			publisher.publishCommand.mockRejectedValue(publishError);
			gatewayService.disconnectAllGateways.mockReturnValue([]);

			await expect(controller.updateAdminSettings(req, res, { enabled: false })).resolves.toBe(
				committedSettings,
			);
			expect(instanceAiErrorReporter.report).toHaveBeenCalledWith(publishError, {
				component: 'settings-publish',
				threadId: 'admin-settings',
			});
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(browserSessionService.shutdown).toHaveBeenCalled();
			expect(gatewayService.disconnectAllGateways).toHaveBeenCalled();
		});
	});

	describe('reloadAdminSettings', () => {
		it('should apply side effects from the reloaded local flags', async () => {
			settingsService.isInstanceAiEnabled.mockReturnValue(false);
			settingsService.isBrowserUseEnabled.mockReturnValue(false);
			settingsService.isLocalGatewayDisabled.mockReturnValue(true);
			gatewayService.disconnectAllGateways.mockReturnValue([]);

			await controller.reloadAdminSettings();

			expect(settingsService.reloadFromDb).toHaveBeenCalled();
			expect(settingsService.getAdminSettings).not.toHaveBeenCalled();
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
			expect(browserSessionService.shutdown).toHaveBeenCalled();
			expect(gatewayService.disconnectAllGateways).toHaveBeenCalled();
		});
	});

	describe('getUserPreferences', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('getUserPreferences')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});
	});

	describe('updateUserPreferences', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('updateUserPreferences')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});

		it('should refresh module settings when localGatewayDisabled changes', async () => {
			const payload = mock<InstanceAiUserPreferencesUpdateRequest>({
				localGatewayDisabled: true,
			});
			settingsService.updateUserPreferences.mockResolvedValue(
				mock<InstanceAiUserPreferencesResponse>(),
			);

			await controller.updateUserPreferences(req, res, payload);

			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('instance-ai');
		});

		it('should not refresh module settings when localGatewayDisabled is not in payload', async () => {
			const payload = mock<InstanceAiUserPreferencesUpdateRequest>({
				localGatewayDisabled: undefined,
			});
			settingsService.updateUserPreferences.mockResolvedValue(
				mock<InstanceAiUserPreferencesResponse>(),
			);

			await controller.updateUserPreferences(req, res, payload);

			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
		});
	});

	describe('listServiceCredentials', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('listServiceCredentials')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});
	});

	describe('listInstanceModelCredentials', () => {
		it('should require instanceAi:manage scope', () => {
			expect(scopeOf('listInstanceModelCredentials')).toEqual({
				scope: 'instanceAi:manage',
				globalOnly: true,
			});
		});
	});

	describe('listThreads', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('listThreads')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});
	});

	describe('ensureThread', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('ensureThread')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should create thread with provided threadId', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			projectService.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			const threadResult = mock<InstanceAiEnsureThreadResponse>();
			memoryService.ensureThread.mockResolvedValue(threadResult);
			const payload = mock<InstanceAiEnsureThreadRequest>({
				threadId: 'custom-id',
				projectId: 'project-1',
				source: 'assistant_page',
				origin: undefined,
				sourceContext: undefined,
			});

			const result = await controller.ensureThread(req, res, payload);

			expect(result).toBe(threadResult);
			expect(memoryService.ensureThread).toHaveBeenCalledWith(USER_ID, 'custom-id', 'project-1', {
				source: 'assistant_page',
				origin: 'internal',
				sourceContext: undefined,
			});
		});

		it('should generate a UUID when threadId is not provided', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			projectService.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			memoryService.ensureThread.mockResolvedValue(mock<InstanceAiEnsureThreadResponse>());
			const payload = mock<InstanceAiEnsureThreadRequest>({
				threadId: undefined,
				projectId: 'project-1',
				source: 'assistant_page',
				origin: undefined,
				sourceContext: undefined,
			});

			await controller.ensureThread(req, res, payload);

			// The controller generates a UUID — just verify ensureThread was called with some string
			expect(memoryService.ensureThread).toHaveBeenCalledWith(
				USER_ID,
				expect.any(String),
				'project-1',
				{
					source: 'assistant_page',
					origin: 'internal',
					sourceContext: undefined,
				},
			);
		});

		it('forwards launch metadata with the provided source and origin', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			projectService.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			memoryService.ensureThread.mockResolvedValue(mock<InstanceAiEnsureThreadResponse>());
			const payload = {
				threadId: 'custom-id',
				projectId: 'project-1',
				source: 'website-template',
				origin: 'external',
				sourceContext: { templateId: '6270' },
			} as InstanceAiEnsureThreadRequest;

			await controller.ensureThread(req, res, payload);

			expect(memoryService.ensureThread).toHaveBeenCalledWith(USER_ID, 'custom-id', 'project-1', {
				source: 'website-template',
				origin: 'external',
				sourceContext: { templateId: '6270' },
			});
		});

		it('reports ensure-thread failures to observability before rethrowing', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');
			projectService.getProjectWithScope.mockResolvedValue({ id: 'project-1' } as never);
			const error = new Error('persist failed');
			memoryService.ensureThread.mockRejectedValue(error);
			const payload = mock<InstanceAiEnsureThreadRequest>({
				threadId: 'thread-new',
				projectId: 'project-1',
				source: 'assistant_page',
			});

			await expect(controller.ensureThread(req, res, payload)).rejects.toThrow(error);

			expect(instanceAiErrorReporter.report).toHaveBeenCalledWith(error, {
				component: 'instance-ai-ensure-thread',
				threadId: 'thread-new',
				userId: USER_ID,
				projectId: 'project-1',
			});
		});
	});

	describe('deleteThread', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('deleteThread')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should delete thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');

			const result = await controller.deleteThread(req, res, THREAD_ID);

			expect(result).toEqual({ ok: true });
			expect(instanceAiService.routeClearThreadState).toHaveBeenCalledWith(THREAD_ID, USER_ID);
			expect(memoryService.deleteThread).toHaveBeenCalledWith(THREAD_ID);
		});

		it('should throw ForbiddenError for other user thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(controller.deleteThread(req, res, THREAD_ID)).rejects.toThrow(ForbiddenError);
		});

		it('should throw NotFoundError for missing thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(controller.deleteThread(req, res, THREAD_ID)).rejects.toThrow(NotFoundError);
		});
	});

	describe('persistPendingAgent', () => {
		const payload = new InstanceAiPersistPendingAgentRequest({
			projectId: 'project-1',
			agentId: 'aBcDeFgHiJkLmNoP',
			name: 'New Agent',
		});

		it('should require instanceAi:message scope', () => {
			expect(scopeOf('persistPendingAgent')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});

		it('should persist and bind the pending agent for an owned thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const result = { agent: { id: 'aBcDeFgHiJkLmNoP' }, thread: mock<InstanceAiThreadInfo>() };
			pendingAgentService.persistAndBind.mockResolvedValue(result as never);

			await expect(controller.persistPendingAgent(req, res, THREAD_ID, payload)).resolves.toBe(
				result,
			);
			expect(pendingAgentService.persistAndBind).toHaveBeenCalledWith(req.user, THREAD_ID, payload);
		});

		it.each([
			['other_user', ForbiddenError],
			// Unlike chat, this has no allowNew: there is no pending marker to prove
			// anything with until the thread exists.
			['not_found', NotFoundError],
		] as const)('should reject a %s thread before persisting', async (ownership, expected) => {
			memoryService.checkThreadOwnership.mockResolvedValue(ownership);

			await expect(controller.persistPendingAgent(req, res, THREAD_ID, payload)).rejects.toThrow(
				expected,
			);
			expect(pendingAgentService.persistAndBind).not.toHaveBeenCalled();
		});
	});

	describe('renameThread', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('renameThread')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should rename thread', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const threadObj = mock<InstanceAiThreadInfo>();
			memoryService.updateThread.mockResolvedValue(threadObj);
			const payload = mock<InstanceAiRenameThreadRequestDto>({ title: 'New Title' });

			const result = await controller.renameThread(req, res, THREAD_ID, payload);

			expect(result).toEqual({ thread: threadObj });
			expect(memoryService.updateThread).toHaveBeenCalledWith(
				THREAD_ID,
				expect.objectContaining({ title: 'New Title' }),
			);
		});
	});

	describe('thread tabs', () => {
		const tabsState: InstanceAiThreadTabsState = {
			tabs: [{ type: 'workflow', id: 'wf-1', name: 'My Workflow', projectId: 'project-1' }],
			closedTabs: [{ type: 'data-table', id: 'dt-1' }],
			activeTab: { type: 'workflow', id: 'wf-1' },
		};

		// Later tests read the ownership mock without setting it, so leave it as found.
		afterEach(() => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
		});

		it('should require instanceAi:message scope to read and save tabs', () => {
			expect(scopeOf('getThreadTabs')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
			expect(scopeOf('saveThreadTabs')).toEqual({ scope: 'instanceAi:message', globalOnly: true });
		});

		it('should return the stored tabs of the user', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			threadTabsService.getState.mockResolvedValue(tabsState);

			const result = await controller.getThreadTabs(req, res, THREAD_ID);

			expect(result).toEqual({ state: tabsState });
			expect(threadTabsService.getState).toHaveBeenCalledWith(THREAD_ID, USER_ID);
		});

		it('should save the tabs of the user', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const payload = new InstanceAiThreadTabsRequestDto(tabsState);

			const result = await controller.saveThreadTabs(req, res, THREAD_ID, payload);

			expect(result).toEqual({ state: tabsState });
			expect(threadTabsService.saveState).toHaveBeenCalledWith(THREAD_ID, USER_ID, tabsState);
		});

		it('should save whether the preview is open', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('owned');
			const payload = new InstanceAiThreadTabsRequestDto({ ...tabsState, previewOpen: false });

			const result = await controller.saveThreadTabs(req, res, THREAD_ID, payload);

			expect(result).toEqual({ state: { ...tabsState, previewOpen: false } });
			expect(threadTabsService.saveState).toHaveBeenCalledWith(THREAD_ID, USER_ID, {
				...tabsState,
				previewOpen: false,
			});
		});

		it('should reject tabs of a thread that belongs to another user', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('other_user');

			await expect(controller.getThreadTabs(req, res, THREAD_ID)).rejects.toThrow(ForbiddenError);
			await expect(
				controller.saveThreadTabs(
					req,
					res,
					THREAD_ID,
					new InstanceAiThreadTabsRequestDto(tabsState),
				),
			).rejects.toThrow(ForbiddenError);
			expect(threadTabsService.getState).not.toHaveBeenCalled();
			expect(threadTabsService.saveState).not.toHaveBeenCalled();
		});

		it('should reject tabs of a thread that does not exist', async () => {
			memoryService.checkThreadOwnership.mockResolvedValue('not_found');

			await expect(controller.getThreadTabs(req, res, THREAD_ID)).rejects.toThrow(NotFoundError);
			expect(threadTabsService.getState).not.toHaveBeenCalled();
		});
	});

	describe('getThreadStatus', () => {
		it('should require instanceAi:message scope', () => {
			expect(scopeOf('getThreadStatus')).toEqual({
				scope: 'instanceAi:message',
				globalOnly: true,
			});
		});
	});

	describe('createGatewayLink', () => {
		it('should require instanceAi:gateway scope', () => {
			expect(scopeOf('createGatewayLink')).toEqual({
				scope: 'instanceAi:gateway',
				globalOnly: true,
			});
		});

		it('should return token, command, and token expiry', async () => {
			const nowSpy = vi
				.spyOn(Date, 'now')
				.mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime());
			gatewayService.generatePairingToken.mockReturnValue('pairing-token');
			gatewayService.getGatewayApiKeyExpiresAt.mockReturnValue(
				new Date('2026-01-01T00:05:00.000Z'),
			);
			urlService.getInstanceBaseUrl.mockReturnValue('https://myinstance.n8n.cloud');

			const result = await controller.createGatewayLink(req);

			expect(result).toEqual({
				token: 'pairing-token',
				command: 'npx @n8n/computer-use https://myinstance.n8n.cloud pairing-token',
				expiresAt: '2026-01-01T00:05:00.000Z',
				ttlSeconds: 300,
			});
			expect(gatewayService.generatePairingToken).toHaveBeenCalledWith(USER_ID);
			expect(gatewayService.getGatewayApiKeyExpiresAt).toHaveBeenCalledWith(
				USER_ID,
				'pairing-token',
			);
			nowSpy.mockRestore();
		});
	});

	describe('gatewayInit', () => {
		const makeGatewayReq = (key: string | undefined, body: unknown) =>
			({ headers: key ? { 'x-gateway-key': key } : {}, body }) as unknown as Request;

		beforeEach(() => {
			gatewayService.getGatewayStatus.mockReturnValue({
				connected: true,
				connectedAt: null,
				directory: '/home/user',
				hostIdentifier: null,
				toolCategories: [],
			});
		});

		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayInit')).toBeUndefined();
		});

		it('should initialize gateway with valid key and body', async () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			gatewayService.consumePairingToken.mockReturnValue(null);
			const gatewayReq = makeGatewayReq('session-key', { rootPath: '/home/user' });
			const payload = { rootPath: '/home/user', tools: [], toolCategories: [] };

			const result = await controller.gatewayInit(gatewayReq, res, payload);

			expect(result).toEqual({ ok: true });
			expect(gatewayService.initGateway).toHaveBeenCalledWith(
				USER_ID,
				expect.objectContaining({ rootPath: '/home/user' }),
			);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'instanceAiGatewayStateChanged',
					data: {
						connected: true,
						directory: '/home/user',
						hostIdentifier: null,
						toolCategories: [],
					},
				}),
				[USER_ID],
			);
		});

		it('should return sessionKey when pairing token is consumed', async () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			gatewayService.consumePairingToken.mockReturnValue('new-session-key');
			const gatewayReq = makeGatewayReq('pairing-token', { rootPath: '/tmp' });

			const result = await controller.gatewayInit(gatewayReq, res, {
				rootPath: '/tmp',
				tools: [],
				toolCategories: [],
			});

			expect(result).toEqual({ ok: true, sessionKey: 'new-session-key' });
		});

		it('should accept static env var key', async () => {
			gatewayService.consumePairingToken.mockReturnValue(null);
			const gatewayReq = makeGatewayReq('static-key', { rootPath: '/tmp' });

			const result = await controller.gatewayInit(gatewayReq, res, {
				rootPath: '/tmp',
				tools: [],
				toolCategories: [],
			});

			expect(result).toEqual({ ok: true });
			expect(gatewayService.initGateway).toHaveBeenCalledWith('env-gateway', expect.anything());
		});

		it('should throw ForbiddenError with missing API key', async () => {
			const gatewayReq = makeGatewayReq(undefined, { rootPath: '/tmp' });

			await expect(
				controller.gatewayInit(gatewayReq, res, {
					rootPath: '/tmp',
					tools: [],
					toolCategories: [],
				}),
			).rejects.toThrow(ForbiddenError);
		});

		it('should throw ForbiddenError with invalid API key', async () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(undefined);
			const gatewayReq = makeGatewayReq('wrong-key', { rootPath: '/tmp' });

			await expect(
				controller.gatewayInit(gatewayReq, res, {
					rootPath: '/tmp',
					tools: [],
					toolCategories: [],
				}),
			).rejects.toThrow(ForbiddenError);
		});
	});

	describe('gatewayEvents', () => {
		const makeGatewayReq = (key: string) =>
			({
				headers: { 'x-gateway-key': key },
				once: vi.fn(),
			}) as unknown as Request;

		const makeFlushableRes = () => {
			const res = {
				setHeader: vi.fn(),
				flushHeaders: vi.fn(),
				write: vi.fn(),
				flush: vi.fn(),
				once: vi.fn(),
			};
			return res as unknown as Parameters<typeof controller.gatewayEvents>[1];
		};

		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayEvents')).toBeUndefined();
		});

		it('should reject with ForbiddenError when the gateway has not been initialized', async () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			gatewayService.getLocalGateway.mockReturnValue(mock<LocalGateway>({ isConnected: false }));

			await expect(
				controller.gatewayEvents(makeGatewayReq('session-key'), makeFlushableRes()),
			).rejects.toThrow(ForbiddenError);

			expect(gatewayService.clearDisconnectTimer).not.toHaveBeenCalled();
		});

		it('should clear a pending disconnect timer when SSE reconnects while still connected', async () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			const gateway = mock<LocalGateway>({ isConnected: true });
			gateway.onRequest.mockReturnValue(() => {});
			gatewayService.getLocalGateway.mockReturnValue(gateway);

			await controller.gatewayEvents(makeGatewayReq('session-key'), makeFlushableRes());

			expect(gatewayService.clearDisconnectTimer).toHaveBeenCalledWith(USER_ID);
		});

		describe('connection cleanup', () => {
			const unsubscribeRequest = vi.fn();
			const unsubscribeDisconnect = vi.fn();

			/** Open the SSE stream and return the handlers registered on res events. */
			const openStream = async () => {
				gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
				const gateway = mock<LocalGateway>({ isConnected: true });
				gateway.onRequest.mockReturnValue(unsubscribeRequest);
				gateway.onDisconnect.mockReturnValue(unsubscribeDisconnect);
				gatewayService.getLocalGateway.mockReturnValue(gateway);

				const res = makeFlushableRes();
				await controller.gatewayEvents(makeGatewayReq('session-key'), res);

				const handlerFor = (event: string) =>
					(res.once as Mock).mock.calls.find(([name]) => name === event)?.[1] as
						| (() => void)
						| undefined;
				return { onClose: handlerFor('close'), onFinish: handlerFor('finish') };
			};

			it("should start the disconnect grace timer on res 'close'", async () => {
				// Client-drop detection must hang off res 'close' — req 'close' tracks the
				// request message (already complete for a GET) and res 'finish' only fires
				// on server-initiated end, so neither fires when the daemon dies.
				const { onClose } = await openStream();
				expect(onClose).toBeDefined();

				onClose!();

				expect(gatewayService.startDisconnectTimer).toHaveBeenCalledWith(
					USER_ID,
					expect.any(Function),
				);
				expect(unsubscribeRequest).toHaveBeenCalledTimes(1);
				expect(unsubscribeDisconnect).toHaveBeenCalledTimes(1);
			});

			it('should push disconnected state when the grace timer fires', async () => {
				const { onClose } = await openStream();

				onClose!();
				const [, onTimerFired] = gatewayService.startDisconnectTimer.mock.calls[0];
				onTimerFired();

				expect(push.sendToUsers).toHaveBeenCalledWith(
					{
						type: 'instanceAiGatewayStateChanged',
						data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
					},
					[USER_ID],
				);
			});

			it("should run cleanup only once when both 'close' and 'finish' fire", async () => {
				const { onClose, onFinish } = await openStream();

				onClose!();
				onFinish!();

				expect(gatewayService.startDisconnectTimer).toHaveBeenCalledTimes(1);
				expect(unsubscribeRequest).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('gatewayResponse', () => {
		const makeGatewayReq = (key: string, body: unknown) =>
			({ headers: { 'x-gateway-key': key }, body }) as unknown as Request;

		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayResponse')).toBeUndefined();
		});

		it('should resolve gateway request', () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			gatewayService.resolveGatewayRequest.mockReturnValue(true);
			const gatewayReq = makeGatewayReq('session-key', { result: { content: [] } });

			const result = controller.gatewayResponse(gatewayReq, res, 'req-1', {
				result: { content: [] },
			});

			expect(result).toEqual({ ok: true });
			expect(gatewayService.resolveGatewayRequest).toHaveBeenCalledWith(
				USER_ID,
				'req-1',
				{ content: [] },
				undefined,
			);
		});

		it('should throw NotFoundError when request not found', () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			gatewayService.resolveGatewayRequest.mockReturnValue(false);
			const gatewayReq = makeGatewayReq('session-key', { result: { content: [] } });

			expect(() =>
				controller.gatewayResponse(gatewayReq, res, 'req-1', { result: { content: [] } }),
			).toThrow(NotFoundError);
		});
	});

	describe('gatewayDisconnect', () => {
		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayDisconnect')).toBeUndefined();
		});

		it('should disconnect gateway and send push notification', () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			const gatewayReq = {
				headers: { 'x-gateway-key': 'session-key' },
			} as unknown as Request;

			const result = controller.gatewayDisconnect(gatewayReq);

			expect(result).toEqual({ ok: true });
			expect(gatewayService.clearDisconnectTimer).toHaveBeenCalledWith(USER_ID);
			expect(gatewayService.disconnectGateway).toHaveBeenCalledWith(USER_ID);
			expect(gatewayService.clearActiveSessionKey).toHaveBeenCalledWith(USER_ID);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiGatewayStateChanged',
					data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
				},
				[USER_ID],
			);
		});
	});

	describe('gatewayStatus', () => {
		it('should require instanceAi:gateway scope', () => {
			expect(scopeOf('gatewayStatus')).toEqual({
				scope: 'instanceAi:gateway',
				globalOnly: true,
			});
		});
	});

	describe('gatewayDisconnectSession', () => {
		it('should require instanceAi:gateway scope', () => {
			expect(scopeOf('gatewayDisconnectSession')).toEqual({
				scope: 'instanceAi:gateway',
				globalOnly: true,
			});
		});

		it('should tear down the session and push state change without flipping preferences', async () => {
			const result = await controller.gatewayDisconnectSession(req);

			expect(result).toEqual({ ok: true });
			expect(gatewayService.clearDisconnectTimer).toHaveBeenCalledWith(USER_ID);
			expect(gatewayService.disconnectGateway).toHaveBeenCalledWith(USER_ID);
			expect(gatewayService.clearActiveSessionKey).toHaveBeenCalledWith(USER_ID);
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'instanceAiGatewayStateChanged',
					data: { connected: false, directory: null, hostIdentifier: null, toolCategories: [] },
				},
				[USER_ID],
			);
			expect(settingsService.updateUserPreferences).not.toHaveBeenCalled();
		});
	});

	describe('gatewayCreateCredential', () => {
		const makeGatewayReq = (key: string) =>
			({ headers: { 'x-gateway-key': key } }) as unknown as Request;

		const payload = {
			name: 'My Slack Cred',
			type: 'slackApi',
			data: { accessToken: 'xoxb-token' },
		};

		it('should have no access scope (skipAuth)', () => {
			expect(scopeOf('gatewayCreateCredential')).toBeUndefined();
		});

		it('should create credential and return credentialId', async () => {
			const user = mock<User>({ id: USER_ID });
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			userRepository.findOne.mockResolvedValue(user);
			credentialsService.createUnmanagedCredential.mockResolvedValue(
				mock<Awaited<ReturnType<CredentialsService['createUnmanagedCredential']>>>({
					id: 'cred-1',
				}),
			);

			const result = await controller.gatewayCreateCredential(
				makeGatewayReq('session-key'),
				res,
				payload,
			);

			expect(result).toEqual({ credentialId: 'cred-1' });
			expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(payload, user);
		});

		it('should throw ForbiddenError when using the static env-var key', async () => {
			const gatewayReq = makeGatewayReq('static-key');

			await expect(controller.gatewayCreateCredential(gatewayReq, res, payload)).rejects.toThrow(
				ForbiddenError,
			);
		});

		it('should throw ForbiddenError when the user is not found', async () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			userRepository.findOne.mockResolvedValue(null);

			await expect(
				controller.gatewayCreateCredential(makeGatewayReq('session-key'), res, payload),
			).rejects.toThrow(ForbiddenError);
		});

		it('should throw ForbiddenError when the gateway is disabled', async () => {
			const user = mock<User>({ id: USER_ID });
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			userRepository.findOne.mockResolvedValue(user);
			settingsService.isLocalGatewayDisabledForUser.mockResolvedValue(true);

			await expect(
				controller.gatewayCreateCredential(makeGatewayReq('session-key'), res, payload),
			).rejects.toThrow(ForbiddenError);
		});
	});

	describe('getGatewayKeyHeader', () => {
		it('should extract first element from array header', () => {
			gatewayService.getUserIdForApiKey.mockReturnValue(USER_ID);
			gatewayService.resolveGatewayRequest.mockReturnValue(true);
			const gatewayReq = {
				headers: { 'x-gateway-key': ['key1', 'key2'] },
				body: { result: { content: [] } },
			} as unknown as Request;

			controller.gatewayResponse(gatewayReq, res, 'req-1', { result: { content: [] } });

			// validateGatewayApiKey receives 'key1' (the first element)
			expect(gatewayService.getUserIdForApiKey).toHaveBeenCalledWith('key1');
		});
	});
});
